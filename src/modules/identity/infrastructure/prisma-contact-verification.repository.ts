import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { ContactVerificationRepository, type ContactVerification } from "../domain/repositories";

@Injectable()
export class PrismaContactVerificationRepository extends ContactVerificationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(row: ContactVerification) {
    await this.prisma.contactVerification.upsert({
      where: { userId: row.userId },
      create: {
        userId: row.userId,
        phone: row.phone,
        code: row.code,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      },
      update: {
        phone: row.phone,
        code: row.code,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      },
    });
  }

  async find(userId: string) {
    const row = await this.prisma.contactVerification.findUnique({ where: { userId } });
    return row
      ? { userId: row.userId, phone: row.phone, code: row.code, expiresAt: row.expiresAt, createdAt: row.createdAt }
      : null;
  }

  async delete(userId: string) {
    await this.prisma.contactVerification.deleteMany({ where: { userId } });
  }
}
