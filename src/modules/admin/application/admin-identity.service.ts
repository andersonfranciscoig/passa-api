import { Injectable } from "@nestjs/common";
import type { UserStatus } from "@prisma/client";

import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { userVerification } from "../../identity/application/user-view";
import { ForbiddenError, NotFoundError } from "../domain/errors";
import { adminUserView, listingView, profileView } from "./views";

@Injectable()
export class AdminIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async listProfiles() {
    const users = await this.prisma.user.findMany({ orderBy: { displayName: "asc" } });
    return users.map(profileView);
  }

  async getProfiles(ids: string[]) {
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } } });
    return users.map(profileView);
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return users.map(adminUserView);
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError("Utilizador não encontrado.");
    const rows = await this.prisma.listing.findMany({
      where: { sellerId: id },
      include: { images: true },
      orderBy: { updatedAt: "desc" },
    });
    const publishedListings = rows.filter((r) => r.status === "published" || r.status === "reserved").length;
    const moderatedListings = rows.filter((r) => r.status === "removed").length;
    return {
      ...adminUserView(user),
      listings: rows.map(listingView),
      verification: userVerification(
        {
          displayName: user.displayName,
          bio: user.bio ?? undefined,
          createdAt: user.createdAt,
          phoneVerifiedAt: user.phoneVerifiedAt ?? undefined,
        },
        { publishedListings, moderatedListings },
      ),
    };
  }

  async setStatus(id: string, status: UserStatus, actorId: string) {
    if (id === actorId) throw new ForbiddenError("Não pode alterar o estado da sua própria conta.");
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError("Utilizador não encontrado.");
    if (user.role === "ADMIN" && status === "SUSPENDED") {
      const otherAdmins = await this.prisma.user.count({
        where: { role: "ADMIN", status: "ACTIVE", id: { not: id } },
      });
      if (otherAdmins === 0) throw new ForbiddenError("Não pode suspender o último administrador ativo.");
    }
    const updated = await this.prisma.user.update({ where: { id }, data: { status } });
    return adminUserView(updated);
  }
}
