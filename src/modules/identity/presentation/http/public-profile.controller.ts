import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "../../../../shared/infrastructure/database/prisma.service";
import { listingView } from "../../../admin/application/views";
import { AccountNotFoundError } from "../../domain/errors";
import { UserRepository } from "../../domain/repositories";
import { toPublicProfile } from "../../application/user-view";

@ApiTags("Perfis")
@Controller("users")
export class PublicProfileController {
  constructor(
    private readonly users: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "Perfil público" })
  async profile(@Param("id") id: string) {
    const user = await this.users.findById(id);
    if (!user || user.status === "SUSPENDED") throw new AccountNotFoundError();
    const [publishedListings, moderatedListings] = await Promise.all([
      this.prisma.listing.count({ where: { sellerId: id, status: { in: ["published", "reserved"] } } }),
      this.prisma.listing.count({ where: { sellerId: id, status: "removed" } }),
    ]);
    return toPublicProfile(user, { publishedListings, moderatedListings });
  }

  @Get(":id/listings")
  @ApiOperation({ summary: "Anúncios públicos deste vendedor" })
  async listings(@Param("id") id: string) {
    const user = await this.users.findById(id);
    if (!user || user.status === "SUSPENDED") throw new AccountNotFoundError();
    const rows = await this.prisma.listing.findMany({
      where: { sellerId: id, status: { in: ["published", "reserved"] } },
      include: { images: true },
      orderBy: { publishedAt: "desc" },
    });
    return rows.map(listingView);
  }
}
