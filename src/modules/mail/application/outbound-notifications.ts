import { Injectable, Logger } from "@nestjs/common";

import { AppConfig } from "../../../config/app-config";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { MailService } from "./mail.service";

@Injectable()
export class OutboundNotifications {
  private readonly logger = new Logger(OutboundNotifications.name);

  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async surveySubmitted(input: {
    respondentName?: string;
    respondentEmail?: string;
    respondentPhone?: string;
    betaConsent: boolean;
    waitlistPosition: number;
  }) {
    try {
      for (const admin of await this.admins()) {
        await this.mail.sendSurveyToAdmin({ ...input, email: admin.email, name: admin.displayName });
      }
    } catch (error) {
      this.logger.error("Falha a avisar o admin do inquérito", error instanceof Error ? error.stack : error);
    }
  }

  async contactConfirmed(input: { userName: string; userEmail: string }) {
    try {
      for (const admin of await this.admins()) {
        await this.mail.sendContactConfirmedToAdmin({
          email: admin.email,
          name: admin.displayName,
          userName: input.userName,
          userEmail: input.userEmail,
        });
      }
    } catch (error) {
      this.logger.error("Falha a avisar o admin do contacto confirmado", error instanceof Error ? error.stack : error);
    }
  }

  async accountVerified(input: { userName: string; userEmail: string }) {
    try {
      for (const admin of await this.admins()) {
        await this.mail.sendAccountVerifiedToAdmin({
          email: admin.email,
          name: admin.displayName,
          userName: input.userName,
          userEmail: input.userEmail,
        });
      }
    } catch (error) {
      this.logger.error("Falha a avisar o admin da conta verificada", error instanceof Error ? error.stack : error);
    }
  }

  async platformOpened() {
    try {
      const users = await this.prisma.user.findMany({
        select: { email: true, displayName: true },
      });
      this.logger.log(`A avisar ${users.length} contas de que o PASSA está aberto.`);
      for (const user of users) {
        await this.mail.sendPlatformOpen({ email: user.email, name: user.displayName });
      }
    } catch (error) {
      this.logger.error("Falha a avisar as contas da abertura", error instanceof Error ? error.stack : error);
    }
  }

  private async admins() {
    const rows = await this.prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { email: true, displayName: true },
    });
    if (rows.length) return rows;
    if (this.config.email.adminNotify) {
      return [{ email: this.config.email.adminNotify, displayName: "Equipa PASSA" }];
    }
    return [];
  }
}
