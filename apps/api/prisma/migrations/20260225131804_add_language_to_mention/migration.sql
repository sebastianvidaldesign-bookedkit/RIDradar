-- AlterTable
ALTER TABLE "Mention" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
CREATE INDEX "Mention_language_idx" ON "Mention"("language");
