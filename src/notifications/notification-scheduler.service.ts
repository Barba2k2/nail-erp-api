// src/notifications/notification-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import {
  NotificationStatus,
  NotificationType,
  NotificationChannel,
  AppointmentStatus,
} from '@prisma/client';
import { DateUtils } from '../utils/date.utils';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Executa a cada 5 minutos para verificar e enviar notificações pendentes
  @Cron('*/5 * * * *')
  async processScheduledNotifications() {
    this.logger.debug('Processando notificações agendadas');

    const pendingNotifications = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: {
          lte: new Date(), // Notificações agendadas para agora ou no passado
        },
      },
      take: 50, // Processa em lotes para evitar sobrecarga
    });

    this.logger.debug(
      `Encontradas ${pendingNotifications.length} notificações pendentes`,
    );

    for (const notification of pendingNotifications) {
      await this.notificationsService.processNotification(notification.id);
    }
  }

  // Executa uma vez por dia à meia-noite para criar lembretes de agendamentos
  @Cron('0 0 * * *')
  async scheduleAppointmentReminders() {
    this.logger.debug('Agendando lembretes de compromissos');

    // Busca todos os agendamentos dos próximos 2 dias que ainda não foram cancelados
    const now = new Date();
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: now,
          lte: twoDaysFromNow,
        },
        status: {
          not: AppointmentStatus.CANCELED,
        },
      },
      include: {
        user: {
          include: {
            notificationPreference: true,
          },
        },
        service: true,
      },
    });

    this.logger.debug(
      `Encontrados ${upcomingAppointments.length} agendamentos próximos`,
    );

    for (const appointment of upcomingAppointments) {
      try {
        const { user, service } = appointment;

        // Verifica se o usuário tem preferências de notificação
        const preference =
          user.notificationPreference ||
          (await this.notificationsService.getNotificationPreference(user.id));

        if (!preference.appointmentReminders) {
          continue; // Usuário desativou lembretes
        }

        // Calcula o horário do lembrete baseado nas preferências do usuário
        const reminderTime = new Date(appointment.date);
        reminderTime.setHours(
          reminderTime.getHours() - preference.reminderTime,
        );

        // Verifica se já existe um lembrete para este agendamento
        const existingReminder = await this.prisma.notification.findFirst({
          where: {
            appointmentId: appointment.id,
            type: NotificationType.APPOINTMENT_REMINDER,
            status: NotificationStatus.PENDING,
          },
        });

        if (existingReminder) {
          continue; // Já existe um lembrete pendente
        }

        // Formata data e hora para exibição
        const { appointmentDate, appointmentTime } =
          DateUtils.formatAppointmentDateTime(appointment.date);

        // Cria conteúdo da notificação
        const title = `Lembrete: Seu agendamento amanhã`;

        const content = `Olá ${user.name},

Lembramos que você tem um agendamento para ${service.name} amanhã, ${appointmentDate} às ${appointmentTime}.

Duração do serviço: ${service.duration} minutos
Valor: R$ ${service.price.toFixed(2)}

Por favor, confirme sua presença respondendo a este e-mail.

Atenciosamente,
Equipe do Salão de Beleza`;

        // Cria a notificação
        await this.notificationsService.createNotification({
          userId: user.id,
          type: NotificationType.APPOINTMENT_REMINDER,
          channel: preference.enableEmailNotifications
            ? NotificationChannel.EMAIL
            : NotificationChannel.SYSTEM,
          title,
          content,
          scheduledFor: reminderTime,
          appointmentId: appointment.id,
        });

        this.logger.debug(
          `Lembrete agendado para o agendamento #${appointment.id} em ${reminderTime.toISOString()}`,
        );
      } catch (error) {
        this.logger.error(
          `Erro ao agendar lembrete para agendamento #${appointment.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  // Método para criar notificação de confirmação após agendamento
  async createAppointmentConfirmation(appointmentId: number) {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: true,
          service: true,
        },
      });

      if (!appointment) {
        throw new Error(`Agendamento #${appointmentId} não encontrado`);
      }

      const { user, service } = appointment;
      const { appointmentDate, appointmentTime } =
        DateUtils.formatAppointmentDateTime(appointment.date);

      const title = `Agendamento Confirmado: ${service.name}`;
      const content = `Olá ${user.name},

Seu agendamento foi confirmado com sucesso.

Serviço: ${service.name}
Data: ${appointmentDate}
Horário: ${appointmentTime}
Duração estimada: ${service.duration} minutos
Valor: R$ ${service.price.toFixed(2)}

Você receberá um lembrete um dia antes do seu agendamento.

Atenciosamente,
Equipe do Salão de Beleza`;

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.APPOINTMENT_CONFIRMATION,
        channel: preference.enableEmailNotifications
          ? NotificationChannel.EMAIL
          : NotificationChannel.SYSTEM,
        title,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(), // Enviar imediatamente
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao criar confirmação para agendamento #${appointmentId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  // Método para criar notificação de cancelamento
  async createCancellationNotification(appointmentId: number) {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: true,
          service: true,
        },
      });

      if (!appointment) {
        throw new Error(`Agendamento #${appointmentId} não encontrado`);
      }

      const { user, service } = appointment;
      const { appointmentDate, appointmentTime } =
        DateUtils.formatAppointmentDateTime(appointment.date);

      const title = `Agendamento Cancelado: ${service.name}`;
      const content = `Olá ${user.name},

Seu agendamento foi cancelado.

Serviço: ${service.name}
Data: ${appointmentDate}
Horário: ${appointmentTime}

Se você não solicitou este cancelamento, entre em contato conosco o mais breve possível.

Atenciosamente,
Equipe do Salão de Beleza`;

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.APPOINTMENT_CANCELLATION,
        channel: preference.enableEmailNotifications
          ? NotificationChannel.EMAIL
          : NotificationChannel.SYSTEM,
        title,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(), // Enviar imediatamente
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao criar notificação de cancelamento para agendamento #${appointmentId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  // Método para criar notificação de remarcação
  async createRescheduleNotification(appointmentId: number) {
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: true,
          service: true,
        },
      });

      if (!appointment) {
        throw new Error(`Agendamento #${appointmentId} não encontrado`);
      }

      const { user, service } = appointment;
      const { appointmentDate, appointmentTime } =
        DateUtils.formatAppointmentDateTime(appointment.date);

      const title = `Agendamento Remarcado: ${service.name}`;
      const content = `Olá ${user.name},

Seu agendamento foi remarcado para uma nova data.

Serviço: ${service.name}
Nova Data: ${appointmentDate}
Novo Horário: ${appointmentTime}
Duração estimada: ${service.duration} minutos
Valor: R$ ${service.price.toFixed(2)}

Você receberá um lembrete um dia antes do seu agendamento.

Atenciosamente,
Equipe do Salão de Beleza`;

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.APPOINTMENT_RESCHEDULED,
        channel: preference.enableEmailNotifications
          ? NotificationChannel.EMAIL
          : NotificationChannel.SYSTEM,
        title,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(), // Enviar imediatamente
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao criar notificação de remarcação para agendamento #${appointmentId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
