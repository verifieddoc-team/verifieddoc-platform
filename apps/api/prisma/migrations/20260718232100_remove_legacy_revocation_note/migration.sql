UPDATE "Credential"
SET "revocationReason" = "revocationNote"
WHERE "revocationReason" IS NULL
  AND "revocationNote" IS NOT NULL;

ALTER TABLE "Credential" DROP COLUMN "revocationNote";
