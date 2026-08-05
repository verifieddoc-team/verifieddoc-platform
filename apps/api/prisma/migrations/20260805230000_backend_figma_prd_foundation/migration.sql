-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('SHARE_TOKEN', 'QR', 'PUBLIC_ID', 'FILE_HASH');

-- CreateEnum
CREATE TYPE "VerificationOutcome" AS ENUM ('VERIFIED', 'EXPIRED', 'REVOKED', 'INVALID', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "VerificationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrganizationDocumentType" AS ENUM ('REGISTRATION_CERTIFICATE', 'TAX_DOCUMENT', 'ACCREDITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentUploadStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FraudAlertType" AS ENUM ('HIGH_RISK_DOCUMENT', 'MULTIPLE_VERIFICATION_FAILURES', 'REVOKED_CREDENTIAL_ACCESS', 'FILE_HASH_MISMATCH', 'SUSPICIOUS_ACTIVITY');

-- CreateEnum
CREATE TYPE "FraudAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FraudAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CREDENTIAL_ISSUED', 'CREDENTIAL_REVOKED', 'ORGANIZATION_APPROVED', 'ORGANIZATION_REJECTED', 'ORGANIZATION_INVITATION', 'RECIPIENT_INVITATION', 'VERIFICATION_REQUEST_SUBMITTED', 'VERIFICATION_REQUEST_REVIEWED', 'FRAUD_ALERT', 'SHARE_LINK_USED', 'GENERIC');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "hrContactEmail" TEXT,
ADD COLUMN     "hrContactName" TEXT,
ADD COLUMN     "hrContactPhone" TEXT,
ADD COLUMN     "industry" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fullName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "privacyVersion" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedById" TEXT,
ADD COLUMN     "suspendedReason" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- Backfill canonical display names for existing users
UPDATE "User"
SET "fullName" = TRIM(BOTH FROM CONCAT_WS(' ', NULLIF(TRIM("firstName"), ''), NULLIF(TRIM("lastName"), '')))
WHERE "fullName" = '' OR "fullName" IS NULL;

-- CreateTable
CREATE TABLE "PasswordResetChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "resetTokenHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "requestedIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRecipient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipientInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "activeKey" TEXT,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "revokedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipientInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationEvent" (
    "id" TEXT NOT NULL,
    "verifierId" TEXT,
    "credentialId" TEXT,
    "organizationId" TEXT,
    "shareLinkId" TEXT,
    "verificationRequestId" TEXT,
    "method" "VerificationMethod" NOT NULL,
    "result" "VerificationOutcome" NOT NULL,
    "credentialPublicIdSnapshot" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "VerificationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requesterNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedOrganization" (
    "id" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "OrganizationDocumentType" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksumSha256" TEXT,
    "status" "DocumentUploadStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "uploadedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialArtifact" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalDocument" (
    "id" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksumSha256" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationUpload" (
    "id" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudAlert" (
    "id" TEXT NOT NULL,
    "type" "FraudAlertType" NOT NULL,
    "severity" "FraudAlertSeverity" NOT NULL,
    "status" "FraudAlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "credentialId" TEXT,
    "verificationEventId" TEXT,
    "actorId" TEXT,
    "ipAddress" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetChallenge_resetTokenHash_key" ON "PasswordResetChallenge"("resetTokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetChallenge_userId_createdAt_idx" ON "PasswordResetChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetChallenge_expiresAt_idx" ON "PasswordResetChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "OrganizationRecipient_organizationId_createdAt_idx" ON "OrganizationRecipient"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizationRecipient_userId_idx" ON "OrganizationRecipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRecipient_organizationId_userId_key" ON "OrganizationRecipient"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipientInvitation_tokenHash_key" ON "RecipientInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RecipientInvitation_activeKey_key" ON "RecipientInvitation"("activeKey");

-- CreateIndex
CREATE INDEX "RecipientInvitation_organizationId_createdAt_idx" ON "RecipientInvitation"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "RecipientInvitation_email_idx" ON "RecipientInvitation"("email");

-- CreateIndex
CREATE INDEX "RecipientInvitation_expiresAt_idx" ON "RecipientInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationEvent_verifierId_createdAt_idx" ON "VerificationEvent"("verifierId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationEvent_organizationId_createdAt_idx" ON "VerificationEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationEvent_credentialId_createdAt_idx" ON "VerificationEvent"("credentialId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationEvent_result_createdAt_idx" ON "VerificationEvent"("result", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationEvent_method_createdAt_idx" ON "VerificationEvent"("method", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationEvent_ipAddress_createdAt_idx" ON "VerificationEvent"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_holderId_status_createdAt_idx" ON "VerificationRequest"("holderId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_organizationId_status_createdAt_idx" ON "VerificationRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_requestedById_createdAt_idx" ON "VerificationRequest"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SavedOrganization_verifierId_createdAt_idx" ON "SavedOrganization"("verifierId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedOrganization_verifierId_organizationId_key" ON "SavedOrganization"("verifierId", "organizationId");

-- CreateIndex
CREATE INDEX "OrganizationDocument_organizationId_status_idx" ON "OrganizationDocument"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrganizationDocument_organizationId_createdAt_idx" ON "OrganizationDocument"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CredentialArtifact_credentialId_idx" ON "CredentialArtifact"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "CredentialArtifact_checksumSha256_key" ON "CredentialArtifact"("checksumSha256");

-- CreateIndex
CREATE INDEX "PersonalDocument_holderId_createdAt_idx" ON "PersonalDocument"("holderId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationUpload_verifierId_createdAt_idx" ON "VerificationUpload"("verifierId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationUpload_expiresAt_idx" ON "VerificationUpload"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationUpload_checksumSha256_idx" ON "VerificationUpload"("checksumSha256");

-- CreateIndex
CREATE INDEX "FraudAlert_status_severity_lastSeenAt_idx" ON "FraudAlert"("status", "severity", "lastSeenAt");

-- CreateIndex
CREATE INDEX "FraudAlert_type_status_idx" ON "FraudAlert"("type", "status");

-- CreateIndex
CREATE INDEX "FraudAlert_actorId_lastSeenAt_idx" ON "FraudAlert"("actorId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "FraudAlert_ipAddress_lastSeenAt_idx" ON "FraudAlert"("ipAddress", "lastSeenAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "ShareLink_createdById_createdAt_idx" ON "ShareLink"("createdById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetChallenge" ADD CONSTRAINT "PasswordResetChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRecipient" ADD CONSTRAINT "OrganizationRecipient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRecipient" ADD CONSTRAINT "OrganizationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipientInvitation" ADD CONSTRAINT "RecipientInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipientInvitation" ADD CONSTRAINT "RecipientInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipientInvitation" ADD CONSTRAINT "RecipientInvitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipientInvitation" ADD CONSTRAINT "RecipientInvitation_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationEvent" ADD CONSTRAINT "VerificationEvent_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationEvent" ADD CONSTRAINT "VerificationEvent_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationEvent" ADD CONSTRAINT "VerificationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationEvent" ADD CONSTRAINT "VerificationEvent_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationEvent" ADD CONSTRAINT "VerificationEvent_verificationRequestId_fkey" FOREIGN KEY ("verificationRequestId") REFERENCES "VerificationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedOrganization" ADD CONSTRAINT "SavedOrganization_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedOrganization" ADD CONSTRAINT "SavedOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialArtifact" ADD CONSTRAINT "CredentialArtifact_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialArtifact" ADD CONSTRAINT "CredentialArtifact_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDocument" ADD CONSTRAINT "PersonalDocument_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationUpload" ADD CONSTRAINT "VerificationUpload_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_verificationEventId_fkey" FOREIGN KEY ("verificationEventId") REFERENCES "VerificationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudAlert" ADD CONSTRAINT "FraudAlert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
