import { Injectable } from "@nestjs/common";
import type { Prisma, SurveyResponse as SurveyResponseRow } from "@prisma/client";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import type { SurveyResponseRepository } from "../domain/repositories";
import type { Answers, SurveyContact, SurveyResponse } from "../domain/survey";

const toDomain = (row: SurveyResponseRow): SurveyResponse => ({
  id: row.id,
  version: row.version,
  contact: {
    name: row.name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
  },
  answers: row.answers as Answers,
  betaConsent: row.betaConsent,
  createdAt: row.createdAt,
});

@Injectable()
export class PrismaSurveyResponseRepository implements SurveyResponseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.surveyResponse.findMany();
    return rows.map(toDomain);
  }

  async findByContact(contact: SurveyContact) {
    const row = await this.prisma.surveyResponse.findFirst({
      where: {
        OR: [
          ...(contact.email ? [{ email: contact.email }] : []),
          ...(contact.phone ? [{ phone: contact.phone }] : []),
        ],
      },
    });
    return row ? toDomain(row) : null;
  }

  async save(response: SurveyResponse) {
    const data: Prisma.SurveyResponseUncheckedCreateInput = {
      id: response.id,
      version: response.version,
      name: response.contact.name ?? null,
      email: response.contact.email ?? null,
      phone: response.contact.phone ?? null,
      answers: response.answers as Prisma.InputJsonValue,
      betaConsent: response.betaConsent,
      createdAt: response.createdAt,
    };
    await this.prisma.surveyResponse.upsert({
      where: { id: response.id },
      create: data,
      update: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        answers: data.answers,
        betaConsent: data.betaConsent,
      },
    });
  }
}
