import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, Service, TimeBlock } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { TimeSlot } from './interfaces/time-slot.interface';
import { SettingsService } from '../settings/settings.service';
import { NotificationSchedulerService } from 'src/notifications/notification-scheduler.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly notificationsScheduler: NotificationSchedulerService,
  ) {}

  async findAll() {
    return this.prisma.appointment.findMany({
      include: {
        user: true,
        service: true,
      },
    });
  }

  async create(userId: number | undefined | null, data: CreateAppointmentDto) {
    if (!userId || typeof userId !== 'number') {
      throw new BadRequestException('ID de usuário válido é necessário');
    }

    const combinedDate = this.combineDateAndTime(
      data.appointmentDate,
      data.appointmentTime,
    );

    const appointment = await this.prisma.appointment.create({
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
        user: true,
      },
    });

    await this.notificationsScheduler.createAppointmentConfirmation(
      appointment.id,
    );

    return appointment;
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
    const combinedDate = this.combineDateAndTime(
      data.appointmentDate,
      data.appointmentTime,
    );

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        date: combinedDate,
        status: data.status || AppointmentStatus.RESCHEDULED,
      },
    });

    await this.notificationsScheduler.createRescheduleNotification(
      appointment.id,
    );

    return appointment;
  }

  async cancel(id: number) {
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
      },
    });

    await this.notificationsScheduler.createCancellationNotification(
      appointment.id,
    );

    return appointment;
  }

  async getAvailableSlots(query: AvailableSlotsDto) {
    const { date, serviceId } = query;

    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    const businessHours =
      await this.settingsService.getBusinessHoursForDate(selectedDate);

    if (!businessHours.isOpen) {
      return {
        date: selectedDate.toISOString().split('T')[0],
        isOpen: false,
        slots: [],
      };
    }

    const openTimeStr = businessHours.openTime || '08:00';
    const closeTimeStr = businessHours.closeTime || '18:00';

    const start = parseInt(openTimeStr.split(':')[0]);
    const end = parseInt(closeTimeStr.split(':')[0]);

    const slotDuration = 30;

    let serviceDuration = slotDuration;
    let selectedServiceData: Service | null = null;

    if (serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        throw new BadRequestException('Serviço não encontrado');
      }

      serviceDuration = service.duration;
      selectedServiceData = service;
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: AppointmentStatus.CANCELED,
        },
      },
      include: {
        service: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    let timeBlocks: TimeBlock[] = [];
    try {
      timeBlocks = await this.prisma.timeBlock.findMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
    } catch (error) {
      console.error('Erro ao buscar bloqueios de horário:', error);
    }

    const slots: TimeSlot[] = [];
    const slotCount = ((end - start) * 60) / slotDuration;

    for (let i = 0; i < slotCount; i++) {
      const slotTime = new Date(selectedDate);
      slotTime.setHours(
        start + Math.floor((i * slotDuration) / 60),
        (i * slotDuration) % 60,
        0,
        0,
      );

      const slotEndTime = new Date(slotTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + serviceDuration);

      const businessEndTime = new Date(selectedDate);
      const [endHour, endMinute] = closeTimeStr.split(':').map(Number);
      businessEndTime.setHours(endHour, endMinute, 0, 0);

      if (slotEndTime > businessEndTime) {
        continue;
      }

      const isAvailable = !appointments.some((appointment) => {
        const appointmentStart = appointment.date;
        const appointmentEnd = new Date(appointment.date);
        appointmentEnd.setMinutes(
          appointmentEnd.getMinutes() + appointment.service.duration,
        );

        return slotTime < appointmentEnd && slotEndTime > appointmentStart;
      });

      const isBlocked =
        timeBlocks.length > 0 &&
        timeBlocks.some((block) => {
          const blockStart =
            block.startTime instanceof Date
              ? block.startTime
              : new Date(block.startTime);
          const blockEnd =
            block.endTime instanceof Date
              ? block.endTime
              : new Date(block.endTime);

          return slotTime < blockEnd && slotEndTime > blockStart;
        });

      if (isAvailable && !isBlocked) {
        slots.push({
          time: slotTime.toISOString(),
          formattedTime: `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`,
          duration: serviceDuration,
          service: selectedServiceData,
        });
      }
    }

    return {
      date: selectedDate.toISOString().split('T')[0],
      isOpen: true,
      businessHours: `${openTimeStr} - ${closeTimeStr}`,
      slots: slots,
    };
  }

  private combineDateAndTime(dateStr: string, timeStr: string): Date {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);

      const date = new Date(year, month - 1, day, hours, minutes);

      if (isNaN(date.getTime())) {
        throw new BadRequestException('Data ou horário inválido');
      }

      return date;
    } catch (error) {
      throw new BadRequestException('Erro ao processar data e horário');
    }
  }
}
