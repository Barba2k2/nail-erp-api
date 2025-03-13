import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, Service, TimeBlock, Prisma } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { TimeSlot } from './interfaces/time-slot.interface';
import { SettingsService } from '../settings/settings.service';
import { NotificationSchedulerService } from 'src/notifications/notification-scheduler.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly notificationsScheduler: NotificationSchedulerService,
  ) {}

  async findAll(options?: {
    userId?: number;
    status?: AppointmentStatus | AppointmentStatus[];
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options || {};

    const where: Prisma.AppointmentWhereInput = {};

    // Filtrar por usuário se especificado
    if (userId) {
      where.userId = userId;
    }

    // Filtrar por status se especificado
    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
    }

    // Filtrar por período se especificado
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    // Aplicar paginação
    const skip = (page - 1) * limit;

    // Obter total para paginação
    const total = await this.prisma.appointment.count({ where });

    // Buscar dados
    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        user: true,
        service: true,
      },
      orderBy: {
        date: 'asc',
      },
      skip,
      take: limit,
    });

    return {
      data: appointments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async create(userId: number | undefined | null, data: CreateAppointmentDto) {
    if (!userId || typeof userId !== 'number') {
      throw new BadRequestException('ID de usuário válido é necessário');
    }

    try {
      // Verificar se o serviço existe
      const service = await this.prisma.service.findUnique({
        where: { id: data.serviceId },
      });

      if (!service) {
        throw new BadRequestException(
          `Serviço com ID ${data.serviceId} não encontrado`,
        );
      }

      // Verificar se o usuário existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException(
          `Usuário com ID ${userId} não encontrado`,
        );
      }

      // Combinar data e hora em objeto Date
      const combinedDate = this.combineDateAndTime(
        data.appointmentDate,
        data.appointmentTime,
      );

      // Verificar se a data é no futuro
      if (combinedDate < new Date()) {
        throw new BadRequestException(
          'Não é possível agendar para uma data/hora no passado',
        );
      }

      // Verificar se há conflito de horário
      const hasConflict = await this.checkTimeConflict(
        combinedDate,
        service.duration,
        undefined, // Sem ID de agendamento para exclusão no caso de criação
      );

      if (hasConflict) {
        throw new ConflictException(
          'Horário indisponível. Por favor, selecione outro horário.',
        );
      }

      // Verificar se o horário está dentro do horário de funcionamento
      const isWithinBusinessHours = await this.checkBusinessHours(
        combinedDate,
        service.duration,
      );

      if (!isWithinBusinessHours) {
        throw new BadRequestException(
          'Horário fora do período de funcionamento',
        );
      }

      // Criar o agendamento
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

      // Agendar notificação de confirmação
      await this.notificationsScheduler.createAppointmentConfirmation(
        appointment.id,
      );

      this.logger.log(
        `Agendamento #${appointment.id} criado com sucesso para o usuário #${userId}`,
      );

      return appointment;
    } catch (error) {
      // Repassar erros específicos de validação
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log e tratamento de outros erros
      this.logger.error(
        `Erro ao criar agendamento para usuário #${userId}: ${error.message}`,
        error.stack,
      );

      throw new BadRequestException(
        `Erro ao criar agendamento: ${error.message}`,
      );
    }
  }

  async findOne(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: true,
        service: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Agendamento #${id} não encontrado`);
    }

    return appointment;
  }

  async reschedule(id: number, data: RescheduleAppointmentDto) {
    // Verificar se o agendamento existe
    const appointment = await this.findOne(id);

    // Combinar nova data e hora
    const combinedDate = this.combineDateAndTime(
      data.appointmentDate,
      data.appointmentTime,
    );

    // Verificar se a nova data é no futuro
    if (combinedDate < new Date()) {
      throw new BadRequestException(
        'Não é possível reagendar para uma data/hora no passado',
      );
    }

    // Obter duração do serviço para verificação de conflitos
    const service = await this.prisma.service.findUnique({
      where: { id: appointment.serviceId },
    });

    if (!service) {
      throw new BadRequestException(`Serviço do agendamento não encontrado`);
    }

    // Verificar se há conflito de horário (excluindo o próprio agendamento)
    const hasConflict = await this.checkTimeConflict(
      combinedDate,
      service.duration,
      id, // Excluir o próprio agendamento da verificação
    );

    if (hasConflict) {
      throw new ConflictException(
        'Horário indisponível. Por favor, selecione outro horário.',
      );
    }

    // Verificar se o horário está dentro do horário de funcionamento
    const isWithinBusinessHours = await this.checkBusinessHours(
      combinedDate,
      service.duration,
    );

    if (!isWithinBusinessHours) {
      throw new BadRequestException('Horário fora do período de funcionamento');
    }

    // Atualizar o agendamento
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        date: combinedDate,
        status: data.status || AppointmentStatus.RESCHEDULED,
      },
    });

    // Criar notificação de reagendamento
    await this.notificationsScheduler.createRescheduleNotification(
      updatedAppointment.id,
    );

    this.logger.log(
      `Agendamento #${id} remarcado com sucesso para ${combinedDate.toISOString()}`,
    );

    return updatedAppointment;
  }

  async cancel(id: number) {
    // Verificar se o agendamento existe
    const appointment = await this.findOne(id);

    // Não permitir cancelamento de agendamentos já concluídos
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Não é possível cancelar um agendamento já concluído',
      );
    }

    // Atualizar status para cancelado
    const canceledAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
      },
    });

    // Criar notificação de cancelamento
    await this.notificationsScheduler.createCancellationNotification(
      canceledAppointment.id,
    );

    this.logger.log(`Agendamento #${id} cancelado com sucesso`);

    return canceledAppointment;
  }

  async getAvailableSlots(query: AvailableSlotsDto) {
    const { date, serviceId } = query;

    // Validar a data
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    // Obter configurações de horário de funcionamento para a data
    const businessHours =
      await this.settingsService.getBusinessHoursForDate(selectedDate);

    // Se o estabelecimento estiver fechado na data, retornar lista vazia
    if (!businessHours.isOpen) {
      return {
        date: selectedDate.toISOString().split('T')[0],
        isOpen: false,
        message: 'Estabelecimento fechado nesta data',
        slots: [],
      };
    }

    // Obter hora de abertura e fechamento
    const openTimeStr = businessHours.openTime || '08:00';
    const closeTimeStr = businessHours.closeTime || '18:00';

    const start = parseInt(openTimeStr.split(':')[0]);
    const end = parseInt(closeTimeStr.split(':')[0]);

    // Definir duração padrão do slot
    const slotDuration = 30; // minutos

    // Obter duração do serviço se fornecido
    let serviceDuration = slotDuration;
    let selectedServiceData: Service | null = null;

    if (serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        throw new BadRequestException(
          `Serviço com ID ${serviceId} não encontrado`,
        );
      }

      serviceDuration = service.duration;
      selectedServiceData = service;
    }

    // Definir intervalo da data para busca
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar agendamentos existentes na data
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

    // Buscar bloqueios de horário na data
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
      this.logger.error('Erro ao buscar bloqueios de horário:', error);
    }

    // Calcular slots disponíveis
    const slots: TimeSlot[] = [];
    const slotCount = ((end - start) * 60) / slotDuration;

    for (let i = 0; i < slotCount; i++) {
      // Definir horário inicial do slot
      const slotTime = new Date(selectedDate);
      slotTime.setHours(
        start + Math.floor((i * slotDuration) / 60),
        (i * slotDuration) % 60,
        0,
        0,
      );

      // Definir horário final considerando a duração do serviço
      const slotEndTime = new Date(slotTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + serviceDuration);

      // Verificar se o slot termina antes do fechamento
      const businessEndTime = new Date(selectedDate);
      const [endHour, endMinute] = closeTimeStr.split(':').map(Number);
      businessEndTime.setHours(endHour, endMinute, 0, 0);

      if (slotEndTime > businessEndTime) {
        continue; // Pular slots que ultrapassam o horário de fechamento
      }

      // Verificar conflitos com agendamentos existentes
      const isAvailable = !appointments.some((appointment) => {
        const appointmentStart = appointment.date;
        const appointmentEnd = new Date(appointment.date);
        appointmentEnd.setMinutes(
          appointmentEnd.getMinutes() + appointment.service.duration,
        );

        // Há conflito se houver alguma sobreposição
        return (
          (slotTime <= appointmentStart && slotEndTime > appointmentStart) ||
          (slotTime < appointmentEnd && slotEndTime >= appointmentEnd) ||
          (slotTime >= appointmentStart && slotEndTime <= appointmentEnd)
        );
      });

      // Verificar conflitos com bloqueios de horário
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

          // Há conflito se houver alguma sobreposição
          return (
            (slotTime <= blockStart && slotEndTime > blockStart) ||
            (slotTime < blockEnd && slotEndTime >= blockEnd) ||
            (slotTime >= blockStart && slotEndTime <= blockEnd)
          );
        });

      // Adicionar slot se estiver disponível
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

  async addAppointmentFeedback(
    appointmentId: number,
    feedback: string,
    rating?: number,
  ) {
    // Verificar se o agendamento existe
    const appointment = await this.findOne(appointmentId);

    // Verificar se o status permite feedback
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Feedback só pode ser adicionado a agendamentos concluídos',
      );
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        clientFeedback: feedback,
        ...(rating !== undefined && { rating, rated: true }),
      },
    });
  }

  async completeAppointment(appointmentId: number) {
    // Verificar se o agendamento existe
    const appointment = await this.findOne(appointmentId);

    // Verificar se não está cancelado
    if (appointment.status === AppointmentStatus.CANCELED) {
      throw new BadRequestException(
        'Não é possível completar um agendamento cancelado',
      );
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.COMPLETED,
      },
    });
  }

  // Métodos auxiliares

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

  private async checkTimeConflict(
    date: Date,
    duration: number,
    excludeAppointmentId?: number,
  ): Promise<boolean> {
    // Verificar se há conflitos com outros agendamentos

    // Calcular hora de início e fim
    const appointmentStart = date;
    const appointmentEnd = new Date(date);
    appointmentEnd.setMinutes(appointmentEnd.getMinutes() + duration);

    // Buscar agendamentos que podem conflitar
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictingAppointments = await this.prisma.appointment.findMany({
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

    // Verificar se há algum conflito
    return conflictingAppointments.some((existingAppointment) => {
      const existingStart = existingAppointment.date;
      const existingEnd = new Date(existingAppointment.date);
      existingEnd.setMinutes(
        existingEnd.getMinutes() + existingAppointment.service.duration,
      );

      // Verifica sobreposição
      return (
        (appointmentStart <= existingStart && appointmentEnd > existingStart) ||
        (appointmentStart < existingEnd && appointmentEnd >= existingEnd) ||
        (appointmentStart >= existingStart && appointmentEnd <= existingEnd)
      );
    });
  }

  private async checkBusinessHours(
    date: Date,
    duration: number,
  ): Promise<boolean> {
    const businessHours =
      await this.settingsService.getBusinessHoursForDate(date);

    if (!businessHours.isOpen) {
      return false;
    }

    // Converter horários para objetos Date para comparação
    const openTime = this.timeStringToDate(date, businessHours.openTime || '08:00');
    const closeTime = this.timeStringToDate(date, businessHours.closeTime || '18:00');

    // Verificar se o agendamento começa depois da abertura e termina antes do fechamento
    const appointmentStart = date;
    const appointmentEnd = new Date(date);
    appointmentEnd.setMinutes(appointmentEnd.getMinutes() + duration);

    return appointmentStart >= openTime && appointmentEnd <= closeTime;
  }

  private timeStringToDate(baseDate: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
