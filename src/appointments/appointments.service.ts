import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AppointmentsService { 
  constructor(private readonly prisma: PrismaService) { }
  
  async findAll() {
    return this.prisma.appointment.findMany();
  }

  async create(data: any) {
    return this.prisma.appointment.create({
      data: {
        date: new Date(data.date),
        status: data.status,
        notes: data.notes,
        userId: data.userId,
        serviceId: data.serviceId,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.appointment.findUnique({
      where: { id },
    });
  }

  async reschedule(id: number, data: any) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        date: new Date(data.date),
        status: data.status || 'RESCHEDULED',
      },
    });
  }

  async cancel(id: number) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELED',
      },
    });
  }
}