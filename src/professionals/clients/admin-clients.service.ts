import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface FindAllOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

@Injectable()
export class AdminClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options: FindAllOptions) {
    const { page, limit, search, sortBy = 'name', order = 'asc' } = options;

    const allowedSortFields = ['name', 'email', 'createdAt'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(
        `Campo de ordenação inválido!! Permitidos: ${allowedSortFields.join(', ')}`,
      );
    }

    const where = {
      role: UserRole.CLIENT,
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };

    const total = await this.prisma.user.count({ where });

    const clients = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
      orderBy: {
        [sortBy]: order,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      data: clients,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };
  }

  async findOne(id: number) {
    const client = await this.prisma.user.findUnique({
      where: { id, role: UserRole.CLIENT },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!client) {
      throw new BadRequestException(`Cliente com ID ${id} não encontrado`);
    }

    const recentAppointments = await this.prisma.appointment.findMany({
      where: { userId: id },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        service: true,
      },
    });

    const completedAppointments = await this.prisma.appointment.findMany({
      where: {
        userId: id,
        status: AppointmentStatus.COMPLETED,
      },
      include: {
        service: {
          select: {
            price: true,
          },
        },
      },
    });

    const totalSpent = completedAppointments.reduce(
      (sum, appointment) => sum + appointment.service.price,
      0,
    );

    const favoriteServices = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      where: { userId: id },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 3,
    });

    const serviceDetails = await Promise.all(
      favoriteServices.map(async (fav) => {
        const service = await this.prisma.service.findUnique({
          where: { id: fav.serviceId },
          select: { id: true, name: true },
        });

        return {
          ...service,
          count: fav._count.serviceId,
        };
      }),
    );

    return {
      ...client,
      recentAppointments,
      stats: {
        totalSpent,
        favoriteServices: serviceDetails,
      },
    };
  }

  async create(data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const client = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: UserRole.CLIENT,
        phone: data.phone,
        notes: data.notes,
        preferences: data.preferences || {},
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
      },
    });

    const createData = await this.prisma.notificationPreference.create({
      data: {
        userId: client.id,
        enableEmailNotifications: true,
        enableSmsNotifications: false,
        appointmentReminders: true,
        reminderTime: 24,
      },
    });

    return createData;
  }

  async update(id: number, data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id, role: UserRole.CLIENT },
    });

    if (!existingUser) {
      throw new BadRequestException(`Cliente com ID ${id} não encontrado`);
    }

    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.email) {
      if (data.email != existingUser.email) {
        const emilsExists = await this.prisma.user.findUnique({
          where: { email: data.email },
        });
        if (emilsExists) {
          throw new BadRequestException(
            'Email já cadastrado para outro usuário',
          );
        }
      }
      updateData.email = data.email;
    }
    if (data.phone) updateData.phone = data.phone;
    if (data.notes) updateData.notes = data.notes;
    if (data.preferences) updateData.preferences = data.preferences;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getClientAppointments(id: number, status?: string) {
    const client = await this.prisma.user.findUnique({
      where: { id, role: UserRole.CLIENT },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    }

    const whereFilter: any = { userId: id };

    if (status) {
      const validStatuses = [
        'SCHEDULED',
        'CONFIRMED',
        'COMPLETED',
        'CANCELED',
        'RESCHEDULED',
      ];
      if (validStatuses.includes(status)) {
        whereFilter.status = status as AppointmentStatus;
      }
    }

    const appointments = await this.prisma.appointment.findMany({
      where: whereFilter,
      orderBy: { date: 'desc' },
      include: {
        service: true,
      },
    });

    const appointmentsMap = appointments.map((appointment) => {
      const appointmentDate = appointment.date.toISOString().split('T')[0];
      const appointmentTime = appointment.date.toTimeString().substring(0, 5);

      return {
        ...appointment,
        formattedDate: appointmentDate,
        formattedTime: appointmentTime,
      };
    });

    return appointmentsMap;
  }

  async getClientsOverview() {
    const totalClients = await this.prisma.user.count({
      where: { role: UserRole.CLIENT },
    });

    const firstDayOfMounth = new Date();
    firstDayOfMounth.setDate(1);
    firstDayOfMounth.setHours(0, 0, 0, 0);

    const newClientThisMonth = await this.prisma.user.count({
      where: {
        role: UserRole.CLIENT,
        createdAt: {
          gte: firstDayOfMounth,
        },
      },
    });

    const clientsWithActiveAppointments =
      await this.prisma.appointment.findMany({
        where: {
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
          date: { gte: new Date() },
        },
        distinct: ['userId'],
        select: { userId: true },
      });

    const activeAppointments = await this.prisma.appointment.count({
      where: {
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        date: { gte: new Date() },
      },
    });

    const clientsWithAppointments = await this.prisma.appointment.groupBy({
      by: ['userId'],
      _count: { userId: true },
      having: { userId: { _count: { gt: 1 } } },
    });

    const returnRate =
      totalClients > 0
        ? (clientsWithAppointments.length / totalClients) * 100
        : 0;

    return {
      totalClients,
      newClientThisMonth,
      activeClients: clientsWithActiveAppointments.length,
      activeAppointments,
      returnRate: Math.round(returnRate * 10) / 10,
    };
  }

  async getRecentClients() {
    const recentClients = await this.prisma.user.findMany({
      where: { role: UserRole.CLIENT },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    return recentClients;
  }
}
