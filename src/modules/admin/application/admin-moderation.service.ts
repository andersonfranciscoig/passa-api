import { Injectable } from "@nestjs/common";

import { Clock } from "../../../shared/domain/clock";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { AdminValidationError, ConflictError, InvalidStateError, NotFoundError } from "../domain/errors";
import { reportView } from "./views";

const REASONS = ["fraud", "prohibited", "misleading", "offensive", "spam", "other"] as const;

@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async list() {
    const rows = await this.prisma.report.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(reportView);
  }

  async file(input: { reporterId: string; listingId: string; reason: string; details?: string }) {
    const listing = await this.prisma.listing.findUnique({ where: { id: input.listingId } });
    if (!listing) throw new NotFoundError("Anúncio não encontrado.");
    if (listing.sellerId === input.reporterId) throw new InvalidStateError("Não pode denunciar o seu próprio anúncio.");
    const reason = REASONS.find((r) => r === input.reason);
    if (!reason) throw new AdminValidationError("Selecione o motivo da denúncia.", "reason");
    const details = input.details?.trim() || undefined;
    if (reason === "other" && (!details || details.length < 10)) {
      throw new AdminValidationError("Descreva o motivo (mínimo 10 caracteres).", "details");
    }
    const open = await this.prisma.report.findFirst({
      where: { reporterId: input.reporterId, listingId: input.listingId, status: "open" },
    });
    if (open) throw new ConflictError("Já denunciou este anúncio. A equipa de moderação está a analisar.");
    const row = await this.prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        reporterId: input.reporterId,
        listingId: input.listingId,
        reason,
        details,
      },
    });
    return reportView(row);
  }

  async resolve(input: { reportId: string; adminId: string; decision: "dismissed" | "actioned"; note?: string }) {
    const report = await this.prisma.report.findUnique({ where: { id: input.reportId } });
    if (!report) throw new NotFoundError("Denúncia não encontrada.");
    if (report.status !== "open") throw new InvalidStateError("Esta denúncia já foi analisada.");
    const now = this.clock.now();
    if (input.decision === "actioned") {
      const listing = await this.prisma.listing.findUnique({ where: { id: report.listingId } });
      if (listing && listing.status !== "removed") {
        await this.prisma.listing.update({ where: { id: listing.id }, data: { status: "removed", updatedAt: now } });
      }
      const siblings = await this.prisma.report.findMany({
        where: { listingId: report.listingId, status: "open", id: { not: report.id } },
      });
      for (const s of siblings) {
        await this.prisma.report.update({
          where: { id: s.id },
          data: {
            status: "actioned",
            reviewedAt: now,
            reviewedBy: input.adminId,
            resolutionNote: "Resolvida com outra denúncia.",
          },
        });
      }
    }
    const updated = await this.prisma.report.update({
      where: { id: report.id },
      data: {
        status: input.decision,
        reviewedAt: now,
        reviewedBy: input.adminId,
        resolutionNote: input.note?.trim() || undefined,
      },
    });
    return reportView(updated);
  }
}
