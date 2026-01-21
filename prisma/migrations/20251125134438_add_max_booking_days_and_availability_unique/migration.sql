/*
  Warnings:

  - A unique constraint covering the columns `[providerId,weekday]` on the table `ProviderAvailability` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxBookingDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cancelBookingHours" INTEGER NOT NULL DEFAULT 2;

-- CreateIndex
CREATE INDEX "Appointment_providerId_date_idx" ON "Appointment"("providerId", "date");

-- CreateIndex
CREATE INDEX "Appointment_customerId_date_idx" ON "Appointment"("customerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderAvailability_providerId_weekday_key" ON "ProviderAvailability"("providerId", "weekday");

-- CreateIndex
CREATE INDEX "ProviderBlock_providerId_startAt_endAt_idx" ON "ProviderBlock"("providerId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Token_userId_type_expiresAt_idx" ON "Token"("userId", "type", "expiresAt");
