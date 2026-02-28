-- AlterTable
ALTER TABLE "Mention" ADD COLUMN "buyerIntentScore" INTEGER;

-- CreateIndex
CREATE INDEX "Mention_buyerIntentScore_idx" ON "Mention"("buyerIntentScore");
