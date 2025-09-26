/*
  Warnings:

  - You are about to drop the column `meetingPlatfom` on the `Recording` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Recording" DROP COLUMN "meetingPlatfom",
ADD COLUMN     "meetingPlatform" TEXT;
