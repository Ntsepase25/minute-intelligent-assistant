-- AlterTable
ALTER TABLE "public"."Recording" ADD COLUMN     "actionItems" JSONB,
ADD COLUMN     "assemblyOperationId" TEXT,
ADD COLUMN     "minutes" TEXT,
ADD COLUMN     "nextMeeting" JSONB,
ADD COLUMN     "summaryData" JSONB,
ADD COLUMN     "title" TEXT;
