import { Global, Module } from "@nestjs/common";

import { AppConfig } from "../../config/app-config";
import { MailService } from "./application/mail.service";
import { OutboundNotifications } from "./application/outbound-notifications";
import { MailPort } from "./application/ports/mail.port";
import { BrevoMailAdapter } from "./infrastructure/brevo-mail.adapter";
import { ConsoleMailAdapter } from "./infrastructure/console-mail.adapter";

@Global()
@Module({
  providers: [
    {
      provide: MailPort,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        config.email.provider === "brevo" ? new BrevoMailAdapter(config) : new ConsoleMailAdapter(),
    },
    MailService,
    OutboundNotifications,
  ],
  exports: [MailService, OutboundNotifications],
})
export class MailModule {}
