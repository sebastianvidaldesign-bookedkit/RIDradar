-- AlterTable
ALTER TABLE "Mention" ADD COLUMN     "campaignIdea" TEXT,
ADD COLUMN     "classification" TEXT,
ADD COLUMN     "matchedTerms" JSONB,
ADD COLUMN     "whyMatched" TEXT;

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "pack" TEXT;

-- CreateIndex
CREATE INDEX "Mention_classification_idx" ON "Mention"("classification");

-- CreateIndex
CREATE INDEX "Source_pack_idx" ON "Source"("pack");
