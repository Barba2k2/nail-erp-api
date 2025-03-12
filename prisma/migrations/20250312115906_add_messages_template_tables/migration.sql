-- CreateEnum
CREATE TYPE "MessageTemplateType" AS ENUM ('EMAIL', 'WHATSAPP', 'BOTH');

-- CreateEnum
CREATE TYPE "MessageTemplatePurpose" AS ENUM ('MARKETING', 'BIRTHDAY', 'LOYALTY', 'ABANDONED_CART', 'WELCOME', 'PASSWORD_RECOVERY', 'CUSTOM');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_RECOVERY';

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageTemplateType" NOT NULL,
    "purpose" "MessageTemplatePurpose" NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" INTEGER,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "subdomain" TEXT NOT NULL,
    "businessId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_purpose_isDefault_key" ON "MessageTemplate"("purpose", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_businessId_key" ON "Tenant"("businessId");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
