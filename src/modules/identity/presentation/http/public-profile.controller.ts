import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "../../../../shared/infrastructure/database/prisma.service";
import { listingView } from "../../../admin/application/views";
import { AccountNotFoundError } from "../../domain/errors";
import { UserRepository } from "../../domain/repositories";

/**
 * Anúncios públicos de um perfil. O próprio perfil (GET /users/:id), com avaliações,
 * gostos e "visto por último", vive no módulo `profiles`.
 */
@ApiTags("Perfis")
@Controller("users")
export class PublicProfileController {
  constructor(
    private readonly users: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

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
