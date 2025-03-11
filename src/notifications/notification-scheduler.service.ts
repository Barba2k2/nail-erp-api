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
import { NotificationTemplatesService } from './template/notification-templates.service';

@Injectable()
export class NotificationSchedulerService {
  createStatusChangeNotification(appointmentId: number, status: string) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: NotificationTemplatesService,
  ) {}

  @Cron('*/5 * * * *')
  async processScheduledNotifications() {
    this.logger.debug('Processando notificações agendadas');

    const pendingNotifications = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: {
          lte: new Date(),
        },
      },
      take: 50,
    });

    this.logger.debug(
      `Encontradas ${pendingNotifications.length} notificações pendentes`,
    );

    for (const notification of pendingNotifications) {
      await this.notificationsService.processNotification(notification.id);
    }
  }

  @Cron('0 0 * * *')
  async scheduleAppointmentReminders() {
    this.logger.debug('Agendando lembretes de compromissos');

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
          not: 'CANCELED',
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

        const preference =
          user.notificationPreference ||
          (await this.notificationsService.getNotificationPreference(user.id));

        if (!preference.appointmentReminders) {
          continue;
        }

        const reminderTime = new Date(appointment.date);
        reminderTime.setHours(
          reminderTime.getHours() - preference.reminderTime,
        );

        const existingReminder = await this.prisma.notification.findFirst({
          where: {
            appointmentId: appointment.id,
            type: 'APPOINTMENT_REMINDER',
            status: 'PENDING',
          },
        });

        if (existingReminder) {
          continue;
        }

        const { appointmentDate, appointmentTime } =
          DateUtils.formatAppointmentDateTime(appointment.date);

        const template = await this.templatesService.findDefault(
          'APPOINTMENT_REMINDER',
        );

        const { subject, content } = this.templatesService.processTemplate(
          template,
          {
            user,
            service,
            appointment: {
              date: appointmentDate,
              time: appointmentTime,
            },
          },
        );

        await this.notificationsService.createNotification({
          userId: user.id,
          type: 'APPOINTMENT_REMINDER',
          channel: preference.enableEmailNotifications ? 'EMAIL' : 'SYSTEM',
          title: subject,
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
        'APPOINTMENT_CONFIRMATION',
      );

      const { subject, content } = this.templatesService.processTemplate(
        template,
        {
          user,
          service,
          appointment: {
            date: appointmentDate,
            time: appointmentTime,
          },
        },
      );

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      await this.notificationsService.createNotification({
        userId: user.id,
        type: 'APPOINTMENT_CONFIRMATION',
        channel: preference.enableEmailNotifications
          ? NotificationChannel.EMAIL
          : NotificationChannel.SYSTEM,
        title: subject,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(),
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

      const template = await this.templatesService.findDefault(
        'APPOINTMENT_CANCELLATION',
      );

      const { subject, content } = this.templatesService.processTemplate(
        template,
        {
          user,
          service,
          appointment: {
            date: appointmentDate,
            time: appointmentTime,
          },
        },
      );

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      await this.notificationsService.createNotification({
        userId: user.id,
        type: 'APPOINTMENT_CANCELLATION',
        channel: preference.enableEmailNotifications ? 'EMAIL' : 'SYSTEM',
        title: subject,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(),
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

      const template = await this.templatesService.findDefault(
        'APPOINTMENT_RESCHEDULED',
      );

      const { subject, content } = this.templatesService.processTemplate(
        template,
        {
          user,
          service,
          appointment: {
            date: appointmentDate,
            time: appointmentTime,
          },
        },
      );

      const preference =
        await this.notificationsService.getNotificationPreference(user.id);

      await this.notificationsService.createNotification({
        userId: user.id,
        type: 'APPOINTMENT_RESCHEDULED',
        channel: preference.enableEmailNotifications ? 'EMAIL' : 'SYSTEM',
        title: subject,
        content,
        appointmentId: appointment.id,
        scheduledFor: new Date(),
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
