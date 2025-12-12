/*
  Warnings:

  - Made the column `tags` on table `Answer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Answer" ALTER COLUMN "tags" SET NOT NULL;
