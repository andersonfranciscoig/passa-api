import { isAdmin, type User } from "../domain/user";
import { verificationStatus, type VerificationStatus } from "./verification";

export interface UserView {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  province?: string;
  municipality?: string;
  neighborhood?: string;
  bio?: string;
  avatarUrl?: string;
  phoneVerifiedAt?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    province: user.province,
    municipality: user.municipality,
    neighborhood: user.neighborhood,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    phoneVerifiedAt: user.phoneVerifiedAt?.toISOString(),
    isAdmin: isAdmin(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toPublicProfile(user: User, signals?: { publishedListings: number; moderatedListings: number }) {
  return {
    id: user.id,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    location: {
      province: user.province ?? "Luanda",
      municipality: user.municipality ?? "Ingombota",
      neighborhood: user.neighborhood,
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    verification: userVerification(user, signals),
  };
}

export function userVerification(
  user: Pick<User, "displayName" | "bio" | "createdAt" | "phoneVerifiedAt">,
  signals: { publishedListings: number; moderatedListings: number } = { publishedListings: 0, moderatedListings: 0 },
): VerificationStatus {
  return verificationStatus({
    displayName: user.displayName,
    hasBio: !!user.bio?.trim(),
    phoneVerified: !!user.phoneVerifiedAt,
    accountAgeDays: (Date.now() - user.createdAt.getTime()) / 86_400_000,
    publishedListings: signals.publishedListings,
    moderatedListings: signals.moderatedListings,
  });
}
