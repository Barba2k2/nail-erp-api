import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import {
  NotificationStatus,
  NotificationType,
  NotificationChannel,
  AppointmentStatus,
} from '@prisma/client';
import { DateUtils } from '../utils/date.utils';
import { NotificationTemplatesService } from './template/notification-templates.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private readonly enableNotificationScheduling: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: NotificationTemplatesService,
    private readonly configService: ConfigService,
  ) {
    // Permitir desabilitar agendamento em ambientes de teste
    this.enableNotificationScheduling =
      this.configService.get<string>(
        'ENABLE_NOTIFICATION_SCHEDULING',
        'true',
      ) === 'true';
  }

  // Executar a cada 5 minutos para processar notificações pendentes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledNotifications() {
    if (!this.enableNotificationScheduling) {
      this.logger.debug(
        'Agendamento de notificações desabilitado via configuração',
      );
      return;
    }

    this.logger.debug('Processando notificações agendadas');

    const pendingNotifications = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: {
          lte: new Date(),
        },
      },
      take: 50, // Limite para processamento em lote
    });

    this.logger.debug(
      `Encontradas ${pendingNotifications.length} notificações pendentes para processamento`,
    );

    for (const notification of pendingNotifications) {
      try {
        await this.notificationsService.processNotification(notification.id);
      } catch (error) {
        this.logger.error(
          `Erro ao processar notificação #${notification.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  // Executar diariamente à meia-noite para agendar lembretes de compromissos
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleAppointmentReminders() {
    if (!this.enableNotificationScheduling) {
      return;
    }

    this.logger.debug('Agendando lembretes de compromissos');

    const now = new Date();
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    // Buscar agendamentos nos próximos 2 dias
    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: now,
          lte: twoDaysFromNow,
        },
        status: {
          notIn: [AppointmentStatus.CANCELED],
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
      `Encontrados ${upcomingAppointments.length} agendamentos próximos para lembretes`,
    );

    for (const appointment of upcomingAppointments) {
      try {
        const { user, service } = appointment;

        const preference =
          user.notificationPreference ||
          (await this.notificationsService.getNotificationPreference(user.id));

        // Verificar se lembretes estão habilitados
        if (!preference.appointmentReminders) {
          continue;
        }

        // Calcular horário do lembrete com base nas preferências
        const reminderTime = new Date(appointment.date);
        reminderTime.setHours(
          reminderTime.getHours() - preference.reminderTime,
        );

        // Só agendar se o horário do lembrete for no futuro
        if (reminderTime <= now) {
          continue;
        }

        // Verificar se já existe um lembrete agendado
        const existingReminder = await this.prisma.notification.findFirst({
          where: {
            appointmentId: appointment.id,
            type: NotificationType.APPOINTMENT_REMINDER,
            status: NotificationStatus.PENDING,
          },
        });

        if (existingReminder) {
          continue;
        }

        await this.createAppointmentReminder(appointment, reminderTime);
      } catch (error) {
        this.logger.error(
          `Erro ao agendar lembrete para agendamento #${appointment.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async createAppointmentReminder(
    appointment: any,
    scheduledFor: Date,
  ) {
    const { user, service } = appointment;
    const { appointmentDate, appointmentTime } =
      DateUtils.formatAppointmentDateTime(appointment.date);

    try {
      // Obter template de lembrete
      const template = await this.templatesService.findDefault(
        NotificationType.APPOINTMENT_REMINDER,
      );

      // Processar template com dados do agendamento
      const { subject, content } = this.templatesService.processTemplate(
        template,
        {
          user,
          service,
          appointment: {
            date: appointmentDate,
            time: appointmentTime,
            serviceName: service.name,
            price: service.price,
          },
        },
      );

      // Determinar canal preferido
      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      const channel = this.determinePreferredChannel(preference, user);

      // Criar notificação agendada
      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.APPOINTMENT_REMINDER,
        channel,
        title: subject,
        content,
        scheduledFor,
        appointmentId: appointment.id,
      });

      this.logger.debug(
        `Lembrete agendado para o agendamento #${appointment.id} em ${scheduledFor.toISOString()}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao criar lembrete para agendamento #${appointment.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  private determinePreferredChannel(
    preference: any,
    user: any,
  ): NotificationChannel {
    // Determinar canal preferido com base nas preferências e disponibilidade de contato
    if (preference.enableWhatsAppNotifications && user.phone) {
      return NotificationChannel.WHATSAPP;
    } else if (preference.enableSmsNotifications && user.phone) {
      return NotificationChannel.SMS;
    }
    return NotificationChannel.EMAIL;
  }

  // Métodos para criar notificações específicas

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

      const template = await this.templatesService.findDefault(
        NotificationType.APPOINTMENT_CONFIRMATION,
      );

      const { subject, content } = this.templatesService.processTemplate(
        template,
        {
          user,
          service,
          appointment: {
            date: appointmentDate,
            time: appointmentTime,
            serviceName: service.name,
            price: service.price,
          },
        },
      );

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      const channel = this.determinePreferredChannel(preference, user);

      const notification = await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.APPOINTMENT_CONFIRMATION,
        channel,
        title: subject,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(), // Enviar imediatamente
      });

      // Processar imediatamente
      await this.notificationsService.processNotification(notification.id);

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao criar confirmação para agendamento #${appointmentId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async createCancellationNotification(appointmentId: number) {
    // Implementação similar ao método acima, mas para notificações de cancelamento
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

      const template = await this.templatesService.findDefault(
        NotificationType.APPOINTMENT_CANCELLATION,
      );

      const { subject, content } = this.templatesService.processTemplate(
        template,
        {
          user,
          service,
          appointment: {
            date: appointmentDate,
            time: appointmentTime,
            serviceName: service.name,
            price: service.price,
          },
        },
      );

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      const channel = this.determinePreferredChannel(preference, user);

      const notification = await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.APPOINTMENT_CANCELLATION,
        channel,
        title: subject,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(), // Enviar imediatamente
      });

      // Processar imediatamente
      await this.notificationsService.processNotification(notification.id);

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao criar notificação de cancelamento para agendamento #${appointmentId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async createRescheduleNotification(appointmentId: number) {
    // Implementação similar para notificações de reagendamento
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

      const template = await this.templatesService.findDefault(
        NotificationType.APPOINTMENT_RESCHEDULED,
      );

      const { subject, content } = this.templatesService.processTemplate(
        template,
        {
          user,
          service,
          appointment: {
            date: appointmentDate,
            time: appointmentTime,
            serviceName: service.name,
            price: service.price,
          },
        },
      );

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      const channel = this.determinePreferredChannel(preference, user);

      const notification = await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.APPOINTMENT_RESCHEDULED,
        channel,
        title: subject,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(), // Enviar imediatamente
      });

      // Processar imediatamente
      await this.notificationsService.processNotification(notification.id);

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao criar notificação de remarcação para agendamento #${appointmentId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async createStatusChangeNotification(appointmentId: number, status: string) {
    // Direcionar para o método específico com base no status
    switch (status) {
      case AppointmentStatus.CANCELED:
        return this.createCancellationNotification(appointmentId);
      case AppointmentStatus.RESCHEDULED:
        return this.createRescheduleNotification(appointmentId);
      case AppointmentStatus.CONFIRMED:
        return this.createAppointmentConfirmation(appointmentId);
      default:
        this.logger.log(`Status ${status} não requer notificação específica`);
        return true;
    }
  }
}
