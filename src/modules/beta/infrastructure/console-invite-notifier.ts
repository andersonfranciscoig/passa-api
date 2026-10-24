import { formatPhone } from "../../../shared/domain/phone";
import type { BetaInvite } from "../domain/beta";
import type { InviteNotifier } from "../domain/repositories";

/** Em desenvolvimento o convite aparece na consola (email/SMS reais vêm depois). */
export class ConsoleInviteNotifier implements InviteNotifier {
  async send(invite: BetaInvite) {
    const to = invite.email ?? (invite.phone ? formatPhone(invite.phone) : "contacto");
    const channel = invite.email ? "email" : "sms";
    const first = invite.name?.split(" ")[0];
    console.log(
      `[beta] convite ${channel} → ${to}: Olá${first ? ` ${first}` : ""}! Já pode experimentar o PASSA beta. Crie a conta em /registar com este ${invite.email ? "email" : "número"}.`,
    );
  }
}
