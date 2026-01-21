-- Repair User booking config columns to match prisma/schema.prisma
-- This migration is safe to run on databases that already have these columns.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxBookingDays" INTEGER;
ALTER TABLE "User" ALTER COLUMN "maxBookingDays" SET DEFAULT 7;
UPDATE "User" SET "maxBookingDays" = 7 WHERE "maxBookingDays" IS NULL;
ALTER TABLE "User" ALTER COLUMN "maxBookingDays" SET NOT NULL;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cancelBookingHours" INTEGER;
ALTER TABLE "User" ALTER COLUMN "cancelBookingHours" SET DEFAULT 2;
UPDATE "User" SET "cancelBookingHours" = 2 WHERE "cancelBookingHours" IS NULL;
ALTER TABLE "User" ALTER COLUMN "cancelBookingHours" SET NOT NULL;
