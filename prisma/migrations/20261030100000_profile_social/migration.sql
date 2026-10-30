-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_seen_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "profile_reviews" (
    "id" UUID NOT NULL,
    "profile_user_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_likes" (
    "profile_user_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_likes_pkey" PRIMARY KEY ("profile_user_id","user_id")
);

-- CreateTable
CREATE TABLE "profile_daily_stats" (
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "profile_daily_stats_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateTable
CREATE TABLE "profile_viewers" (
    "user_id" UUID NOT NULL,
    "viewer_key" VARCHAR(64) NOT NULL,
    "day" DATE NOT NULL,
    "first_seen" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_viewers_pkey" PRIMARY KEY ("user_id","viewer_key","day")
);

-- CreateIndex
CREATE INDEX "profile_reviews_profile" ON "profile_reviews"("profile_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_reviews_profile_author" ON "profile_reviews"("profile_user_id", "author_id");

-- CreateIndex
CREATE INDEX "profile_viewers_user_day" ON "profile_viewers"("user_id", "day");

-- AddForeignKey
ALTER TABLE "profile_reviews" ADD CONSTRAINT "profile_reviews_profile_user_id_fkey" FOREIGN KEY ("profile_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_reviews" ADD CONSTRAINT "profile_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_likes" ADD CONSTRAINT "profile_likes_profile_user_id_fkey" FOREIGN KEY ("profile_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_likes" ADD CONSTRAINT "profile_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_daily_stats" ADD CONSTRAINT "profile_daily_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_viewers" ADD CONSTRAINT "profile_viewers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

