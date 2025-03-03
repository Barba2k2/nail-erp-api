import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async updateProfile(userId: number, data: any) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async getAppointments(userId: number) {
    return this.prisma.appointment.findMany({
      where: { userId: userId },
    });
  }

  async updateAppointmentStatus(
    appointmentId: number,
    status: AppointmentStatus,
  ) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });
  }

  async getServices(userId: number) {
    // Opcionalmente, filtrar serviços do profissional
    return this.prisma.service.findMany();
  }

  async createService(userId: number, data: any) {
    return this.prisma.service.create({ data });
  }

  async updateService(serviceId: number, data: any) {
    return this.prisma.service.update({
      where: { id: serviceId },
      data,
    });
  }

  async deleteService(serviceId: number) {
    return this.prisma.service.delete({ where: { id: serviceId } });
  }
}
