-- This is an empty migration.
ALTER TABLE "Template" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "Question" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "Comment" ADD COLUMN "search_vector" tsvector;