import { Injectable } from "@nestjs/common";

import { Clock } from "../../../shared/domain/clock";
import { PrismaService } from "../../../shared/infrastructure/database/prisma.service";
import { InvalidStateError, NotFoundError } from "../domain/errors";
import { listingView } from "./views";

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async listAll() {
    const rows = await this.prisma.listing.findMany({ include: { images: true }, orderBy: { createdAt: "desc" } });
    return rows.map(listingView);
  }

  async remove(id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id }, include: { images: true } });
    if (!listing) throw new NotFoundError("Anúncio não encontrado.");
    if (listing.status === "removed") throw new InvalidStateError("Este anúncio já foi removido.");
    const updated = await this.prisma.listing.update({
      where: { id },
      data: { status: "removed", updatedAt: this.clock.now() },
      include: { images: true },
    });
    return listingView(updated);
  }
}
