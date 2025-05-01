/*
  Warnings:

  - You are about to drop the column `language_preference` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `theme_preference` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `TemplateAccess` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_TemplateTags` table. If the table is not empty, all the data it contains will be lost.

*/
-- Add search_vector column to Template
ALTER TABLE "Template"
ADD COLUMN "search_vector" tsvector;

-- Add search_vector column to Question
ALTER TABLE "Question"
ADD COLUMN "search_vector" tsvector;

-- Add search_vector column to Comment
ALTER TABLE "Comment"
ADD COLUMN "search_vector" tsvector;

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_form_id_fkey";

-- DropForeignKey
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_question_id_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_template_id_fkey";

-- DropForeignKey
ALTER TABLE "Form" DROP CONSTRAINT "Form_template_id_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_template_id_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_template_id_fkey";

-- DropForeignKey
ALTER TABLE "TemplateAccess" DROP CONSTRAINT "TemplateAccess_template_id_fkey";

-- DropForeignKey
ALTER TABLE "TemplateAccess" DROP CONSTRAINT "TemplateAccess_user_id_fkey";

-- DropForeignKey
ALTER TABLE "_TemplateTags" DROP CONSTRAINT "_TemplateTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_TemplateTags" DROP CONSTRAINT "_TemplateTags_B_fkey";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "fixed" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Template" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "topic" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "language_preference",
DROP COLUMN "theme_preference",
ALTER COLUMN "name" DROP NOT NULL;

-- DropTable
DROP TABLE "TemplateAccess";

-- DropTable
DROP TABLE "_TemplateTags";

-- CreateTable
CREATE TABLE "TemplateTag" (
    "template_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "TemplateTag_pkey" PRIMARY KEY ("template_id","tag_id")
);

-- CreateTable
CREATE TABLE "Access" (
    "template_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Access_pkey" PRIMARY KEY ("template_id","user_id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTag" ADD CONSTRAINT "TemplateTag_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateTag" ADD CONSTRAINT "TemplateTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Access" ADD CONSTRAINT "Access_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Access" ADD CONSTRAINT "Access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
