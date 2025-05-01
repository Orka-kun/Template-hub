-- Add search_vector column to Template
ALTER TABLE "Template"
ADD COLUMN "search_vector" tsvector;

-- Add search_vector column to Question
ALTER TABLE "Question"
ADD COLUMN "search_vector" tsvector;

-- Add search_vector column to Comment
ALTER TABLE "Comment"
ADD COLUMN "search_vector" tsvector;
