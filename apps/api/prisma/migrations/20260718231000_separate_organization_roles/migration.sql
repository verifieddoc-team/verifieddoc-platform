-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('ORGANIZATION_ADMIN', 'ORGANIZATION_ISSUER');

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN "role_new" "OrganizationRole";

UPDATE "OrganizationMember"
SET "role_new" = CASE "role"::text
  WHEN 'ORGANIZATION_ADMIN' THEN 'ORGANIZATION_ADMIN'::"OrganizationRole"
  WHEN 'ORGANIZATION_ISSUER' THEN 'ORGANIZATION_ISSUER'::"OrganizationRole"
  ELSE NULL
END;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "OrganizationMember" WHERE "role_new" IS NULL) THEN
    RAISE EXCEPTION 'Invalid OrganizationMember.role value found during migration';
  END IF;
END $$;

ALTER TABLE "OrganizationMember" DROP COLUMN "role";
ALTER TABLE "OrganizationMember" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "OrganizationMember" ALTER COLUMN "role" SET NOT NULL;

-- CreateEnum
CREATE TYPE "PlatformRole_new" AS ENUM ('HOLDER', 'VERIFIER', 'PLATFORM_ADMIN');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "PlatformRole_new" USING (
  CASE "role"::text
    WHEN 'HOLDER' THEN 'HOLDER'::"PlatformRole_new"
    WHEN 'VERIFIER' THEN 'VERIFIER'::"PlatformRole_new"
    WHEN 'PLATFORM_ADMIN' THEN 'PLATFORM_ADMIN'::"PlatformRole_new"
    ELSE NULL
  END
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE "role" IS NULL) THEN
    RAISE EXCEPTION 'Invalid User.role value found during PlatformRole migration';
  END IF;
END $$;

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'HOLDER';

DROP TYPE "PlatformRole";
ALTER TYPE "PlatformRole_new" RENAME TO "PlatformRole";
