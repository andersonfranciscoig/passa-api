import { Injectable } from "@nestjs/common";
import type { MonetizationPlan, Prisma, PromotionRequest, Subscription } from "@prisma/client";

import { Clock } from "../../../shared/domain/clock";
import { IdGenerator } from "../../../shared/domain/id-generator";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { AdminValidationError, ConflictError, ForbiddenError, InvalidStateError, NotFoundError } from "../domain/errors";
import {
  activationAllowed,
  isOpenPromotion,
  paidCheckoutEnabled,
  promotionWindows,
  refreshPromotion,
  sandboxReference,
  selectFeaturedListingIds,
} from "../domain/promotion";
import { auditView, paymentView, planView, promotionView, settingsView, subscriptionView } from "./views";

const DAY_MS = 86_400_000;
const DEFAULT_SETTINGS = {
  id: true,
  promotionsEnabled: true,
  paidPromotionsEnabled: false,
  homeSlots: 8,
  paidSubscriptionsEnabled: false,
  paymentProvider: "none",
  referenceEntity: "00930",
  referenceTtlHours: 48,
};

const DEFAULT_PLANS: Array<{
  kind: string;
  name: string;
  description: string;
  durationDays: number;
  priceAoa: number;
}> = [
  {
    kind: "subscription",
    name: "PASSA Pro",
    description: "Estatísticas avançadas (90 dias, funil, público, horas de pico), efeito dos destaques e exportação.",
    durationDays: 30,
    priceAoa: 3500,
  },
  {
    kind: "promotion",
    name: "Destaque Básico",
    description: "3 dias na secção de destaques da página inicial.",
    durationDays: 3,
    priceAoa: 500,
  },
  {
    kind: "promotion",
    name: "Destaque Plus",
    description: "7 dias em destaque na página inicial e no topo dos resultados.",
    durationDays: 7,
    priceAoa: 1000,
  },
  {
    kind: "promotion",
    name: "Destaque Pro",
    description: "14 dias em destaque — ideal para artigos de valor mais alto.",
    durationDays: 14,
    priceAoa: 2000,
  },
];

