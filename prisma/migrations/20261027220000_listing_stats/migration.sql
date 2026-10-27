-- CreateTable
CREATE TABLE "listing_daily_stats" (
    "listing_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "new_viewers" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "unfavorites" INTEGER NOT NULL DEFAULT 0,
    "chats" INTEGER NOT NULL DEFAULT 0,
    "whatsapp" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "sources" JSONB NOT NULL DEFAULT '{}',
    "areas" JSONB NOT NULL DEFAULT '{}',
    "hours" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "listing_daily_stats_pkey" PRIMARY KEY ("listing_id","day")
);

-- CreateTable
CREATE TABLE "listing_viewers" (
    "listing_id" UUID NOT NULL,
    "visitor_id" VARCHAR(64) NOT NULL,
    "first_seen" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_viewers_pkey" PRIMARY KEY ("listing_id","visitor_id")
);

-- CreateIndex
CREATE INDEX "listing_daily_stats_seller" ON "listing_daily_stats"("seller_id", "day");

-- AddForeignKey
ALTER TABLE "listing_daily_stats" ADD CONSTRAINT "listing_daily_stats_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_viewers" ADD CONSTRAINT "listing_viewers_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
