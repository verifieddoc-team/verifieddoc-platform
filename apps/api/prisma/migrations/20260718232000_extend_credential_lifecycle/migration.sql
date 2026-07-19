-- AlterTable
ALTER TABLE "Credential" ADD COLUMN "revokedById" TEXT,
ADD COLUMN "revocationReason" TEXT;

-- CreateIndex
CREATE INDEX "Credential_organizationId_status_idx" ON "Credential"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Credential_holderId_issuedAt_idx" ON "Credential"("holderId", "issuedAt");

-- CreateIndex
CREATE INDEX "Credential_organizationId_issuedAt_idx" ON "Credential"("organizationId", "issuedAt");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
