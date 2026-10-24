import { Injectable, Logger } from "@nestjs/common";

import { formatPhone } from "../../../shared/domain/phone";
import { MailService } from "../../mail/application/mail.service";
import type { BetaInvite } from "../domain/beta";
import { InviteNotifier } from "../domain/repositories";

@Injectable()
export class EmailInviteNotifier extends InviteNotifier {
  private readonly logger = new Logger(EmailInviteNotifier.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async send(invite: BetaInvite) {
    if (invite.email) {
      await this.mail.sendBetaInvite({ email: invite.email, name: invite.name });
      return;
    }
    const to = invite.phone ? formatPhone(invite.phone) : "contacto";
    this.logger.log(`[beta] convite sem email → ${to}. Sem SMS: o acesso fica no painel.`);
  }
}
