-- Signup email verification support.
-- Compatibility: backfill existing users as verified (emailVerifiedAt = createdAt)
-- so production accounts are not locked out. New registrations leave the column NULL
-- until OTP verification succeeds.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Backfill existing rows as verified using their original creation time.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;

-- CreateTable
CREATE TABLE "EmailVerificationChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "requestedIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_userId_createdAt_idx" ON "EmailVerificationChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_expiresAt_idx" ON "EmailVerificationChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationChallenge_resendAvailableAt_idx" ON "EmailVerificationChallenge"("resendAvailableAt");

-- AddForeignKey
ALTER TABLE "EmailVerificationChallenge" ADD CONSTRAINT "EmailVerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