@Injectable()
export class AdminMonetizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  private async settingsRow() {
    return this.prisma.monetizationSettings.upsert({
      where: { id: true },
      create: DEFAULT_SETTINGS,
      update: {},
    });
  }

  private async log(actorId: string, action: string, targetType: string, targetId: string, details: Record<string, unknown>) {
    await this.prisma.monetizationAuditLog.create({
      data: { id: this.ids.next(), actorId, action, targetType, targetId, details: details as Prisma.InputJsonValue },
    });
  }

  private async listingTitle(id: string) {
    const row = await this.prisma.listing.findUnique({ where: { id }, select: { title: true } });
    return row?.title;
  }

  private async userInfo(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id }, select: { displayName: true, email: true } });
    return row ? { userName: row.displayName, userEmail: row.email } : {};
  }

  private refreshSubscription(s: Subscription, now: Date): Subscription {
    return s.status === "active" && s.expiresAt && s.expiresAt <= now ? { ...s, status: "expired", updatedAt: now } : s;
  }

  private async sweepPromotions() {
    const now = this.clock.now();
    const all = await this.prisma.promotionRequest.findMany();
    const listingIds = [...new Set(all.map((r) => r.listingId))];
    const listings = listingIds.length
      ? await this.prisma.listing.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, status: true, seller: { select: { status: true } } },
        })
      : [];
    const listingById = new Map(listings.map((l) => [l.id, l]));
    const next: PromotionRequest[] = [];
    for (const r of all) {
      let refreshed = refreshPromotion(r, now);
      if (isOpenPromotion(refreshed.status)) {
        const listing = listingById.get(r.listingId);
        const eligible = listing?.status === "published" && listing.seller.status === "ACTIVE";
        if (!eligible) {
          refreshed = {
            ...refreshed,
            status: "cancelled",
            endedReason: "O anúncio deixou de estar publicado.",
            expiresAt: refreshed.status === "active" ? now : refreshed.expiresAt,
            updatedAt: now,
          };
          await this.log("system", "promotion.auto_ended", "promotion_request", r.id, { listingId: r.listingId });
        }
      }
      if (
        refreshed.status !== r.status ||
        refreshed.endedReason !== r.endedReason ||
        refreshed.expiresAt?.getTime() !== r.expiresAt?.getTime()
      ) {
        await this.prisma.promotionRequest.update({
          where: { id: r.id },
          data: {
            status: refreshed.status,
            endedReason: refreshed.endedReason,
            expiresAt: refreshed.expiresAt,
            updatedAt: now,
          },
        });
      }
      next.push(refreshed);
    }
    return next;
  }

  private parseDays(raw: number | string | undefined, max: number, field = "durationDays") {
    if (raw == null || raw === "") return undefined;
    const days = Number(raw);
    if (!Number.isInteger(days) || days < 1 || days > max) {
      throw new AdminValidationError(`A duração deve ser entre 1 e ${max} dias.`, field);
    }
    return days;
  }

  /** Cria os planos do piloto se ainda não existirem (não reativa planos desligados à mão). */
  private async ensureDefaultPlans() {
    const existing = await this.prisma.monetizationPlan.findMany({ select: { kind: true, name: true } });
    const names = new Set(existing.map((p) => `${p.kind}:${p.name}`));
    const now = this.clock.now();
    for (const plan of DEFAULT_PLANS) {
      if (names.has(`${plan.kind}:${plan.name}`)) continue;
      await this.prisma.monetizationPlan.create({
        data: {
          id: this.ids.next(),
          kind: plan.kind,
          name: plan.name,
          description: plan.description,
          durationDays: plan.durationDays,
          priceAoa: plan.priceAoa,
          isActive: true,
          createdAt: now,
        },
      });
    }
  }

  async listPlansPublic() {
    await this.ensureDefaultPlans();
    const plans = await this.prisma.monetizationPlan.findMany({
      where: { isActive: true },
      orderBy: { durationDays: "asc" },
    });
    return plans.map(planView);
  }

  async listMinePromotions(userId: string) {
    const all = await this.sweepPromotions();
    return all
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .map(promotionView);
  }

  async listMineSubscriptions(userId: string) {
    const now = this.clock.now();
    const rows = await this.prisma.subscription.findMany({ where: { userId } });
    const refreshed: Subscription[] = [];
    for (const s of rows) {
      const next = this.refreshSubscription(s, now);
      if (next !== s) await this.prisma.subscription.update({ where: { id: s.id }, data: { status: "expired" } });
      refreshed.push(next);
    }
    return refreshed.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()).map(subscriptionView);
  }

  async adminListPlans() {
    await this.ensureDefaultPlans();
    const plans = await this.prisma.monetizationPlan.findMany({ orderBy: { durationDays: "asc" } });
    return plans.map(planView);
  }

  async getSettings() {
    return settingsView(await this.settingsRow());
  }

  async adminListRequests() {
    const all = await this.sweepPromotions();
    return all.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()).map(promotionView);
  }

  async approveRequest(id: string, adminId: string, opts: { durationDays?: number | string; note?: string }) {
    const r = await this.prisma.promotionRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundError("Pedido não encontrado.");
    if (r.status !== "pending") throw new InvalidStateError("Só pedidos pendentes podem ser aprovados.");
    if (r.userId === adminId) throw new ForbiddenError("Não pode aprovar os seus próprios pedidos.");
    const listing = await this.prisma.listing.findUnique({ where: { id: r.listingId } });
    if (!listing || listing.status !== "published") {
      throw new InvalidStateError("O anúncio já não está publicado e não pode ser destacado.");
    }
    if (!activationAllowed(r)) {
      throw new InvalidStateError("O pagamento deste pedido ainda não foi verificado pelo fornecedor de pagamentos.");
    }
    const now = this.clock.now();
    const days = this.parseDays(opts.durationDays, 60) ?? r.durationDays;
    const updated = await this.prisma.promotionRequest.update({
      where: { id },
      data: {
        status: "active",
        durationDays: days,
        startsAt: now,
        expiresAt: new Date(now.getTime() + days * DAY_MS),
        reviewedAt: now,
        approvedBy: adminId,
        reviewNote: opts.note?.trim() || undefined,
      },
    });
    await this.log(adminId, "promotion.approved", "promotion_request", id, {
      listingId: r.listingId,
      listingTitle: listing.title,
      durationDays: days,
      note: opts.note?.trim() || undefined,
    });
    return promotionView(updated);
  }

  async rejectRequest(id: string, adminId: string, reason: string) {
    const r = await this.prisma.promotionRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundError("Pedido não encontrado.");
    if (r.status !== "pending") throw new InvalidStateError("Só pedidos pendentes podem ser recusados.");
    const note = reason.trim();
    if (note.length < 5) throw new AdminValidationError("Explique o motivo da recusa ao anunciante.", "reason");
    const updated = await this.prisma.promotionRequest.update({
      where: { id },
      data: { status: "rejected", reviewedAt: this.clock.now(), approvedBy: adminId, reviewNote: note },
    });
    await this.log(adminId, "promotion.rejected", "promotion_request", id, {
      listingId: r.listingId,
      listingTitle: await this.listingTitle(r.listingId),
      reason: note,
    });
    return promotionView(updated);
  }

  async endPromotion(id: string, adminId: string, reason: string) {
    const r = await this.prisma.promotionRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundError("Pedido não encontrado.");
    if (!["approved", "active", "pending"].includes(r.status)) {
      throw new InvalidStateError("Este destaque já não está em curso.");
    }
    const now = this.clock.now();
    const updated = await this.prisma.promotionRequest.update({
      where: { id },
      data: {
        status: "cancelled",
        endedReason: reason.trim() || "Terminado pela administração.",
        expiresAt: r.status === "active" ? now : r.expiresAt,
      },
    });
    await this.log(adminId, "promotion.ended", "promotion_request", id, {
      listingId: r.listingId,
      listingTitle: await this.listingTitle(r.listingId),
      reason: reason.trim() || "Terminado pela administração.",
    });
    return promotionView(updated);
  }

  async grantPromotion(adminId: string, listingId: string, planId: string, opts: { durationDays?: number | string; note?: string }) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "published") throw new InvalidStateError("Só anúncios publicados podem ser destacados.");
    if (listing.sellerId === adminId) throw new ForbiddenError("Não pode atribuir destaques aos seus próprios anúncios.");
    const open = await this.prisma.promotionRequest.findFirst({
      where: { listingId, status: { in: ["pending", "approved", "active"] } },
    });
    if (open) throw new ConflictError("Este anúncio já tem um destaque em curso.");
    const plan = await this.prisma.monetizationPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError("Plano não encontrado.");
    const now = this.clock.now();
    const days = this.parseDays(opts.durationDays, 60) ?? plan.durationDays;
    const created = await this.prisma.promotionRequest.create({
      data: {
        id: this.ids.next(),
        listingId,
        userId: listing.sellerId,
        planId: plan.id,
        planName: plan.name,
        planPriceAoa: plan.priceAoa,
        durationDays: days,
        status: "active",
        paymentMethod: "none",
        paymentStatus: "not_required",
        promotionSource: "free_pilot",
        requestedAt: now,
        reviewedAt: now,
        approvedBy: adminId,
        startsAt: now,
        expiresAt: new Date(now.getTime() + days * DAY_MS),
        reviewNote: opts.note?.trim() || "Destaque promocional atribuído pela equipa PASSA.",
      },
    });
    await this.log(adminId, "promotion.granted", "promotion_request", created.id, {
      listingId,
      listingTitle: listing.title,
      plan: plan.name,
      durationDays: days,
      source: "free_pilot",
      note: opts.note?.trim() || undefined,
    });
    return promotionView(created);
  }

  async savePlan(adminId: string, id: string | null, input: {
    kind?: string;
    name: string;
    description: string;
    durationDays: number | string;
    priceAoa: number | string;
    isActive: boolean;
  }) {
    const existing = id ? await this.prisma.monetizationPlan.findUnique({ where: { id } }) : null;
    if (id && !existing) throw new NotFoundError("Plano não encontrado.");
    const name = input.name.trim();
    if (name.length < 3 || name.length > 40) throw new AdminValidationError("O nome deve ter entre 3 e 40 caracteres.", "name");
    const description = input.description.trim();
    if (description.length > 200) throw new AdminValidationError("Máximo de 200 caracteres.", "description");
    const kind = existing?.kind ?? input.kind ?? "promotion";
    const days = this.parseDays(input.durationDays, kind === "subscription" ? 365 : 60);
    if (days == null) throw new AdminValidationError("Indique a duração.", "durationDays");
    const price = Number(input.priceAoa);
    if (!Number.isInteger(price) || price < 0 || price > 100_000_000) {
      throw new AdminValidationError("Indique um preço inteiro em kwanzas, igual ou superior a 0.", "priceAoa");
    }
    const now = this.clock.now();
    const row = existing
      ? await this.prisma.monetizationPlan.update({
          where: { id: existing.id },
          data: { name, description, durationDays: days, priceAoa: price, isActive: input.isActive },
        })
      : await this.prisma.monetizationPlan.create({
          data: {
            id: this.ids.next(),
            kind,
            name,
            description,
            durationDays: days,
            priceAoa: price,
            isActive: input.isActive,
            createdAt: now,
          },
        });
    await this.log(adminId, existing ? "plan.updated" : "plan.created", "monetization_plan", row.id, {
      before: existing
        ? { name: existing.name, priceAoa: existing.priceAoa, durationDays: existing.durationDays, isActive: existing.isActive }
        : null,
      after: { name: row.name, priceAoa: row.priceAoa, durationDays: row.durationDays, isActive: row.isActive },
    });
    return planView(row);
  }

  async updateSettings(adminId: string, patch: Partial<ReturnType<typeof settingsView>>) {
    const current = await this.settingsRow();
    if (patch.referenceEntity != null && !/^\d{5}$/.test(patch.referenceEntity)) {
      throw new AdminValidationError("A entidade deve ter 5 dígitos.", "referenceEntity");
    }
    if (patch.referenceTtlHours != null && (!Number.isInteger(patch.referenceTtlHours) || patch.referenceTtlHours < 1 || patch.referenceTtlHours > 168)) {
      throw new AdminValidationError("A validade deve ser entre 1 e 168 horas.", "referenceTtlHours");
    }
    if (patch.homeSlots != null && (!Number.isInteger(patch.homeSlots) || patch.homeSlots < 1 || patch.homeSlots > 24)) {
      throw new AdminValidationError("Indique entre 1 e 24 destaques.", "homeSlots");
    }
    const wantsPaid = (patch.paidPromotionsEnabled ?? current.paidPromotionsEnabled) || (patch.paidSubscriptionsEnabled ?? current.paidSubscriptionsEnabled);
    const provider = patch.paymentProvider ?? current.paymentProvider;
    if (wantsPaid && provider === "none") {
      throw new InvalidStateError("Não é possível ativar cobranças: não existe um fornecedor de pagamentos verificável configurado.");
    }
    const next = await this.prisma.monetizationSettings.update({
      where: { id: true },
      data: {
        promotionsEnabled: patch.promotionsEnabled ?? current.promotionsEnabled,
        paidPromotionsEnabled: patch.paidPromotionsEnabled ?? current.paidPromotionsEnabled,
        homeSlots: patch.homeSlots ?? current.homeSlots,
        paidSubscriptionsEnabled: patch.paidSubscriptionsEnabled ?? current.paidSubscriptionsEnabled,
        paymentProvider: provider,
        referenceEntity: patch.referenceEntity ?? current.referenceEntity,
        referenceTtlHours: patch.referenceTtlHours ?? current.referenceTtlHours,
      },
    });
    const before = settingsView(current);
    const after = settingsView(next);
    const changed: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(after) as (keyof typeof after)[]) {
      if (before[key] !== after[key]) changed[key] = { from: before[key], to: after[key] };
    }
    await this.log(adminId, "settings.updated", "settings", "monetization", { changed });
    return settingsView(next);
  }

  async auditLog() {
    const rows = await this.prisma.monetizationAuditLog.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(auditView);
  }

  async metrics() {
    const all = await this.sweepPromotions();
    const payments = await this.prisma.paymentRecord.findMany();
    const verified = payments.filter((p) => p.status === "verified");
    const reviewed = all.filter((r) => r.reviewedAt);
    const approvedCount = reviewed.filter((r) => r.approvedBy && r.status !== "rejected").length;
    const started = all.filter((r) => r.startsAt);
    const byListing = new Map<string, number>();
    const byUser = new Map<string, number>();
    for (const r of started) {
      byListing.set(r.listingId, (byListing.get(r.listingId) ?? 0) + 1);
      byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + 1);
    }
    const plans = new Map<string, { planName: string; revenueAoa: number; promotions: number }>();
    for (const r of started) {
      const entry = plans.get(r.planName) ?? { planName: r.planName, revenueAoa: 0, promotions: 0 };
      entry.promotions++;
      entry.revenueAoa += verified.filter((p) => p.targetType === "promotion" && p.targetId === r.id).reduce((a, p) => a + p.amountAoa, 0);
      plans.set(r.planName, entry);
    }
    return {
      requests: all.length,
      pending: all.filter((r) => r.status === "pending").length,
      freePromotions: started.filter((r) => r.promotionSource === "free_pilot").length,
      paidRequests: all.filter((r) => r.promotionSource === "paid").length,
      approvalRate: reviewed.length ? approvedCount / reviewed.length : null,
      revenueAoa: 0,
      sandboxRevenueAoa: verified.reduce((a, p) => a + p.amountAoa, 0),
      paidActivations: verified.length,
      pendingPayments: payments.filter((p) => p.status === "pending").length,
      revenueByPlan: [...plans.values()].sort((a, b) => b.promotions - a.promotions),
      renewalRate: byListing.size ? [...byListing.values()].filter((n) => n > 1).length / byListing.size : null,
      returningUsers: [...byUser.values()].filter((n) => n > 1).length,
      activeNow: all.filter((r) => r.status === "active").length,
    };
  }

  async adminListPayments() {
    const rows = await this.prisma.paymentRecord.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(paymentView);
  }

  async refund(id: string, adminId: string, reason: string) {
    const p = await this.prisma.paymentRecord.findUnique({ where: { id } });
    if (!p) throw new NotFoundError("Pagamento não encontrado.");
    if (p.status !== "verified") throw new InvalidStateError("Só pagamentos confirmados podem ser reembolsados.");
    const updated = await this.prisma.paymentRecord.update({
      where: { id },
      data: { status: "refunded" },
    });
    await this.log(adminId, "payment.refunded", "payment", id, {
      reference: p.reference,
      amountAoa: p.amountAoa,
      ...(await this.userInfo(p.userId)),
      reason: reason.trim() || "Reembolso pela administração.",
    });
    return paymentView(updated);
  }

  async adminListSubscriptions() {
    const now = this.clock.now();
    const rows = await this.prisma.subscription.findMany();
    const refreshed: Subscription[] = [];
    for (const s of rows) {
      const next = this.refreshSubscription(s, now);
      if (next !== s) await this.prisma.subscription.update({ where: { id: s.id }, data: { status: "expired" } });
      refreshed.push(next);
    }
    return refreshed.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()).map(subscriptionView);
  }

  private async proPlan(): Promise<MonetizationPlan | null> {
    await this.ensureDefaultPlans();
    return this.prisma.monetizationPlan.findFirst({ where: { kind: "subscription", isActive: true } });
  }

  async approveSubscription(id: string, adminId: string, opts: { durationDays?: number | string; note?: string }) {
    const s = await this.prisma.subscription.findUnique({ where: { id } });
    if (!s) throw new NotFoundError("Pedido não encontrado.");
    if (s.status !== "pending") throw new InvalidStateError("Só pedidos pendentes podem ser aprovados.");
    if (s.userId === adminId) throw new ForbiddenError("Não pode aprovar o seu próprio acesso.");
    const now = this.clock.now();
    const days = this.parseDays(opts.durationDays, 365) ?? s.durationDays;
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: "active",
        durationDays: days,
        startsAt: now,
        expiresAt: new Date(now.getTime() + days * DAY_MS),
        reviewedAt: now,
        reviewedBy: adminId,
        note: opts.note?.trim() || s.note,
      },
    });
    await this.log(adminId, "subscription.approved", "subscription", id, {
      userId: s.userId,
      ...(await this.userInfo(s.userId)),
      durationDays: days,
      note: opts.note?.trim() || undefined,
    });
    return subscriptionView(updated);
  }

  async rejectSubscription(id: string, adminId: string, reason: string) {
    const s = await this.prisma.subscription.findUnique({ where: { id } });
    if (!s) throw new NotFoundError("Pedido não encontrado.");
    if (s.status !== "pending") throw new InvalidStateError("Só pedidos pendentes podem ser recusados.");
    if (reason.trim().length < 5) throw new AdminValidationError("Indique o motivo da recusa.", "reason");
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: { status: "rejected", reviewedAt: this.clock.now(), reviewedBy: adminId, note: reason.trim() },
    });
    await this.log(adminId, "subscription.rejected", "subscription", id, {
      userId: s.userId,
      ...(await this.userInfo(s.userId)),
      reason: reason.trim(),
    });
    return subscriptionView(updated);
  }

  async grantSubscription(adminId: string, userId: string, opts: { durationDays?: number | string; note?: string }) {
    if (userId === adminId) throw new ForbiddenError("Não pode atribuir acesso Pro a si próprio.");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("Utilizador não encontrado.");
    const current = await this.prisma.subscription.findMany({ where: { userId } });
    if (current.some((s) => s.status === "active")) throw new ConflictError("Esta conta já tem acesso Pro.");
    const plan = await this.proPlan();
    if (!plan) {
      throw new InvalidStateError("O plano PASSA Pro está desativado. Ative-o em Monetização → Planos e preços.");
    }
    const now = this.clock.now();
    const days = this.parseDays(opts.durationDays, 365) ?? plan.durationDays;
    const pending = current.find((s) => s.status === "pending");
    const updated = pending
      ? await this.prisma.subscription.update({
          where: { id: pending.id },
          data: {
            status: "active",
            durationDays: days,
            startsAt: now,
            expiresAt: new Date(now.getTime() + days * DAY_MS),
            reviewedAt: now,
            reviewedBy: adminId,
            note: opts.note?.trim() || "Acesso Pro do piloto atribuído pela equipa PASSA.",
          },
        })
      : await this.prisma.subscription.create({
          data: {
            id: this.ids.next(),
            userId,
            planId: plan.id,
            planName: plan.name,
            priceAoa: plan.priceAoa,
            durationDays: days,
            status: "active",
            source: "free_pilot",
            paymentStatus: "not_required",
            requestedAt: now,
            reviewedAt: now,
            reviewedBy: adminId,
            startsAt: now,
            expiresAt: new Date(now.getTime() + days * DAY_MS),
            note: opts.note?.trim() || "Acesso Pro do piloto atribuído pela equipa PASSA.",
          },
        });
    await this.log(adminId, "subscription.granted", "subscription", updated.id, {
      userId,
      ...(await this.userInfo(userId)),
      durationDays: days,
      source: "free_pilot",
      note: opts.note?.trim() || undefined,
    });
    return subscriptionView(updated);
  }

  async revokeSubscription(id: string, adminId: string, reason: string) {
    const s = await this.prisma.subscription.findUnique({ where: { id } });
    if (!s) throw new NotFoundError("Acesso não encontrado.");
    if (s.status !== "pending" && s.status !== "active") throw new InvalidStateError("Este acesso já terminou.");
    const now = this.clock.now();
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: "cancelled",
        note: reason.trim() || "Terminado pela administração.",
        expiresAt: s.status === "active" ? now : s.expiresAt,
      },
    });
    await this.log(adminId, "subscription.revoked", "subscription", id, {
      userId: s.userId,
      ...(await this.userInfo(s.userId)),
      reason: reason.trim() || "Terminado pela administração.",
    });
    return subscriptionView(updated);
  }

  async featuredListingIds(query: {
    mode?: string;
    category?: string;
    q?: string;
    limit?: number;
  }) {
    const settings = await this.settingsRow();
    if (!settings.promotionsEnabled) return [];
    const all = await this.sweepPromotions();
    const active = all.filter((r) => r.status === "active" && r.startsAt);
    const listingIds = [...new Set(active.map((r) => r.listingId))];
    const listings = listingIds.length
      ? await this.prisma.listing.findMany({
          where: { id: { in: listingIds } },
          select: { id: true, title: true, category: true, status: true },
        })
      : [];
    const listingById = new Map(listings.map((l) => [l.id, l]));
    const candidates = active.flatMap((r) => {
      const listing = listingById.get(r.listingId);
      if (!listing || !r.startsAt) return [];
      return [
        {
          listingId: r.listingId,
          startsAt: r.startsAt,
          category: listing.category,
          title: listing.title,
          listingStatus: listing.status,
        },
      ];
    });
    return selectFeaturedListingIds(candidates, { ...query, homeSlots: settings.homeSlots });
  }

  async windowsFor(listingId: string, actorId: string, isAdmin: boolean) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
    if (!listing) throw new NotFoundError("Anúncio não encontrado.");
    if (!isAdmin && listing.sellerId !== actorId) throw new ForbiddenError("Só o anunciante vê as janelas de destaque.");
    const rows = await this.prisma.promotionRequest.findMany({ where: { listingId } });
    return promotionWindows(rows).map((w) => ({
      startsAt: w.startsAt.toISOString(),
      expiresAt: w.expiresAt.toISOString(),
      status: w.status,
    }));
  }

  async requestPromotion(userId: string, listingId: string, planId: string) {
    const settings = await this.settingsRow();
    if (!settings.promotionsEnabled) {
      throw new InvalidStateError("Os destaques estão temporariamente indisponíveis.");
    }
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { seller: { select: { status: true } } },
    });
    if (!listing) throw new NotFoundError("Anúncio não encontrado.");
    if (listing.sellerId !== userId) throw new ForbiddenError("Só pode destacar os seus próprios anúncios.");
    if (listing.status !== "published") throw new InvalidStateError("Só anúncios publicados podem ser destacados.");
    if (listing.seller.status !== "ACTIVE") throw new InvalidStateError("A conta do anunciante não está activa.");

    await this.sweepPromotions();
    const open = await this.prisma.promotionRequest.findFirst({
      where: { listingId, status: { in: ["pending", "approved", "active"] } },
    });
    if (open) throw new ConflictError("Este anúncio já tem um pedido de destaque em curso.");

    const plan = await this.prisma.monetizationPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.kind !== "promotion" || !plan.isActive) throw new NotFoundError("Plano não encontrado.");

    const now = this.clock.now();
    const paid = paidCheckoutEnabled(settings) && plan.priceAoa > 0;
    const created = await this.prisma.promotionRequest.create({
      data: {
        id: this.ids.next(),
        listingId,
        userId,
        planId: plan.id,
        planName: plan.name,
        planPriceAoa: plan.priceAoa,
        durationDays: plan.durationDays,
        status: "pending",
        paymentMethod: paid ? "provider" : "none",
        paymentStatus: paid ? "pending" : "not_required",
        promotionSource: paid ? "paid" : "free_pilot",
        requestedAt: now,
      },
    });

    if (!paid) return { kind: "free" as const, target: promotionView(created) };

    const existing = await this.prisma.paymentRecord.findFirst({
      where: { targetType: "promotion", targetId: created.id },
    });
    if (existing) return { kind: "payment" as const, target: promotionView(created), payment: paymentView(existing) };

    const reference = sandboxReference(created.id);
    const payment = await this.prisma.paymentRecord.create({
      data: {
        id: this.ids.next(),
        userId,
        targetType: "promotion",
        targetId: created.id,
        description: `${plan.name} — destaque de anúncio`,
        amountAoa: plan.priceAoa,
        currency: "AOA",
        provider: settings.paymentProvider,
        method: "reference",
        entity: settings.referenceEntity,
        reference,
        providerReference: `sbx_${reference}`,
        status: "pending",
        expiresAt: new Date(now.getTime() + settings.referenceTtlHours * 3_600_000),
      },
    });
    await this.log(userId, "payment.created", "payment", payment.id, {
      reference: payment.reference,
      amountAoa: payment.amountAoa,
      provider: payment.provider,
    });
    return { kind: "payment" as const, target: promotionView(created), payment: paymentView(payment) };
  }

  async cancelRequest(userId: string, id: string) {
    const r = await this.prisma.promotionRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundError("Pedido não encontrado.");
    if (r.userId !== userId) throw new ForbiddenError("Este pedido não lhe pertence.");
    if (r.status !== "pending") throw new InvalidStateError("Só pode cancelar pedidos pendentes.");
    const updated = await this.prisma.promotionRequest.update({
      where: { id },
      data: { status: "cancelled", endedReason: "Cancelado pelo anunciante." },
    });
    return promotionView(updated);
  }

  async getPayment(userId: string, id: string, isAdmin: boolean) {
    await this.sweepPayments();
    const p = await this.prisma.paymentRecord.findUnique({ where: { id } });
    if (!p) throw new NotFoundError("Pagamento não encontrado.");
    if (p.userId !== userId && !isAdmin) throw new ForbiddenError("Este pagamento não lhe pertence.");
    return paymentView(p);
  }

  async listMinePayments(userId: string) {
    await this.sweepPayments();
    const rows = await this.prisma.paymentRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows.map(paymentView);
  }

  async cancelPayment(userId: string, id: string) {
    const p = await this.prisma.paymentRecord.findUnique({ where: { id } });
    if (!p) throw new NotFoundError("Pagamento não encontrado.");
    if (p.userId !== userId) throw new ForbiddenError("Este pagamento não lhe pertence.");
    if (p.status !== "pending") throw new InvalidStateError("Só pode cancelar pagamentos pendentes.");
    const updated = await this.prisma.paymentRecord.update({ where: { id }, data: { status: "rejected" } });
    await this.closeAfterPayment(p.targetType, p.targetId, "rejected", "Pagamento cancelado pelo utilizador.");
    await this.log(userId, "payment.rejected", "payment", id, { reference: p.reference });
    return paymentView(updated);
  }

  async simulateSandboxPayment(input: { entity: string; reference: string; amountAoa: number; pin: string }) {
    if (!/^\d{4}$/.test(input.pin)) throw new AdminValidationError("O PIN tem 4 dígitos.", "pin");
    const settings = await this.settingsRow();
    if (settings.paymentProvider !== "sandbox") {
      throw new InvalidStateError("O simulador só funciona no ambiente de testes.");
    }
    await this.sweepPayments();
    const reference = input.reference.replace(/\s/g, "");
    const p = await this.prisma.paymentRecord.findFirst({
      where: { entity: input.entity, reference, provider: "sandbox" },
    });
    if (!p) throw new NotFoundError("Entidade ou referência inválida.");
    if (p.status === "expired" || (p.status === "pending" && p.expiresAt <= this.clock.now())) {
      throw new InvalidStateError("Esta referência expirou.");
    }
    if (p.status !== "pending") throw new InvalidStateError("Esta referência já foi paga.");
    if (p.amountAoa !== input.amountAoa) throw new AdminValidationError("O montante não corresponde à referência.", "amount");

    const now = this.clock.now();
    const updated = await this.prisma.paymentRecord.update({
      where: { id: p.id },
      data: { status: "verified", paidAt: now },
    });
    await this.log("system", "payment.verified", "payment", p.id, {
      reference: p.reference,
      amountAoa: p.amountAoa,
      provider: "sandbox",
    });
    try {
      await this.activateAfterPayment(p.targetType, p.targetId);
    } catch (error) {
      await this.prisma.paymentRecord.update({ where: { id: p.id }, data: { status: "refunded" } });
      await this.closeAfterPayment(p.targetType, p.targetId, "refunded", error instanceof Error ? error.message : "Reembolsado.");
      throw error;
    }
    return paymentView(updated);
  }

  private async sweepPayments() {
    const now = this.clock.now();
    const pending = await this.prisma.paymentRecord.findMany({ where: { status: "pending" } });
    for (const p of pending) {
      if (p.expiresAt > now) continue;
      await this.prisma.paymentRecord.update({ where: { id: p.id }, data: { status: "expired" } });
      await this.closeAfterPayment(p.targetType, p.targetId, "rejected", "A referência de pagamento expirou.");
      await this.log("system", "payment.expired", "payment", p.id, { reference: p.reference });
    }
  }

  private async closeAfterPayment(targetType: string, targetId: string, paymentStatus: "rejected" | "refunded", reason: string) {
    const now = this.clock.now();
    if (targetType === "promotion") {
      const r = await this.prisma.promotionRequest.findUnique({ where: { id: targetId } });
      if (!r || !isOpenPromotion(r.status)) return;
      await this.prisma.promotionRequest.update({
        where: { id: r.id },
        data: {
          paymentStatus,
          status: "cancelled",
          endedReason: reason,
          expiresAt: r.status === "active" ? now : r.expiresAt,
        },
      });
      return;
    }
    const s = await this.prisma.subscription.findUnique({ where: { id: targetId } });
    if (!s || (s.status !== "pending" && s.status !== "active")) return;
    await this.prisma.subscription.update({
      where: { id: s.id },
      data: {
        paymentStatus,
        status: "cancelled",
        note: reason,
        expiresAt: s.status === "active" ? now : s.expiresAt,
      },
    });
  }

  private async activateAfterPayment(targetType: string, targetId: string) {
    const now = this.clock.now();
    if (targetType === "promotion") {
      const r = await this.prisma.promotionRequest.findUnique({ where: { id: targetId } });
      if (!r) throw new NotFoundError("Pedido não encontrado.");
      const listing = await this.prisma.listing.findUnique({
        where: { id: r.listingId },
        include: { seller: { select: { status: true } } },
      });
      if (!listing || listing.status !== "published" || listing.seller.status !== "ACTIVE") {
        throw new InvalidStateError("O anúncio deixou de estar publicado; o pagamento deve ser reembolsado.");
      }
      const verified = await this.prisma.paymentRecord.findFirst({
        where: { targetType: "promotion", targetId, status: "verified", amountAoa: r.planPriceAoa },
      });
      if (!verified) throw new ForbiddenError("Não existe um pagamento verificado para este pedido.");
      await this.prisma.promotionRequest.update({
        where: { id: r.id },
        data: {
          paymentStatus: "verified",
          status: "active",
          startsAt: now,
          expiresAt: new Date(now.getTime() + r.durationDays * DAY_MS),
          reviewedAt: now,
          reviewNote: "Ativado automaticamente após pagamento confirmado.",
        },
      });
      await this.log("system", "promotion.activated", "promotion_request", r.id, {
        listingId: r.listingId,
        amountAoa: r.planPriceAoa,
      });
      return;
    }
    const s = await this.prisma.subscription.findUnique({ where: { id: targetId } });
    if (!s) throw new NotFoundError("Pedido não encontrado.");
    await this.prisma.subscription.update({
      where: { id: s.id },
      data: {
        paymentStatus: "verified",
        status: "active",
        startsAt: now,
        expiresAt: new Date(now.getTime() + s.durationDays * DAY_MS),
        reviewedAt: now,
        note: "Ativado automaticamente após pagamento confirmado.",
      },
    });
    await this.log("system", "subscription.activated", "subscription", s.id, { userId: s.userId });
  }
}
