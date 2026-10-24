import { Injectable, Logger } from "@nestjs/common";

import { AppConfig } from "../../../config/app-config";
import { formatPhone } from "../../../shared/domain/phone";
import { MailPort } from "./ports/mail.port";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mail: MailPort,
    private readonly config: AppConfig,
  ) {}

  async sendContactVerification(input: { email: string; displayName: string; phone: string; code: string }): Promise<void> {
    const phone = formatPhone(input.phone);
    const first = firstName(input.displayName);
    await this.sendOrThrow(
      {
        to: { email: input.email, name: input.displayName },
        subject: `${input.code} — confirme o telemóvel no PASSA`,
        text: [
          `Olá ${first},`,
          "",
          `O seu código PASSA para confirmar o telemóvel ${phone} é: ${input.code}`,
          "Válido durante 10 minutos.",
          "",
          "Se não pediu este código, ignore este email.",
        ].join("\n"),
        html: this.page(
          `Olá ${escapeHtml(first)},`,
          `<p>Use este código para confirmar o telemóvel <strong>${escapeHtml(phone)}</strong> no PASSA:</p>
           <p style="font-size:28px;letter-spacing:8px;font-weight:700">${escapeHtml(input.code)}</p>
           <p>Válido durante 10 minutos. Se não pediu este código, ignore este email.</p>`,
        ),
        tags: ["passa", "contact-verification"],
      },
      true,
    );
  }

  async sendSurveyToAdmin(input: {
    email: string;
    name: string;
    respondentName?: string;
    respondentEmail?: string;
    respondentPhone?: string;
    betaConsent: boolean;
    waitlistPosition: number;
  }): Promise<void> {
    const who = input.respondentName || input.respondentEmail || (input.respondentPhone ? formatPhone(input.respondentPhone) : "Alguém");
    const contact = [input.respondentEmail, input.respondentPhone ? formatPhone(input.respondentPhone) : undefined].filter(Boolean).join(" · ");
    const wait = input.betaConsent ? `Quer entrar no beta (posição ${input.waitlistPosition} na lista).` : "Não pediu convite para o beta.";
    await this.sendOrThrow({
      to: { email: input.email, name: input.name },
      subject: `Nova resposta ao inquérito PASSA — ${who}`,
      text: `Nova resposta ao inquérito.\n\nNome: ${who}\nContacto: ${contact || "—"}\n${wait}\n\nVeja as respostas no painel: ${this.config.frontendUrl}/admin`,
      html: this.page(
        "Nova resposta ao inquérito",
        `<p><strong>${escapeHtml(who)}</strong> acabou de responder ao inquérito do PASSA.</p>
         <p>Contacto: ${escapeHtml(contact || "—")}<br/>${escapeHtml(wait)}</p>
         ${this.button(`${this.config.frontendUrl}/admin`, "Abrir o painel")}`,
      ),
      tags: ["passa", "survey"],
    });
  }

  async sendBetaInvite(input: { email: string; name?: string }): Promise<void> {
    const first = firstName(input.name || "olá");
    const url = `${this.config.frontendUrl}/registar`;
    await this.sendOrThrow({
      to: { email: input.email, name: input.name },
      subject: "Tem acesso ao PASSA beta",
      text: `Olá ${first},\n\nA equipa PASSA deu-lhe acesso à plataforma. Crie a conta com este email em ${url}\n\nAté já.`,
      html: this.page(
        `Olá ${escapeHtml(first)},`,
        `<p>A equipa PASSA deu-lhe acesso ao beta. Pode criar a conta com este email.</p>
         ${this.button(url, "Criar conta no PASSA")}`,
      ),
      tags: ["passa", "beta-invite"],
    });
  }

  async sendContactConfirmedToAdmin(input: {
    email: string;
    name: string;
    userName: string;
    userEmail: string;
  }): Promise<void> {
    await this.sendOrThrow({
      to: { email: input.email, name: input.name },
      subject: `${input.userName} confirmou o telemóvel no PASSA`,
      text: `${input.userName} (${input.userEmail}) confirmou o telemóvel e avançou na verificação da conta.\n\n${this.config.frontendUrl}/admin`,
      html: this.page(
        "Contacto confirmado",
        `<p><strong>${escapeHtml(input.userName)}</strong> (${escapeHtml(input.userEmail)}) confirmou o telemóvel da conta.</p>
         ${this.button(`${this.config.frontendUrl}/admin`, "Ver no painel")}`,
      ),
      tags: ["passa", "contact-confirmed"],
    });
  }

  async sendAccountVerifiedToAdmin(input: {
    email: string;
    name: string;
    userName: string;
    userEmail: string;
  }): Promise<void> {
    await this.sendOrThrow({
      to: { email: input.email, name: input.name },
      subject: `${input.userName} verificou a conta no PASSA`,
      text: `${input.userName} (${input.userEmail}) concluiu a verificação da conta.\n\n${this.config.frontendUrl}/admin`,
      html: this.page(
        "Conta verificada",
        `<p><strong>${escapeHtml(input.userName)}</strong> (${escapeHtml(input.userEmail)}) concluiu os critérios e ficou com o selo de conta verificada.</p>
         ${this.button(`${this.config.frontendUrl}/admin`, "Ver no painel")}`,
      ),
      tags: ["passa", "account-verified"],
    });
  }

  async sendPlatformOpen(input: { email: string; name?: string }): Promise<void> {
    const first = firstName(input.name || "olá");
    const url = this.config.frontendUrl;
    await this.sendOrThrow({
      to: { email: input.email, name: input.name },
      subject: "O PASSA está aberto a todos",
      text: `Olá ${first},\n\nO PASSA deixou de estar em beta fechado. Qualquer pessoa pode criar conta e usar a plataforma.\n\n${url}`,
      html: this.page(
        `Olá ${escapeHtml(first)},`,
        `<p>Boas notícias: o PASSA está agora aberto a todos. Já não é preciso convite para criar conta.</p>
         ${this.button(url, "Abrir o PASSA")}`,
      ),
      tags: ["passa", "beta-open"],
    });
  }

  private page(title: string, body: string) {
    return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;background:#f8fafc;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
    <p style="font-weight:800;font-size:18px;margin:0 0 16px">PASSA</p>
    <div>${title.startsWith("<") ? title : `<p style="font-size:18px;font-weight:700">${title}</p>`}</div>
    ${body}
  </div>
</body></html>`;
  }

  private button(href: string, label: string) {
    return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700">${escapeHtml(label)}</a></p>`;
  }

  private async sendOrThrow(
    input: { to: { email: string; name?: string }; subject: string; html: string; text: string; tags: string[] },
    rethrow = false,
  ) {
    try {
      await this.mail.send(input);
    } catch (error) {
      this.logger.error(`Falha a enviar email (${input.tags.join(",")})`, error instanceof Error ? error.stack : error);
      if (rethrow) throw error;
    }
  }
}

function firstName(raw: string) {
  return raw.trim().split(/\s+/)[0] || "olá";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
