import { PrismaService } from '../src/prisma/prisma.service';

export async function cleanupDatabase(prisma: PrismaService) {
  try {
    await prisma.appointment.deleteMany();
    await prisma.timeBlock.deleteMany().catch(() => {});
    await prisma.businessSettings.deleteMany().catch(() => {});
    await prisma.specialBusinessDay.deleteMany().catch(() => {});
    await prisma.service.deleteMany();

    await prisma.user.deleteMany();
    console.log('Database cleaned successfully');
  } catch (error) {
    console.error('Error cleaning database:', error);
  }
}

export function generateUniqueEmail(prefix: string): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}@test.com`;
}
