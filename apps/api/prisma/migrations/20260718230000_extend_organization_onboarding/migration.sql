-- AlterEnum
ALTER TYPE "OrganizationStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "registrationNumber" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT;

UPDATE "Organization"
SET "contactEmail" = 'legacy@example.test',
    "country" = 'Unknown'
WHERE "contactEmail" IS NULL OR "country" IS NULL;

ALTER TABLE "Organization" ALTER COLUMN "contactEmail" SET NOT NULL;
ALTER TABLE "Organization" ALTER COLUMN "country" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE INDEX "Organization_contactEmail_idx" ON "Organization"("contactEmail");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
