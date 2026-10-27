import type {
  Listing,
  ListingImage,
  MonetizationAuditLog,
  MonetizationPlan,
  MonetizationSettings,
  PaymentRecord,
  PromotionRequest,
  Report,
  Subscription,
  User,
} from "@prisma/client";

export type ListingRow = Listing & { images: ListingImage[] };

export type ListingView = ReturnType<typeof listingView>;

export function listingView(row: ListingRow) {
  return {
    id: row.id,
    sellerId: row.sellerId,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    condition: row.condition,
    terms: row.terms,
    status: row.status,
    images: row.images
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ id: i.id, ref: i.ref, position: i.position })),
    whatsapp: { enabled: row.whatsappEnabled, phone: row.whatsappPhone ?? undefined },
    location: { province: row.province, municipality: row.municipality, neighborhood: row.neighborhood ?? undefined },
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString(),
  };
}

export function reportView(row: Report) {
  return {
    id: row.id,
    reporterId: row.reporterId,
    listingId: row.listingId,
    reason: row.reason,
    details: row.details ?? undefined,
    status: row.status,
    reviewedAt: row.reviewedAt?.toISOString(),
    reviewedBy: row.reviewedBy ?? undefined,
    resolutionNote: row.resolutionNote ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export function adminUserView(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone ?? undefined,
    province: user.province ?? undefined,
    municipality: user.municipality ?? undefined,
    neighborhood: user.neighborhood ?? undefined,
    bio: user.bio ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

export function profileView(user: User) {
  return {
    id: user.id,
    displayName: user.displayName,
    bio: user.bio ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    phone: user.phone ?? undefined,
    location: {
      province: user.province ?? "Luanda",
      municipality: user.municipality ?? "Ingombota",
      neighborhood: user.neighborhood ?? undefined,
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function planView(row: MonetizationPlan) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    durationDays: row.durationDays,
    priceAoa: row.priceAoa,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function settingsView(row: MonetizationSettings) {
  return {
    promotionsEnabled: row.promotionsEnabled,
    paidPromotionsEnabled: row.paidPromotionsEnabled,
    homeSlots: row.homeSlots,
    paidSubscriptionsEnabled: row.paidSubscriptionsEnabled,
    paymentProvider: row.paymentProvider,
    referenceEntity: row.referenceEntity,
    referenceTtlHours: row.referenceTtlHours,
  };
}

export function promotionView(row: PromotionRequest) {
  return {
    id: row.id,
    listingId: row.listingId,
    userId: row.userId,
    planId: row.planId,
    planName: row.planName,
    planPriceAoa: row.planPriceAoa,
    durationDays: row.durationDays,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    promotionSource: row.promotionSource,
    requestedAt: row.requestedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString(),
    approvedBy: row.approvedBy ?? undefined,
    startsAt: row.startsAt?.toISOString(),
    expiresAt: row.expiresAt?.toISOString(),
    reviewNote: row.reviewNote ?? undefined,
    endedReason: row.endedReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function paymentView(row: PaymentRecord) {
  return {
    id: row.id,
    userId: row.userId,
    targetType: row.targetType,
    targetId: row.targetId,
    description: row.description,
    amountAoa: row.amountAoa,
    currency: row.currency,
    provider: row.provider,
    method: row.method,
    entity: row.entity,
    reference: row.reference,
    providerReference: row.providerReference,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    paidAt: row.paidAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function subscriptionView(row: Subscription) {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    planName: row.planName,
    priceAoa: row.priceAoa,
    durationDays: row.durationDays,
    status: row.status,
    source: row.source,
    paymentStatus: row.paymentStatus,
    requestedAt: row.requestedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString(),
    reviewedBy: row.reviewedBy ?? undefined,
    startsAt: row.startsAt?.toISOString(),
    expiresAt: row.expiresAt?.toISOString(),
    note: row.note ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function auditView(row: MonetizationAuditLog) {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
  };
}
