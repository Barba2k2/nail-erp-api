import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Notification,
  User,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { NotificationChannelFactory } from './factory/notification-channel.factory';
import { CreateNotificationDto } from './dto/create-notification.dto';

// Define a type that includes the user relation
type NotificationWithUser = Notification & {
  user?: User | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly channelFactory: NotificationChannelFactory,
  ) {}

  async createNotification(data: CreateNotificationDto): Promise<Notification> {
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

  async processNotification(notificationId: number): Promise<boolean> {
    this.logger.log(`Processando notificação #${notificationId}`);

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
        return notification.status === NotificationStatus.SENT;
      }

      // Implementa processamento com fallback entre canais
      return await this.sendWithFallback(notification as NotificationWithUser);
    } catch (error) {
      this.logger.error(
        `Erro ao processar notificação #${notificationId}: ${error.message}`,
        error.stack,
      );

      await this.markAsFailed(notificationId);
      return false;
    }
  }

  private async sendWithFallback(notification: NotificationWithUser): Promise<boolean> {
    if (!notification.user) {
      // Buscar o usuário se não estiver incluído na notificação
      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
      });
      
      if (!user) {
        throw new Error(
          `Usuário para notificação #${notification.id} não encontrado`,
        );
      }
      
      // Usar o usuário encontrado
      notification.user = user;
    }

    // Obter as estratégias em ordem de prioridade
    const strategies = this.channelFactory.getStrategiesInPriorityOrder();

    // Reordenar para priorizar o canal da notificação
    const primaryStrategy = this.channelFactory.getStrategy(
      notification.channel,
    );
    const orderedStrategies = [
      primaryStrategy,
      ...strategies.filter((s) => s.getChannel() !== notification.channel),
    ];

    // Tentar cada canal sequencialmente
    for (const strategy of orderedStrategies) {
      let destination: string;

      // Obter destino apropriado para o canal
      if (strategy.getChannel() === NotificationChannel.EMAIL) {
        destination = notification.user.email || '';
      } else if (
        strategy.getChannel() === NotificationChannel.SMS ||
        strategy.getChannel() === NotificationChannel.WHATSAPP
      ) {
        destination = notification.user.phone || '';
      } else {
        continue; // Pular canais não suportados
      }

      // Validar destino
      if (!destination || !strategy.validateDestination(destination)) {
        this.logger.warn(
          `Destino inválido para ${strategy.getChannel()}: ${destination}`,
        );
        continue;
      }

      // Tentar enviar com retry
      const success = await this.sendWithRetry(
        strategy,
        destination,
        notification.title,
        notification.content,
      );

      if (success) {
        // Atualizar status e canal utilizado
        await this.markAsSent(notification.id, strategy.getChannel());
        return true;
      }
    }

    // Se todos os canais falharem
    await this.markAsFailed(notification.id);
    return false;
  }

  private async sendWithRetry(
    strategy: any,
    destination: string,
    subject: string,
    content: string,
    maxRetries = 3,
  ): Promise<boolean> {
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      try {
        const success = await strategy.send(destination, subject, content);

        if (success) {
          return true;
        }

        // Aguardar antes da próxima tentativa (backoff exponencial)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        this.logger.error(
          `Erro ao enviar via ${strategy.getChannel()} (tentativa ${attempt}): ${error.message}`,
        );

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return false;
  }

  async markAsSent(id: number, channel?: NotificationChannel) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        ...(channel && { channel }),
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
      return this.createNotificationPreference(userId, {
        enableEmailNotifications: true,
        enableSmsNotifications: false,
        appointmentReminders: true,
        reminderTime: 24,
      });
    }

    return preference;
  }

  async createNotificationPreference(userId: number, data: any) {
    return this.prisma.notificationPreference.create({
      data: {
        userId,
        ...data,
      },
    });
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
}
