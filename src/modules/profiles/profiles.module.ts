import { Module } from "@nestjs/common";

import { Clock } from "../../shared/domain/clock";
import { IdGenerator } from "../../shared/domain/id-generator";
import { provideUseCase } from "../../shared/infrastructure/provide";
import { UserRepository } from "../identity/domain/repositories";
import { CreateProfileReviewUseCase } from "./application/use-cases/create-profile-review.use-case";
import { GetProfileStatsUseCase } from "./application/use-cases/get-profile-stats.use-case";
import { GetPublicProfileUseCase } from "./application/use-cases/get-public-profile.use-case";
import { LikeProfileUseCase, UnlikeProfileUseCase } from "./application/use-cases/like-profile.use-case";
import { ListProfileReviewsUseCase } from "./application/use-cases/list-profile-reviews.use-case";
import { RecordProfileViewUseCase } from "./application/use-cases/record-profile-view.use-case";
import {
  ProfileLikeRepository,
  ProfileListingCatalog,
  ProfileReviewRepository,
  ProfileViewRepository,
} from "./domain/repositories";
import {
  PrismaProfileLikeRepository,
  PrismaProfileListingCatalog,
  PrismaProfileReviewRepository,
  PrismaProfileViewRepository,
} from "./infrastructure/prisma-profile.repositories";
import { MyProfileStatsController } from "./presentation/http/my-profile-stats.controller";
import { ProfilesController } from "./presentation/http/profiles.controller";

/** Perfil público e sinais sociais: avaliações, gostos e visitas. */
@Module({
  controllers: [ProfilesController, MyProfileStatsController],
  providers: [
    { provide: ProfileReviewRepository, useClass: PrismaProfileReviewRepository },
    { provide: ProfileLikeRepository, useClass: PrismaProfileLikeRepository },
    { provide: ProfileViewRepository, useClass: PrismaProfileViewRepository },
    { provide: ProfileListingCatalog, useClass: PrismaProfileListingCatalog },
    provideUseCase(GetPublicProfileUseCase, [UserRepository, ProfileReviewRepository, ProfileLikeRepository, ProfileListingCatalog]),
    provideUseCase(ListProfileReviewsUseCase, [UserRepository, ProfileReviewRepository]),
    provideUseCase(CreateProfileReviewUseCase, [UserRepository, ProfileReviewRepository, Clock, IdGenerator]),
    provideUseCase(LikeProfileUseCase, [UserRepository, ProfileLikeRepository, Clock]),
    provideUseCase(UnlikeProfileUseCase, [UserRepository, ProfileLikeRepository]),
    provideUseCase(RecordProfileViewUseCase, [UserRepository, ProfileViewRepository, Clock]),
    provideUseCase(GetProfileStatsUseCase, [ProfileViewRepository, ProfileLikeRepository, ProfileReviewRepository, Clock]),
  ],
})
export class ProfilesModule {}
