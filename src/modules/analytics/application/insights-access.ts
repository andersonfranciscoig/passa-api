import type { Clock } from "../../../shared/domain/clock";
import { verificationStatus } from "../../identity/application/verification";
import type { UserRepository } from "../../identity/domain/repositories";
import { accessFor, type InsightsAccess } from "../domain/access";
import type { InsightsCatalog } from "../domain/repositories";

export async function resolveInsightsAccess(
  userId: string,
  isAdmin: boolean,
  catalog: InsightsCatalog,
  users: UserRepository,
  clock: Clock,
): Promise<InsightsAccess> {
  if (isAdmin) return accessFor("pro");
  const now = clock.now();
  if (await catalog.hasActivePro(userId, now)) return accessFor("pro");
  const user = await users.findById(userId);
  if (!user) return accessFor("free");
  const signals = await catalog.listingSignals(userId);
  const verified = verificationStatus({
    displayName: user.displayName,
    hasBio: !!user.bio?.trim(),
    phoneVerified: !!user.phoneVerifiedAt,
    accountAgeDays: (now.getTime() - user.createdAt.getTime()) / 86_400_000,
    publishedListings: signals.publishedListings,
    moderatedListings: signals.moderatedListings,
  }).verified;
  return accessFor(verified ? "verified" : "free");
}
