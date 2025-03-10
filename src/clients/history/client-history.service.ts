import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DateUtils } from 'src/utils/date.utils';

@Injectable()
export class ClientHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientHistory(clientId: number) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        userId: clientId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        service: true,
      },
    });

    return appointments.map((appointment) => {
      const { appointmentDate, appointmentTime } =
        DateUtils.formatAppointmentDateTime(appointment.date);

      return {
        id: appointment.id,
        date: appointmentDate,
        time: appointmentTime,
        serviceName: appointment.service.name,
        servicePrice: appointment.service.price,
        status: appointment.status,
        notes: appointment.notes,
        clientFeedback: appointment.clientFeedback,
        rating: appointment.rating,
      };
    });
  }

  async getClientProfile(clientId: number) {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return null;
    }

    const appointmentCount = await this.prisma.appointment.count({
      where: { userId: clientId },
    });

    const totalSpent = await this.prisma.appointment.findMany({
      where: {
        userId: clientId,
        status: 'COMPLETED',
      },
      include: {
        service: true,
      },
    });

    const total = totalSpent.reduce((sum, app) => sum + app.service.price, 0);

    const services = await this.prisma.appointment.findMany({
      where: { userId: clientId },
      include: {
        service: true,
      },
    });

    const serviceCount = {};
    services.forEach((app) => {
      const serviceName = app.service.name;
      serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
    });

    const favoriteServices = Object.entries(serviceCount)
      .map(([name, count]: [string, number]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      preferences: client.preferences || {},
      stats: {
        appointmentCount,
        totalSpent: total,
        favoriteServices,
      },
    };
  }

  async updateClientNotes(clientId: number, notes: string) {
    return this.prisma.user.update({
      where: { id: clientId },
      data: { notes },
    });
  }

  async updateClientPreferences(clientId: number, preferences: any) {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error(`Cliente #${clientId} não encontrado`);
    }

    const currentPreferences =
      (client.preferences as Record<string, any>) || {};
    const updatedPreferences = { ...currentPreferences, ...preferences };

    return this.prisma.user.update({
      where: { id: clientId },
      data: { preferences: updatedPreferences },
    });
  }

  async addAppointmentFeddback(
    appointmentId: number,
    feedback: string,
    rating?: number,
  ) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        clientFeedback: feedback,
        ...(rating && { rating, rated: true }),
      },
    });
  }
}
