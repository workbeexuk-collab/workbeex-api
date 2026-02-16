-- CreateEnum
CREATE TYPE "AddressVerificationStatus" AS ENUM ('PENDING', 'SENT', 'VERIFIED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "SocialProvider" ADD VALUE 'LINKEDIN';

-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN     "accountCreatedAt" TIMESTAMP(3),
ADD COLUMN     "connectionsCount" INTEGER,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "followersCount" INTEGER,
ADD COLUMN     "isVerified" BOOLEAN,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "picture" TEXT,
ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "addressVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overallTrustScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phoneIsVoip" BOOLEAN,
ADD COLUMN     "postcode" TEXT,
ADD COLUMN     "registrationStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "socialTrustScore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PhoneVerification" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "AddressVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneVerification_phone_idx" ON "PhoneVerification"("phone");

-- CreateIndex
CREATE INDEX "PhoneVerification_expiresAt_idx" ON "PhoneVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "AddressVerification_userId_idx" ON "AddressVerification"("userId");

-- CreateIndex
CREATE INDEX "AddressVerification_code_idx" ON "AddressVerification"("code");
