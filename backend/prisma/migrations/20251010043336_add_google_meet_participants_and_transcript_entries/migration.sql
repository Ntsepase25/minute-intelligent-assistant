-- AlterTable
ALTER TABLE "public"."Recording" ADD COLUMN     "googleMeetConferenceId" TEXT,
ADD COLUMN     "googleMeetSpace" TEXT;

-- CreateTable
CREATE TABLE "public"."participants" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "googleParticipantId" TEXT NOT NULL,
    "googleUserId" TEXT,
    "displayName" TEXT,
    "participantType" TEXT NOT NULL,
    "earliestStartTime" TIMESTAMP(3),
    "latestEndTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transcript_entries" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "googleEntryId" TEXT NOT NULL,
    "googleParticipantId" TEXT,
    "text" TEXT NOT NULL,
    "languageCode" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcript_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."participants" ADD CONSTRAINT "participants_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "public"."Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transcript_entries" ADD CONSTRAINT "transcript_entries_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "public"."Recording"("id") ON DELETE CASCADE ON UPDATE CASCADE;
