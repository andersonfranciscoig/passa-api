import { Injectable } from "@nestjs/common";
import type { BetaInvite as InviteRow, BetaSettings as SettingsRow, InviteStatus, Prisma } from "@prisma/client";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import type { BetaInvite, BetaSettings } from "../domain/beta";
import type { BetaInviteRepository, BetaSettingsRepository } from "../domain/repositories";

const toInvite = (row: InviteRow): BetaInvite => ({
  id: row.id,
  email: row.email ?? undefined,
  phone: row.phone ?? undefined,
  name: row.name ?? undefined,
  responseId: row.responseId ?? undefined,
  status: row.status,
  invitedBy: row.invitedById,
  invitedAt: row.invitedAt,
  acceptedUserId: row.acceptedUserId ?? undefined,
  acceptedAt: row.acceptedAt ?? undefined,
  revokedAt: row.revokedAt ?? undefined,
});

const toSettings = (row: SettingsRow): BetaSettings => ({
  closedBeta: row.closedBeta,
  openedAt: row.openedAt ?? undefined,
  openedBy: row.openedById ?? undefined,
});

@Injectable()
export class PrismaBetaInviteRepository implements BetaInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return (await this.prisma.betaInvite.findMany()).map(toInvite);
  }

  async findById(id: string) {
    const row = await this.prisma.betaInvite.findUnique({ where: { id } });
    return row ? toInvite(row) : null;
  }

  async save(invite: BetaInvite) {
    const data: Prisma.BetaInviteUncheckedCreateInput = {
      id: invite.id,
      email: invite.email ?? null,
      phone: invite.phone ?? null,
      name: invite.name ?? null,
      responseId: invite.responseId ?? null,
      status: invite.status as InviteStatus,
      invitedById: invite.invitedBy,
      invitedAt: invite.invitedAt,
      acceptedUserId: invite.acceptedUserId ?? null,
      acceptedAt: invite.acceptedAt ?? null,
      revokedAt: invite.revokedAt ?? null,
    };
    await this.prisma.betaInvite.upsert({
      where: { id: invite.id },
      create: data,
      update: {
        email: data.email,
        phone: data.phone,
        name: data.name,
        responseId: data.responseId,
        status: data.status,
        acceptedUserId: data.acceptedUserId,
        acceptedAt: data.acceptedAt,
        revokedAt: data.revokedAt,
      },
    });
  }
}

@Injectable()
export class PrismaBetaSettingsRepository implements BetaSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<BetaSettings> {
    const row = await this.prisma.betaSettings.findUnique({ where: { id: true } });
    return row ? toSettings(row) : { closedBeta: true };
  }

  async save(settings: BetaSettings) {
    await this.prisma.betaSettings.upsert({
      where: { id: true },
      create: {
        id: true,
        closedBeta: settings.closedBeta,
        openedAt: settings.openedAt ?? null,
        openedById: settings.openedBy ?? null,
      },
      update: {
        closedBeta: settings.closedBeta,
        openedAt: settings.openedAt ?? null,
        openedById: settings.openedBy ?? null,
      },
    });
  }
}
