import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDto } from './appointments/dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './appointments/dto/reschedule-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.appointment.findMany({
      include: {
        user: true,
        service: true,
      },
    });
  }

  async create(userId: number, data: CreateAppointmentDto) {
    if (!userId || typeof userId !== 'number') {
      throw new BadRequestException('ID de usuário válido é necessário');
    }

    // Combina a data e horário em um único objeto Date
    const combinedDate = this.combineDateAndTime(
      data.appointmentDate,
      data.appointmentTime,
    );

    return this.prisma.appointment.create({
      data: {
        date: combinedDate,
        status: data.status || AppointmentStatus.SCHEDULED,
        notes: data.notes,
        user: {
          connect: { id: userId },
        },
        service: {
          connect: { id: data.serviceId },
        },
      },
      include: {
        service: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: true,
        service: true,
      },
    });
  }

  async reschedule(id: number, data: RescheduleAppointmentDto) {
    // Combina a data e horário em um único objeto Date
    const combinedDate = this.combineDateAndTime(
      data.appointmentDate,
      data.appointmentTime,
    );

    return this.prisma.appointment.update({
      where: { id },
      data: {
        date: combinedDate,
        status: data.status || AppointmentStatus.RESCHEDULED,
      },
    });
  }

  async cancel(id: number) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
      },
    });
  }

  // Função auxiliar para combinar data e hora em um objeto Date
  private combineDateAndTime(dateStr: string, timeStr: string): Date {
    try {
      // Formato esperado: dateStr = "YYYY-MM-DD", timeStr = "HH:MM"
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);

      // Cria um novo objeto Date (mês em JS é 0-indexado, então subtraímos 1)
      const date = new Date(year, month - 1, day, hours, minutes);

      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Data ou horário inválido');
      }

      return date;
    } catch (error) {
      throw new BadRequestException('Erro ao processar data e horário');
    }
  }
}
