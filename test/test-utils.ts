import { PrismaService } from 'src/prisma/prisma.service';

export async function cleanupDatabase(prisma: PrismaService) {
  try {
    await prisma.appointment
      .deleteMany()
      .catch((e) => console.log('Error deleting appointments:', e.message));
    await prisma.timeBlock
      .deleteMany()
      .catch((e) => console.log('Error deleting timeBlocks:', e.message));
    await prisma.businessSettings
      .deleteMany()
      .catch((e) => console.log('Error deleting businessSettings:', e.message));
    await prisma.specialBusinessDay
      .deleteMany()
      .catch((e) =>
        console.log('Error deleting specialBusinessDays:', e.message),
      );
    await prisma.service
      .deleteMany()
      .catch((e) => console.log('Error deleting services:', e.message));
    await prisma.user
      .deleteMany()
      .catch((e) => console.log('Error deleting users:', e.message));

    console.log('Database cleaned successfully');
  } catch (error) {
    console.error('Error cleaning database:', error);
  }
}

export function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}@test.com`;
}
