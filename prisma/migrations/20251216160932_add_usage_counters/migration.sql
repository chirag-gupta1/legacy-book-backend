/*
  Warnings:

  - Added the required column `updatedAt` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "generationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "regenerationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "questionIndex" DROP DEFAULT;
