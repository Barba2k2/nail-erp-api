import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ConfigService } from '@nestjs/config';
import { MailgunService } from './providers/mailgun.service';
import { TwilioService } from './providers/twilio.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailgunService: MailgunService,
    private readonly twilioService: TwilioService,
  ) {}

  async createNotification(data: CreateNotificationDto) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          channel: data.channel,
          title: data.title,
          content: data.content,
          scheduledFor: data.scheduledFor,
          appointmentId: data.appointmentId,
        },
        include: {
          user: true,
          appointment: {
            include: {
              service: true,
            },
          },
        },
      });

      return notification;
    } catch (error) {
      this.logger.error(
        `Erro ao criar notificação: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAllForUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
      },
    });
  }

  async markAsSent(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  async markAsFailed(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
      },
    });
  }

  async deleteNotification(id: number) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async getNotificationPreference(userId: number) {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      // Criar preferências padrão se não existirem
      return this.prisma.notificationPreference.create({
        data: {
          userId,
          enableEmailNotifications: true,
          enableSmsNotifications: false,
          appointmentReminders: true,
          reminderTime: 24, // 24 horas antes
        },
      });
    }

    return preference;
  }

  async updateNotificationPreference(userId: number, data: any) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.prisma.notificationPreference.update({
        where: { userId },
        data,
      });
    }

    return this.prisma.notificationPreference.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async sendEmail(to: string, subject: string, content: string) {
    const envirenment = this.configService.get<string>('NODE_ENV');

    if (envirenment === 'production') {
      return this.mailgunService.sendEmail(to, subject, content);
    } else {
      this.logger.log(`[EMAIL SIMULADO] Para: ${to}`);
      this.logger.log(`Assunto: ${subject}`);
      this.logger.log(`Conteúdo: ${content}`);
      return true;
    }
  }

  async sendSMS(phoneNumber: string, message: string) {
    const envirenment = this.configService.get<string>('NODE_ENV');

    if (envirenment === 'production') {
      return this.twilioService.sendSMS(phoneNumber, message);
    } else {
      this.logger.log(`[SMS SIMULADO] Para: ${phoneNumber}`);
      this.logger.log(`Mensagem: ${message}`);
      return true;
    }
  }

  async processNotification(notificationId: number) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
        include: {
          user: true,
          appointment: {
            include: {
              service: true,
            },
          },
        },
      });

      if (!notification) {
        throw new Error(`Notificação #${notificationId} não encontrada`);
      }

      if (notification.status !== NotificationStatus.PENDING) {
        this.logger.log(
          `Notificação #${notificationId} já processada (status: ${notification.status})`,
        );
        return;
      }

      let success = false;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          success = await this.sendEmail(
            notification.user.email,
            notification.title,
            notification.content,
          );
          break;

        case NotificationChannel.SMS:
          if (!notification.user.phone) {
            throw new Error(
              `Usuário #${notification.userId} não possui telefone cadastrado`,
            );
          }
          success = await this.sendSMS(
            notification.user.phone,
            notification.content,
          );
          break;

        case NotificationChannel.SYSTEM:
          // Apenas marca como enviado, será exibido na interface do usuário
          success = true;
          break;

        default:
          throw new Error(
            `Canal de notificação desconhecido: ${notification.channel}`,
          );
      }

      if (success) {
        await this.markAsSent(notification.id);
        this.logger.log(`Notificação #${notification.id} enviada com sucesso`);
      } else {
        await this.markAsFailed(notification.id);
        this.logger.error(`Falha ao enviar notificação #${notification.id}`);
      }

      return success;
    } catch (error) {
      this.logger.error(
        `Erro ao processar notificação #${notificationId}: ${error.message}`,
        error.stack,
      );
      await this.markAsFailed(notificationId);
      return false;
    }
  }
}
