import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { SingleFileUpload, toIncoming, type UploadedFileData } from "../../../../shared/presentation/http/uploaded-file";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../../identity/application/ports/access-token-issuer";
import { CurrentUser } from "../../../identity/presentation/http/decorators/current-user.decorator";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { OptionalAuthGuard } from "../../../identity/presentation/http/guards/optional-auth.guard";
import { ListingsService } from "../../application/listings.service";
import {
  listingDraftSchema,
  listingSearchSchema,
  listingStatusSchema,
  type ListingDraftBody,
  type ListingStatusBody,
} from "./listings.schemas";

@ApiTags("Anúncios")
@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  @ApiOperation({ summary: "Pesquisar anúncios públicos" })
  search(@Query() query: Record<string, string | undefined>) {
    const parsed = listingSearchSchema.safeParse(query);
    return this.listings.search(parsed.success ? parsed.data : {});
  }

  @Get("mine")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Anúncios da conta atual, em qualquer estado" })
  mine(@CurrentUser() account: AccessTokenClaims) {
    return this.listings.listMine(account.sub);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Criar anúncio (rascunho ou publicado)" })
  @ApiZodBody(listingDraftSchema)
  create(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(listingDraftSchema)) body: ListingDraftBody,
  ) {
    return this.listings.create(account.sub, body);
  }

  @Post("images")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(SingleFileUpload(8_388_608))
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] } })
  @ApiOperation({ summary: "Carregar uma fotografia do anúncio" })
  upload(@CurrentUser() account: AccessTokenClaims, @UploadedFile() file?: UploadedFileData) {
    return this.listings.uploadImage(account.sub, toIncoming(file));
  }

  @Get("slug/:slug")
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obter anúncio pelo endereço público" })
  bySlug(@CurrentUser() account: AccessTokenClaims | undefined, @Param("slug") slug: string) {
    return this.listings.getBySlug(slug, account?.sub, account?.role === "ADMIN");
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obter anúncio pelo identificador" })
  byId(@CurrentUser() account: AccessTokenClaims | undefined, @Param("id") id: string) {
    return this.listings.getById(id, account?.sub, account?.role === "ADMIN");
  }

  @Post(":id/view")
  @UseGuards(OptionalAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: "Registar uma visualização pública" })
  view(@CurrentUser() account: AccessTokenClaims | undefined, @Param("id") id: string) {
    return this.listings.registerView(id, account?.sub);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Atualizar o conteúdo do próprio anúncio" })
  @ApiZodBody(listingDraftSchema)
  update(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(listingDraftSchema)) body: ListingDraftBody,
  ) {
    return this.listings.update(account.sub, id, body);
  }

  @Post(":id/status")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Alterar o estado do próprio anúncio" })
  @ApiZodBody(listingStatusSchema)
  changeStatus(
    @CurrentUser() account: AccessTokenClaims,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(listingStatusSchema)) body: ListingStatusBody,
  ) {
    return this.listings.changeStatus(account.sub, id, body.status);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "Eliminar o próprio anúncio" })
  remove(@CurrentUser() account: AccessTokenClaims, @Param("id") id: string) {
    return this.listings.remove(account.sub, id);
  }
}
