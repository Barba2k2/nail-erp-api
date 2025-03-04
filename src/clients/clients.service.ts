import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async updateProfile(userId: number, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async getAppointments(userId: number) {
    return this.prisma.appointment.findMany({
      where: { userId: userId },
      include: { service: true },
    });
  }

  async createAppointment(userId: number | undefined | null, data: any) {
    if (!userId || typeof userId !== 'number') {
      throw new BadRequestException(
        'ID de usuário válido é necessário para criar um agendamento',
      );
    }

    const { appointmentDate, appointmentTime, status, notes, serviceId } = data;

    if (!appointmentDate || !appointmentTime) {
      throw new BadRequestException(
        'Data e hora do agendamento são obrigatórios',
      );
    }

    if (!serviceId) {
      throw new BadRequestException('ID do serviço é obrigatório');
    }

    try {
      const [year, month, day] = appointmentDate.split('-').map(Number);
      const [hours, minutes] = appointmentTime.split(':').map(Number);

      const combinedDate = new Date(year, month - 1, day, hours, minutes);

      if (isNaN(combinedDate.getTime())) {
        throw new BadRequestException('Data ou hora inválida');
      }

      const hasConflict = await this.checkTimeConflict(
        combinedDate,
        +serviceId,
      );
      if (hasConflict) {
        throw new ConflictException(
          'Já existe um agendamento neste horário. Por favor, escolha outro horário.',
        );
      }

      return this.prisma.appointment.create({
        data: {
          date: combinedDate,
          status: status || AppointmentStatus.SCHEDULED,
          notes,
          user: {
            connect: { id: userId },
          },
          service: {
            connect: { id: +serviceId },
          },
        },
        include: {
          service: true,
        },
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Erro ao criar agendamento:', error);
      throw new BadRequestException(
        'Não foi possível criar o agendamento: ' + error.message,
      );
    }
  }

  async rescheduleAppointment(
    appointmentId: number | undefined | null,
    data: any,
  ) {
    if (!appointmentId || typeof appointmentId !== 'number') {
      throw new BadRequestException('ID de agendamento válido é necessário');
    }

    const { appointmentDate, appointmentTime } = data;

    if (!appointmentDate || !appointmentTime) {
      throw new BadRequestException(
        'Data e hora do reagendamento são obrigatórios',
      );
    }

    try {
      const currentAppointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { service: true },
      });

      if (!currentAppointment) {
        throw new BadRequestException('Agendamento não encontrado');
      }

      const [year, month, day] = appointmentDate.split('-').map(Number);
      const [hours, minutes] = appointmentTime.split(':').map(Number);

      const combinedDate = new Date(year, month - 1, day, hours, minutes);

      if (isNaN(combinedDate.getTime())) {
        throw new BadRequestException('Data ou hora inválida');
      }

      const hasConflict = await this.checkTimeConflict(
        combinedDate,
        currentAppointment.serviceId,
        appointmentId,
      );

      if (hasConflict) {
        throw new ConflictException(
          'Já existe um agendamento neste horário. Por favor, escolha outro horário.',
        );
      }

      return this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          date: combinedDate,
          status: AppointmentStatus.RESCHEDULED,
        },
        include: {
          service: true,
        },
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Erro ao reagendar:', error);
      throw new BadRequestException(
        'Não foi possível reagendar: ' + error.message,
      );
    }
  }

  async cancelAppointment(appointmentId: number | undefined | null) {
    if (!appointmentId || typeof appointmentId !== 'number') {
      throw new BadRequestException('ID de agendamento válido é necessário');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELED },
      include: {
        service: true,
      },
    });
  }

  private async checkTimeConflict(
    date: Date,
    serviceId: number,
    excludeAppointmentId?: number,
  ): Promise<boolean> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new BadRequestException('Serviço não encontrado');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointmentsOfDay = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: AppointmentStatus.CANCELED,
        },

        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      include: {
        service: true,
      },
    });

    const newAppointmentStart = date;
    const newAppointmentEnd = new Date(date);
    newAppointmentEnd.setMinutes(
      newAppointmentEnd.getMinutes() + service.duration,
    );

    return appointmentsOfDay.some((appointment) => {
      const existingStart = appointment.date;
      const existingEnd = new Date(appointment.date);
      existingEnd.setMinutes(
        existingEnd.getMinutes() + appointment.service.duration,
      );

      return (
        newAppointmentStart < existingEnd && newAppointmentEnd > existingStart
      );
    });
  }
}
