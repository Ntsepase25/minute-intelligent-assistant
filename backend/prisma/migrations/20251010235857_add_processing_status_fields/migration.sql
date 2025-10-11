-- AlterTable
ALTER TABLE "public"."Recording" ADD COLUMN     "summaryStatus" TEXT DEFAULT 'pending',
ADD COLUMN     "transcriptionStatus" TEXT DEFAULT 'pending';
