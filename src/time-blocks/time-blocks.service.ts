import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { UpdateTimeBlockDto } from './dto/update-time-block.dto';

@Injectable()
export class TimeBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.timeBlock.findMany({
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findByDate(date: string) {
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.timeBlock.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async create(data: CreateTimeBlockDto) {
    const { date, startTime, endTime, reason } = data;

    // Converter data para objeto Date
    const blockDate = new Date(date);
    if (isNaN(blockDate.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    // Converter horário de início
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startDateTime = new Date(blockDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    // Converter horário de fim
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const endDateTime = new Date(blockDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    // Validar que o fim é depois do início
    if (endDateTime <= startDateTime) {
      throw new BadRequestException(
        'A hora de fim deve ser posterior à hora de início',
      );
    }

    return this.prisma.timeBlock.create({
      data: {
        date: blockDate,
        startTime: startDateTime,
        endTime: endDateTime,
        reason,
      },
    });
  }

  async update(id: number, data: UpdateTimeBlockDto) {
    const { date, startTime, endTime, reason } = data;

    // Converter data para objeto Date
    const blockDate = new Date(date);
    if (isNaN(blockDate.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    // Converter horário de início
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startDateTime = new Date(blockDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    // Converter horário de fim
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const endDateTime = new Date(blockDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    // Validar que o fim é depois do início
    if (endDateTime <= startDateTime) {
      throw new BadRequestException(
        'A hora de fim deve ser posterior à hora de início',
      );
    }

    return this.prisma.timeBlock.update({
      where: { id },
      data: {
        date: blockDate,
        startTime: startDateTime,
        endTime: endDateTime,
        reason,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.timeBlock.delete({
      where: { id },
    });
  }
}
