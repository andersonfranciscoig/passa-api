-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('invited', 'accepted', 'revoked');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "province" TEXT,
    "municipality" TEXT,
    "neighborhood" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "answers" JSONB NOT NULL,
    "beta_consent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_settings" (
    "id" BOOLEAN NOT NULL DEFAULT true,
    "closed_beta" BOOLEAN NOT NULL DEFAULT true,
    "opened_at" TIMESTAMPTZ(3),
    "opened_by" UUID,

    CONSTRAINT "beta_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_invites" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "response_id" UUID,
    "status" "InviteStatus" NOT NULL DEFAULT 'invited',
    "invited_by" UUID NOT NULL,
    "invited_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_user_id" UUID,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "beta_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_email_key" ON "survey_responses"("email");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_phone_key" ON "survey_responses"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "beta_invites_response_id_key" ON "beta_invites"("response_id");

-- CreateIndex
CREATE UNIQUE INDEX "beta_invites_accepted_user_id_key" ON "beta_invites"("accepted_user_id");

-- AddForeignKey
ALTER TABLE "beta_invites" ADD CONSTRAINT "beta_invites_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beta_invites" ADD CONSTRAINT "beta_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beta_invites" ADD CONSTRAINT "beta_invites_accepted_user_id_fkey" FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
