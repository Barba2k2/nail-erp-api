import { Service } from '@prisma/client';

export interface TimeSlot {
  time: string;
  formattedTime: string;
  duration: number;
  service: Service | null;
}
