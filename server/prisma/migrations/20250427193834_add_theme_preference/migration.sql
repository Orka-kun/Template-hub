/*
  Warnings:

  - You are about to drop the column `content` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Form` table. All the data in the column will be lost.
  - The primary key for the `Like` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Like` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Template` table. All the data in the column will be lost.
  - The primary key for the `TemplateTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `TemplateTag` table. All the data in the column will be lost.
  - You are about to drop the `Access` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Form` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Like` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TemplateTag` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Access" DROP CONSTRAINT "Access_template_id_fkey";

-- DropForeignKey
ALTER TABLE "Access" DROP CONSTRAINT "Access_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_form_id_fkey";

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_question_id_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_template_id_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Form" DROP CONSTRAINT "Form_template_id_fkey";

-- DropForeignKey
ALTER TABLE "Form" DROP CONSTRAINT "Form_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_template_id_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_template_id_fkey";

-- DropForeignKey
ALTER TABLE "TemplateTag" DROP CONSTRAINT "TemplateTag_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "TemplateTag" DROP CONSTRAINT "TemplateTag_template_id_fkey";

-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "content",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "value" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Form" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Like" DROP CONSTRAINT "Like_pkey",
DROP COLUMN "id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "Like_pkey" PRIMARY KEY ("template_id", "user_id");

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "content",
DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "order" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Template" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TemplateTag" DROP CONSTRAINT "TemplateTag_pkey",
DROP COLUMN "id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "TemplateTag_pkey" PRIMARY KEY ("template_id", "tag_id");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "language_preference" TEXT DEFAULT 'en',
ADD COLUMN     "theme_preference" TEXT DEFAULT 'light',
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "Access";

-- CreateTable
CREATE TABLE "TemplateAccess" (
    "template_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateAccess_pkey" PRIMARY KEY ("template_id","user_id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTag" ADD CONSTRAINT "TemplateTag_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTag" ADD CONSTRAINT "TemplateTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateAccess" ADD CONSTRAINT "TemplateAccess_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateAccess" ADD CONSTRAINT "TemplateAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
