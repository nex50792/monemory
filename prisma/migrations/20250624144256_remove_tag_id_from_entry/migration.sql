/*
  Warnings:

  - You are about to drop the column `isGlobal` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `tagId` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `isGlobal` on the `Tag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "isGlobal";

-- AlterTable
ALTER TABLE "Entry" DROP COLUMN "tagId";

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "isGlobal";
