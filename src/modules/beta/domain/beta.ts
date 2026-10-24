export interface BetaSettings {
  readonly closedBeta: boolean;
  readonly openedAt?: Date;
  readonly openedBy?: string;
}

export type InviteStatus = "invited" | "accepted" | "revoked";

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  invited: "Convidado",
  accepted: "Conta criada",
  revoked: "Acesso retirado",
};

export interface BetaInvite {
  readonly id: string;
  readonly email?: string;
  readonly phone?: string;
  readonly name?: string;
  readonly responseId?: string;
  readonly status: InviteStatus;
  readonly invitedBy: string;
  readonly invitedAt: Date;
  readonly acceptedUserId?: string;
  readonly acceptedAt?: Date;
  readonly revokedAt?: Date;
}

export interface Identity {
  email?: string;
  phone?: string;
}

export function matches(invite: BetaInvite, who: Identity): boolean {
  return (
    (!!invite.email && invite.email === who.email?.toLowerCase()) ||
    (!!invite.phone && invite.phone === who.phone)
  );
}

export function findValidInvite(invites: BetaInvite[], who: Identity): BetaInvite | undefined {
  return invites.find((i) => i.status !== "revoked" && matches(i, who));
}

export function hasBetaAccess(
  settings: BetaSettings,
  user: { id: string; isAdmin: boolean } & Identity,
  invites: BetaInvite[],
): boolean {
  if (!settings.closedBeta || user.isAdmin) return true;
  return invites.some(
    (i) => i.status !== "revoked" && (i.acceptedUserId === user.id || matches(i, user)),
  );
}
