import { Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiZodBody } from "../../../../shared/presentation/http/api-zod";
import { ZodValidationPipe } from "../../../../shared/presentation/http/zod-validation.pipe";
import type { AccessTokenClaims } from "../../application/ports/access-token-issuer";
import { AuthenticateUseCase } from "../../application/use-cases/authenticate.use-case";
import { GetCurrentUserUseCase } from "../../application/use-cases/get-current-user.use-case";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { ConfirmContactVerificationUseCase } from "../../application/use-cases/confirm-contact-verification.use-case";
import { RequestContactVerificationUseCase } from "../../application/use-cases/request-contact-verification.use-case";
import { UpdateProfileUseCase } from "../../application/use-cases/update-profile.use-case";
import { UploadAvatarUseCase } from "../../application/use-cases/upload-avatar.use-case";
import { SingleFileUpload, toIncoming, type UploadedFileData } from "../../../../shared/presentation/http/uploaded-file";
import {
  confirmContactSchema,
  registerSchema,
  signInSchema,
  updateProfileSchema,
  type ConfirmContactBody,
  type RegisterBody,
  type SignInBody,
  type UpdateProfileBody,
} from "./auth.schemas";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthGuard } from "./guards/auth.guard";

@ApiTags("Identidade")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authenticate: AuthenticateUseCase,
    private readonly register: RegisterUseCase,
    private readonly me: GetCurrentUserUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly requestContact: RequestContactVerificationUseCase,
    private readonly confirmContact: ConfirmContactVerificationUseCase,
    private readonly uploadAvatar: UploadAvatarUseCase,
  ) {}

  @Post("sign-in")
  @ApiOperation({ summary: "Entrar com email e palavra-passe" })
  @ApiZodBody(signInSchema, { email: "admin@passa.ao", password: "admin2026" })
  signIn(@Body(new ZodValidationPipe(signInSchema)) body: SignInBody) {
    return this.authenticate.execute(body);
  }

  @Post("register")
  @ApiOperation({ summary: "Criar conta (exige convite enquanto o beta estiver fechado)" })
  @ApiZodBody(registerSchema)
  createAccount(@Body(new ZodValidationPipe(registerSchema)) body: RegisterBody) {
    return this.register.execute(body);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Conta da sessão atual" })
  current(@CurrentUser() account: AccessTokenClaims) {
    return this.me.execute(account.sub);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Atualizar o perfil público" })
  @ApiZodBody(updateProfileSchema)
  saveProfile(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileBody,
  ) {
    return this.updateProfile.execute({ userId: account.sub, ...body });
  }

  @Post("me/avatar")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(SingleFileUpload())
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] } })
  @ApiOperation({ summary: "Alterar a fotografia de perfil" })
  saveAvatar(@CurrentUser() account: AccessTokenClaims, @UploadedFile() file?: UploadedFileData) {
    return this.uploadAvatar.execute({ userId: account.sub, file: toIncoming(file) });
  }

  @Post("me/verification-code")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Enviar código de confirmação do telemóvel para o email da conta" })
  requestVerification(@CurrentUser() account: AccessTokenClaims) {
    return this.requestContact.execute(account.sub);
  }

  @Post("me/verification-confirm")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirmar o telemóvel com o código recebido por email" })
  @ApiZodBody(confirmContactSchema)
  confirmVerification(
    @CurrentUser() account: AccessTokenClaims,
    @Body(new ZodValidationPipe(confirmContactSchema)) body: ConfirmContactBody,
  ) {
    return this.confirmContact.execute({ userId: account.sub, code: body.code });
  }
}
