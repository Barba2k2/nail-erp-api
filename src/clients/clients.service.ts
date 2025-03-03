import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async updateProfile(userId: number, data: any) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async getAppointments(userId: number) {
    return this.prisma.appointment.findMany({ where: { userId: userId } });
  }

  async createAppointment(userId: number, data: any) {
    return this.prisma.appointment.create({
      data: {
        date: new Date(data.date),
        status: 'SCHEDULED',
        notes: data.notes,
        userId: userId,
        serviceId: data.serviceId,
      },
    });
  }

  async rescheduleAppointment(appointmentId: number, data: any) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { date: new Date(data.date), status: 'RESCHEDULED' },
    });
  }

  async cancelAppointment(appointmentId: number) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELED' },
    });
  }
}
