-- CreateTable
CREATE TABLE "Mention" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB,
    "status" TEXT NOT NULL DEFAULT 'new',
    "score" INTEGER NOT NULL DEFAULT 0,
    "relevant" BOOLEAN NOT NULL DEFAULT false,
    "intent" TEXT,
    "audience" TEXT,
    "urgency" TEXT,
    "reason" TEXT,
    "digestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplyDraft" (
    "id" TEXT NOT NULL,
    "mentionId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplyDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mention_externalId_key" ON "Mention"("externalId");

-- CreateIndex
CREATE INDEX "Mention_status_idx" ON "Mention"("status");

-- CreateIndex
CREATE INDEX "Mention_relevant_score_idx" ON "Mention"("relevant", "score");

-- CreateIndex
CREATE INDEX "Mention_platform_idx" ON "Mention"("platform");

-- CreateIndex
CREATE INDEX "Mention_fetchedAt_idx" ON "Mention"("fetchedAt");

-- CreateIndex
CREATE INDEX "Mention_digestedAt_idx" ON "Mention"("digestedAt");

-- CreateIndex
CREATE INDEX "ReplyDraft_mentionId_idx" ON "ReplyDraft"("mentionId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_type_value_key" ON "Source"("type", "value");

-- AddForeignKey
ALTER TABLE "ReplyDraft" ADD CONSTRAINT "ReplyDraft_mentionId_fkey" FOREIGN KEY ("mentionId") REFERENCES "Mention"("id") ON DELETE CASCADE ON UPDATE CASCADE;
