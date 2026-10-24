import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AppConfig } from "../../../config/app-config";
import { FileStorage, validateAvatarUpload } from "../../../shared/application/file-storage";
import { ValidationError } from "../../../shared/domain/domain-error";
import { Clock } from "../../../shared/domain/clock";
import { IdGenerator } from "../../../shared/domain/id-generator";
import { createAngolanPhone } from "../../../shared/domain/phone";
import { slugify } from "../../../shared/domain/text";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { listingView } from "../../admin/application/views";
import { ListingForbiddenError, ListingNotFoundError, ListingStateError } from "../domain/errors";
import type { ListingDraftBody, ListingSearchQuery } from "../presentation/http/listings.schemas";

const CATEGORIES = ["clothing", "shoes", "dresses_suits", "accessories", "home", "books", "electronics", "other"] as const;
const CONDITIONS = ["new", "like_new", "good", "fair"] as const;
const RENTAL_PERIODS = ["hour", "day", "weekend", "week", "month"] as const;
const MAX_IMAGES = 8;
const PUBLIC = new Set(["published", "reserved"]);

const OWNER_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["published"],
  published: ["reserved", "completed", "archived"],
  reserved: ["published", "completed", "archived"],
  completed: ["archived", "published"],
  archived: ["published"],
  removed: [],
};

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly storage: FileStorage,
    private readonly config: AppConfig,
  ) {}

  async listMine(userId: string) {
    const rows = await this.prisma.listing.findMany({
      where: { sellerId: userId },
      include: { images: true },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(listingView);
  }

  async getById(id: string, viewerId?: string, isAdmin = false) {
    return this.visible(await this.find(id), viewerId, isAdmin);
  }

  async getBySlug(slug: string, viewerId?: string, isAdmin = false) {
    const row = await this.prisma.listing.findUnique({ where: { slug }, include: { images: true } });
    return this.visible(row, viewerId, isAdmin);
  }

  async search(query: ListingSearchQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const modes = csv(query.modes);
    const conditions = csv(query.conditions);
    const rows = await this.prisma.listing.findMany({
      where: {
        status: { in: [...PUBLIC] },
        ...(query.category ? { category: query.category } : {}),
        ...(query.province ? { province: query.province } : {}),
        ...(query.municipality ? { municipality: query.municipality } : {}),
      },
      include: { images: true },
    });
    const items = rows
      .map(listingView)
      .filter((listing) => {
        const terms = listing.terms as { mode?: string; priceAoa?: number };
        if (modes.length && !modes.includes(String(terms.mode))) return false;
        if (conditions.length && !conditions.includes(listing.condition)) return false;
        if (query.minPrice != null || query.maxPrice != null) {
          const price = typeof terms.priceAoa === "number" ? terms.priceAoa : null;
          if (price == null) return false;
          if (query.minPrice != null && price < query.minPrice) return false;
          if (query.maxPrice != null && price > query.maxPrice) return false;
        }
        if (query.query?.trim()) {
          const haystack = normalize(`${listing.title} ${listing.description}`);
          return normalize(query.query)
            .split(/\s+/)
            .filter(Boolean)
            .every((term) => haystack.includes(term));
        }
        return true;
      })
      .sort((a, b) => compareListings(a, b, query.sort));
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
  }

  async registerView(id: string, viewerId?: string) {
    const row = await this.find(id);
    if (!row || !PUBLIC.has(row.status) || row.sellerId === viewerId) return;
    await this.prisma.listing.update({ where: { id: row.id }, data: { viewCount: { increment: 1 } } });
  }

  async create(userId: string, input: ListingDraftBody) {
    const publish = !!input.publish;
    const content = this.validate(input, publish);
    const now = this.clock.now();
    const row = await this.prisma.listing.create({
      data: {
        id: this.ids.next(),
        sellerId: userId,
        slug: await this.uniqueSlug(content.title),
        title: content.title,
        description: content.description,
        category: content.category,
        condition: content.condition,
        terms: content.terms as Prisma.InputJsonValue,
        status: publish ? "published" : "draft",
        whatsappEnabled: content.whatsappEnabled,
        whatsappPhone: content.whatsappPhone ?? null,
        province: content.province,
        municipality: content.municipality,
        neighborhood: content.neighborhood ?? null,
        publishedAt: publish ? now : null,
        images: {
          create: content.imageRefs.map((ref, position) => ({ id: this.ids.next(), ref, position })),
        },
      },
      include: { images: true },
    });
    return listingView(row);
  }

  async update(userId: string, id: string, input: ListingDraftBody) {
    const existing = await this.requireOwner(userId, id);
    if (existing.status === "removed") throw new ListingStateError("Um anúncio removido pela moderação não pode ser editado.");
    const content = this.validate(input, existing.status !== "draft");
    await this.prisma.listingImage.deleteMany({ where: { listingId: id } });
    const row = await this.prisma.listing.update({
      where: { id },
      data: {
        title: content.title,
        description: content.description,
        category: content.category,
        condition: content.condition,
        terms: content.terms as Prisma.InputJsonValue,
        whatsappEnabled: content.whatsappEnabled,
        whatsappPhone: content.whatsappPhone ?? null,
        province: content.province,
        municipality: content.municipality,
        neighborhood: content.neighborhood ?? null,
        images: {
          create: content.imageRefs.map((ref, position) => ({ id: this.ids.next(), ref, position })),
        },
      },
      include: { images: true },
    });
    return listingView(row);
  }

  async changeStatus(userId: string, id: string, next: string) {
    const existing = await this.requireOwner(userId, id);
    if (!(OWNER_TRANSITIONS[existing.status] ?? []).includes(next)) {
      throw new ListingStateError("Esta alteração de estado não é permitida.");
    }
    if (next === "published") {
      if (existing.images.length === 0) throw new ValidationError("Adicione pelo menos uma fotografia para publicar.", "images");
      if (existing.description.length < 20) throw new ValidationError("Complete a descrição antes de publicar.", "description");
    }
    const now = this.clock.now();
    const row = await this.prisma.listing.update({
      where: { id },
      data: {
        status: next,
        publishedAt: next === "published" ? (existing.publishedAt ?? now) : existing.publishedAt,
      },
      include: { images: true },
    });
    return listingView(row);
  }

  async remove(userId: string, id: string) {
    const existing = await this.requireOwner(userId, id);
    await this.prisma.listing.delete({ where: { id } });
    for (const image of existing.images) {
      const key = uploadthingKey(image.ref);
      if (key) await this.storage.delete([key]).catch(() => undefined);
    }
  }

  async uploadImage(userId: string, file?: { name: string; data: Uint8Array }) {
    const incoming = validateAvatarUpload(file, this.config.storage.maxBytes);
    const stored = await this.storage.upload(incoming, `listings/${userId}`);
    return { ref: stored.url };
  }

  private async find(id: string) {
    if (!UUID.test(id)) return null;
    return this.prisma.listing.findUnique({ where: { id }, include: { images: true } });
  }

  private visible(row: Awaited<ReturnType<ListingsService["find"]>>, viewerId?: string, isAdmin = false) {
    if (!row) throw new ListingNotFoundError();
    if (row.sellerId === viewerId || isAdmin || PUBLIC.has(row.status)) return listingView(row);
    throw new ListingNotFoundError();
  }

  private async requireOwner(userId: string, id: string) {
    const row = await this.find(id);
    if (!row) throw new ListingNotFoundError();
    if (row.sellerId !== userId) throw new ListingForbiddenError();
    return row;
  }

  private async uniqueSlug(title: string) {
    const base = slugify(title) || "anuncio";
    let slug = base;
    for (let i = 2; await this.prisma.listing.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    return slug;
  }

  private validate(input: ListingDraftBody, publishing: boolean) {
    const title = input.title.trim().replace(/\s+/g, " ");
    if (title.length < 5) throw new ValidationError("O título deve ter pelo menos 5 caracteres.", "title");
    if (title.length > 80) throw new ValidationError("O título deve ter no máximo 80 caracteres.", "title");
    const description = (input.description ?? "").trim();
    if (publishing && description.length < 20) {
      throw new ValidationError("Descreva o artigo com pelo menos 20 caracteres.", "description");
    }
    if (description.length > 2000) throw new ValidationError("A descrição deve ter no máximo 2000 caracteres.", "description");
    if (!CATEGORIES.includes(input.category as (typeof CATEGORIES)[number])) {
      throw new ValidationError("Selecione uma categoria.", "category");
    }
    if (!CONDITIONS.includes(input.condition as (typeof CONDITIONS)[number])) {
      throw new ValidationError("Indique o estado do artigo.", "condition");
    }
    const imageRefs = input.imageRefs ?? [];
    if (imageRefs.length > MAX_IMAGES) throw new ValidationError(`Pode carregar no máximo ${MAX_IMAGES} fotografias.`, "images");
    if (publishing && imageRefs.length === 0) {
      throw new ValidationError("Adicione pelo menos uma fotografia para publicar.", "images");
    }
    if (!input.province.trim() || !input.municipality.trim()) {
      throw new ValidationError("Indique a província e o município.", "province");
    }
    let whatsappPhone: string | undefined;
    if (input.whatsappEnabled) whatsappPhone = createAngolanPhone(input.whatsappPhone ?? "", "whatsappPhone");
    return {
      title,
      description,
      category: input.category,
      condition: input.condition,
      terms: this.terms(input),
      imageRefs,
      whatsappEnabled: !!input.whatsappEnabled,
      whatsappPhone,
      province: input.province.trim(),
      municipality: input.municipality.trim(),
      neighborhood: input.neighborhood?.trim() || undefined,
    };
  }

  private terms(input: ListingDraftBody): Record<string, unknown> {
    const price = () => {
      const n = typeof input.priceAoa === "string" ? Number(input.priceAoa.replace(/\s/g, "")) : input.priceAoa;
      if (!Number.isInteger(n) || !n || n <= 0 || n > 100_000_000) {
        throw new ValidationError("Indique um preço inteiro em kwanzas, superior a 0.", "priceAoa");
      }
      return n;
    };
    const text = (value: string | undefined, field: string, label: string, min = 10, max = 500) => {
      const v = value?.trim() ?? "";
      if (v.length < min) throw new ValidationError(`${label} (mínimo ${min} caracteres).`, field);
      if (v.length > max) throw new ValidationError(`Máximo de ${max} caracteres.`, field);
      return v;
    };
    switch (input.mode) {
      case "sell":
        return { mode: "sell", priceAoa: price(), negotiable: !!input.negotiable };
      case "rent": {
        if (!RENTAL_PERIODS.includes(input.rentalPeriod as (typeof RENTAL_PERIODS)[number])) {
          throw new ValidationError("Selecione o período de aluguer.", "rentalPeriod");
        }
        return {
          mode: "rent",
          priceAoa: price(),
          rentalPeriod: input.rentalPeriod,
          conditions: text(input.conditions, "conditions", "Descreva as condições de utilização"),
        };
      }
      case "exchange":
        return { mode: "exchange", wantedInExchange: text(input.wantedInExchange, "wantedInExchange", "Indique o que pretende receber em troca", 3, 300) };
      case "donate": {
        const notes = input.pickupNotes?.trim() || undefined;
        if (notes && notes.length > 300) throw new ValidationError("Máximo de 300 caracteres.", "pickupNotes");
        return { mode: "donate", pickupNotes: notes };
      }
      case "lend": {
        const days = Number(input.returnPeriodDays);
        if (!Number.isInteger(days) || days < 1 || days > 90) {
          throw new ValidationError("Indique um prazo de devolução entre 1 e 90 dias.", "returnPeriodDays");
        }
        return { mode: "lend", conditions: text(input.conditions, "conditions", "Descreva as condições de utilização e devolução"), returnPeriodDays: days };
      }
      default:
        throw new ValidationError("Selecione uma modalidade.", "mode");
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function csv(value?: string) {
  return value?.split(",").map((v) => v.trim()).filter(Boolean) ?? [];
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function recency(listing: ReturnType<typeof listingView>) {
  return new Date(listing.publishedAt ?? listing.createdAt).getTime();
}

function compareListings(a: ReturnType<typeof listingView>, b: ReturnType<typeof listingView>, sort?: ListingSearchQuery["sort"]) {
  if (sort === "price_asc" || sort === "price_desc") {
    const pa = Number((a.terms as { priceAoa?: number }).priceAoa ?? 0);
    const pb = Number((b.terms as { priceAoa?: number }).priceAoa ?? 0);
    return sort === "price_asc" ? pa - pb : pb - pa;
  }
  return recency(b) - recency(a);
}

function uploadthingKey(url?: string) {
  if (!url) return undefined;
  try {
    const match = new URL(url).pathname.match(/\/(?:f|a)\/([^/?#]+)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}
