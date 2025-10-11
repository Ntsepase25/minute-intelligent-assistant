import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const records = await prisma.recording.findMany({
  take: 3,
  orderBy: { createdAt: 'desc' },
  select: { 
    id: true, 
    title: true, 
    transcriptionStatus: true, 
    summaryStatus: true,
    createdAt: true
  }
});

console.log('📊 Latest recordings from database:');
records.forEach(r => {
  console.log({
    id: r.id.substring(0, 8),
    title: r.title,
    transcriptionStatus: r.transcriptionStatus,
    summaryStatus: r.summaryStatus,
    createdAt: r.createdAt
  });
});

await prisma.$disconnect();
