import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, Service, TimeBlock } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { TimeSlot } from './interfaces/time-slot.interface';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
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

  async getAvailableSlots(query: AvailableSlotsDto) {
    const { date, serviceId } = query;

    // Validar e converter a data
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    // Obter configurações de horário para a data
    const businessHours =
      await this.settingsService.getBusinessHoursForDate(selectedDate);

    // Se o estabelecimento estiver fechado neste dia, retorna array vazio
    if (!businessHours.isOpen) {
      return {
        date: selectedDate.toISOString().split('T')[0],
        isOpen: false,
        slots: [],
      };
    }

    // Converter string HH:MM para horas numéricas com valores padrão se undefined
    const openTimeStr = businessHours.openTime || '08:00';
    const closeTimeStr = businessHours.closeTime || '18:00';

    const start = parseInt(openTimeStr.split(':')[0]);
    const end = parseInt(closeTimeStr.split(':')[0]);

    // Intervalo padrão entre slots (30 minutos)
    const slotDuration = 30;

    // Se um serviço específico foi solicitado, obter sua duração
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

    // Definir início e fim do dia
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar agendamentos existentes no dia
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

    // Buscar bloqueios de horário
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

    // Gerar todos os possíveis slots
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

      // Verificar se o slot tem duração suficiente antes do fechamento
      const slotEndTime = new Date(slotTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + serviceDuration);

      const businessEndTime = new Date(selectedDate);
      const [endHour, endMinute] = closeTimeStr.split(':').map(Number);
      businessEndTime.setHours(endHour, endMinute, 0, 0);

      if (slotEndTime > businessEndTime) {
        continue; // Pular este slot se ultrapassar o horário de fechamento
      }

      // Verificar se o slot está disponível (não conflita com agendamentos existentes)
      const isAvailable = !appointments.some((appointment) => {
        const appointmentStart = appointment.date;
        const appointmentEnd = new Date(appointment.date);
        appointmentEnd.setMinutes(
          appointmentEnd.getMinutes() + appointment.service.duration,
        );

        // Verificar sobreposição
        return slotTime < appointmentEnd && slotEndTime > appointmentStart;
      });

      // Verificar se o slot está bloqueado por um bloqueio administrativo
      const isBlocked =
        timeBlocks.length > 0 &&
        timeBlocks.some((block) => {
          // Assegurar que as datas são objetos Date
          const blockStart =
            block.startTime instanceof Date
              ? block.startTime
              : new Date(block.startTime);
          const blockEnd =
            block.endTime instanceof Date
              ? block.endTime
              : new Date(block.endTime);

          // Verificar sobreposição
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
