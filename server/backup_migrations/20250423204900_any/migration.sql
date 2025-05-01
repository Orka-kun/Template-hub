/*
  Warnings:

  - You are about to drop the column `search_vector` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `search_vector` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `search_vector` on the `Template` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "search_vector";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "search_vector";

-- AlterTable
ALTER TABLE "Template" DROP COLUMN "search_vector";
