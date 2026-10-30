import { Injectable } from "@nestjs/common";
import type { Prisma, User as UserRow, UserRole, UserStatus } from "@prisma/client";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import type { UserRepository } from "../domain/repositories";
import type { User } from "../domain/user";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toDomain = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.passwordHash,
  displayName: row.displayName,
  phone: row.phone ?? undefined,
  province: row.province ?? undefined,
  municipality: row.municipality ?? undefined,
  neighborhood: row.neighborhood ?? undefined,
  bio: row.bio ?? undefined,
  avatarUrl: row.avatarUrl ?? undefined,
  phoneVerifiedAt: row.phoneVerifiedAt ?? undefined,
  lastSeenAt: row.lastSeenAt ?? undefined,
  role: row.role,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toRow = (user: User): Prisma.UserUncheckedCreateInput => ({
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  displayName: user.displayName,
  phone: user.phone ?? null,
  province: user.province ?? null,
  municipality: user.municipality ?? null,
  neighborhood: user.neighborhood ?? null,
  bio: user.bio ?? null,
  avatarUrl: user.avatarUrl ?? null,
  phoneVerifiedAt: user.phoneVerifiedAt ?? null,
  lastSeenAt: user.lastSeenAt ?? null,
  role: user.role as UserRole,
  status: user.status as UserStatus,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    // Um id que não é UUID não existe (e o Prisma rejeitaria a consulta numa coluna uuid).
    if (!UUID.test(id)) return null;
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: string) {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toDomain(row) : null;
  }

  async findByPhone(phone: string) {
    const row = await this.prisma.user.findUnique({ where: { phone } });
    return row ? toDomain(row) : null;
  }

  async save(user: User) {
    const data = toRow(user);
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: data,
      update: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        phone: data.phone,
        province: data.province,
        municipality: data.municipality,
        neighborhood: data.neighborhood,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        phoneVerifiedAt: data.phoneVerifiedAt,
        role: data.role,
        status: data.status,
        updatedAt: data.updatedAt,
        // lastSeenAt fica de fora: é escrito só por touchLastSeen, para um objeto antigo não o recuar.
      },
    });
  }

  async touchLastSeen(id: string, at: Date, staleBefore?: Date) {
    if (!UUID.test(id)) return;
    await this.prisma.user.updateMany({
      where: staleBefore ? { id, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: staleBefore } }] } : { id },
      data: { lastSeenAt: at },
    });
  }
}
