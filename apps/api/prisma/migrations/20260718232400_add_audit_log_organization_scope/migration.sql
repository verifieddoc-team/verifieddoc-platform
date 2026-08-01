-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Backfill organization-scoped audit logs
UPDATE "AuditLog"
SET "organizationId" = "resourceId"
WHERE "resourceType" = 'Organization'
  AND "resourceId" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "Organization" AS o
    WHERE o."id" = "AuditLog"."resourceId"
  );

UPDATE "AuditLog" AS al
SET "organizationId" = c."organizationId"
FROM "Credential" AS c
WHERE al."resourceType" = 'Credential'
  AND al."resourceId" = c."id";

UPDATE "AuditLog" AS al
SET "organizationId" = oi."organizationId"
FROM "OrganizationInvitation" AS oi
WHERE al."resourceType" = 'OrganizationInvitation'
  AND al."resourceId" = oi."id";

UPDATE "AuditLog" AS al
SET "organizationId" = c."organizationId"
FROM "ShareLink" AS sl
JOIN "Credential" AS c ON c."id" = sl."credentialId"
WHERE al."resourceType" = 'ShareLink'
  AND al."resourceId" = sl."id";

UPDATE "AuditLog"
SET "organizationId" = "details"->>'organizationId'
WHERE "resourceType" = 'OrganizationMember'
  AND "details" IS NOT NULL
  AND jsonb_typeof("details"::jsonb) = 'object'
  AND ("details"->>'organizationId') IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "Organization" AS o
    WHERE o."id" = "details"->>'organizationId'
  );

UPDATE "AuditLog"
SET "organizationId" = NULL
WHERE "organizationId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Organization" AS o
    WHERE o."id" = "AuditLog"."organizationId"
  );

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AuditLog_organizationId_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
