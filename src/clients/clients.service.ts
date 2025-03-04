import { Injectable, BadRequestException } from '@nestjs/common';
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

  async createAppointment(userId: number, data: any) {
    // Validar userId
    if (!userId || typeof userId !== 'number') {
      throw new BadRequestException('ID de usuário válido é necessário');
    }

    console.log('Creating appointment for user ID:', userId);
    console.log('Appointment data:', data);

    // Extrair dados dos novos campos
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
      // Combinar data e hora em um objeto Date
      const [year, month, day] = appointmentDate.split('-').map(Number);
      const [hours, minutes] = appointmentTime.split(':').map(Number);

      const combinedDate = new Date(year, month - 1, day, hours, minutes);
      console.log('Combined date:', combinedDate);

      if (isNaN(combinedDate.getTime())) {
        throw new BadRequestException('Data ou hora inválida');
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
            connect: { id: +serviceId }, // Converte para número se for string
          },
        },
        include: {
          service: true,
        },
      });
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      throw new BadRequestException(
        'Não foi possível criar o agendamento: ' + error.message,
      );
    }
  }

  async rescheduleAppointment(appointmentId: number, data: any) {
    // Extrair dados dos novos campos
    const { appointmentDate, appointmentTime } = data;

    if (!appointmentDate || !appointmentTime) {
      throw new BadRequestException(
        'Data e hora do reagendamento são obrigatórios',
      );
    }

    try {
      // Combinar data e hora em um objeto Date
      const [year, month, day] = appointmentDate.split('-').map(Number);
      const [hours, minutes] = appointmentTime.split(':').map(Number);

      const combinedDate = new Date(year, month - 1, day, hours, minutes);

      if (isNaN(combinedDate.getTime())) {
        throw new BadRequestException('Data ou hora inválida');
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
      console.error('Erro ao reagendar:', error);
      throw new BadRequestException(
        'Não foi possível reagendar: ' + error.message,
      );
    }
  }

  async cancelAppointment(appointmentId: number) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELED },
      include: {
        service: true,
      },
    });
  }
}
