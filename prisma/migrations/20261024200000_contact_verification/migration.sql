-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone_verified_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "contact_verifications" (
    "user_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_verifications_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "contact_verifications" ADD CONSTRAINT "contact_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
