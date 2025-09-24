-- CreateTable
CREATE TABLE "public"."recording" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "participants" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recording_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."recording" ADD CONSTRAINT "recording_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
