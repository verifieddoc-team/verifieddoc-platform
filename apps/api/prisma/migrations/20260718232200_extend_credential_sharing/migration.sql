ALTER TABLE "ShareLink" ADD COLUMN "disclosedClaims" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ShareLink" ADD COLUMN "includeHolderName" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShareLink" ADD COLUMN "includeReferenceNo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShareLink" ADD COLUMN "revokedById" TEXT;
ALTER TABLE "ShareLink" ADD COLUMN "lastViewedAt" TIMESTAMP(3);

CREATE INDEX "ShareLink_credentialId_createdAt_idx" ON "ShareLink"("credentialId", "createdAt");
CREATE INDEX "ShareLink_revokedById_idx" ON "ShareLink"("revokedById");

ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
