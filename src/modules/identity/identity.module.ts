import { forwardRef, Global, Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";

import { BetaModule } from "../beta/beta.module";

import { AppConfig } from "../../config/app-config";
import { BetaAccessPolicy } from "../../shared/application/beta-access-policy";
import { Clock } from "../../shared/domain/clock";
import { IdGenerator } from "../../shared/domain/id-generator";
import { provideUseCase } from "../../shared/infrastructure/provide";
import { AccessTokenIssuer } from "./application/ports/access-token-issuer";
import { AuthenticateUseCase } from "./application/use-cases/authenticate.use-case";
import { GetCurrentUserUseCase } from "./application/use-cases/get-current-user.use-case";
import { RegisterUseCase } from "./application/use-cases/register.use-case";
import { ConfirmContactVerificationUseCase } from "./application/use-cases/confirm-contact-verification.use-case";
import { RequestContactVerificationUseCase } from "./application/use-cases/request-contact-verification.use-case";
import { UpdateProfileUseCase } from "./application/use-cases/update-profile.use-case";
import { UploadAvatarUseCase } from "./application/use-cases/upload-avatar.use-case";
import { FileStorage } from "../../shared/application/file-storage";
import { VerifiedAccountNotifier } from "./application/verified-account-notifier";
import { MailService } from "../mail/application/mail.service";
import { OutboundNotifications } from "../mail/application/outbound-notifications";
import { MailModule } from "../mail/mail.module";
import { ContactVerificationRepository, PasswordHasher, UserRepository } from "./domain/repositories";
import { BcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher";
import { JwtAccessTokenIssuer } from "./infrastructure/jwt-access-token.issuer";
import { PrismaContactVerificationRepository } from "./infrastructure/prisma-contact-verification.repository";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository";
import { AuthController } from "./presentation/http/auth.controller";
import { PublicProfileController } from "./presentation/http/public-profile.controller";
import { AdminGuard } from "./presentation/http/guards/admin.guard";
import { AuthGuard } from "./presentation/http/guards/auth.guard";
import { OptionalAuthGuard } from "./presentation/http/guards/optional-auth.guard";

@Global()
@Module({
  imports: [
    MailModule,
    forwardRef(() => BetaModule),
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtAccessSecret,
        signOptions: { algorithm: "HS256" },
        verifyOptions: { algorithms: ["HS256"] },
      }),
    }),
  ],
  controllers: [AuthController, PublicProfileController],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: ContactVerificationRepository, useClass: PrismaContactVerificationRepository },
    { provide: PasswordHasher, useFactory: () => new BcryptPasswordHasher() },
    {
      provide: AccessTokenIssuer,
      inject: [JwtService, AppConfig],
      useFactory: (jwt: JwtService, config: AppConfig) =>
        new JwtAccessTokenIssuer(jwt, config.jwtAccessTtlSeconds),
    },
    {
      provide: AuthenticateUseCase,
      inject: [UserRepository, PasswordHasher, AccessTokenIssuer, AppConfig],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: AccessTokenIssuer,
        config: AppConfig,
      ) => new AuthenticateUseCase(users, hasher, tokens, config.jwtAccessTtlSeconds),
    },
    {
      provide: RegisterUseCase,
      inject: [UserRepository, PasswordHasher, AccessTokenIssuer, BetaAccessPolicy, Clock, IdGenerator, AppConfig],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: AccessTokenIssuer,
        beta: BetaAccessPolicy,
        clock: Clock,
        ids: IdGenerator,
        config: AppConfig,
      ) => new RegisterUseCase(users, hasher, tokens, beta, clock, ids, config.jwtAccessTtlSeconds),
    },
    VerifiedAccountNotifier,
    provideUseCase(GetCurrentUserUseCase, [UserRepository]),
    provideUseCase(UpdateProfileUseCase, [UserRepository, VerifiedAccountNotifier]),
    provideUseCase(UploadAvatarUseCase, [UserRepository, FileStorage, AppConfig]),
    provideUseCase(RequestContactVerificationUseCase, [UserRepository, ContactVerificationRepository, MailService, Clock]),
    provideUseCase(ConfirmContactVerificationUseCase, [UserRepository, ContactVerificationRepository, Clock, OutboundNotifications, VerifiedAccountNotifier]),
    AuthGuard,
    OptionalAuthGuard,
    AdminGuard,
  ],
  exports: [AuthGuard, OptionalAuthGuard, AdminGuard, AccessTokenIssuer, UserRepository],
})
export class IdentityModule {}
