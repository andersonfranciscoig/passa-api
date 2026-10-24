import { INVITE_STATUS_LABELS, type BetaInvite, type BetaSettings } from "../domain/beta";

export function toInviteView(invite: BetaInvite) {
  return {
    id: invite.id,
    email: invite.email,
    phone: invite.phone,
    name: invite.name,
    responseId: invite.responseId,
    status: invite.status,
    statusLabel: INVITE_STATUS_LABELS[invite.status],
    invitedBy: invite.invitedBy,
    invitedAt: invite.invitedAt.toISOString(),
    acceptedUserId: invite.acceptedUserId,
    acceptedAt: invite.acceptedAt?.toISOString(),
    revokedAt: invite.revokedAt?.toISOString(),
  };
}

export function toSettingsView(settings: BetaSettings) {
  return {
    closedBeta: settings.closedBeta,
    openedAt: settings.openedAt?.toISOString(),
    openedBy: settings.openedBy,
  };
}
