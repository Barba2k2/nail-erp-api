import { Injectable } from '@nestjs/common';
import { EmailNotificationStrategy } from '../strategies/email-strategy';
import { SmsNotificationStrategy } from '../strategies/sms.strategy';
import { WhatsAppNotificationStrategy } from '../strategies/whatsapp-strategy';
import { NotificationChannel } from '@prisma/client';
import { NotificationChannelStrategy } from '../interface/notification-channel.interface';

@Injectable()
export class NotificationChannelFactory {
  constructor(
    private readonly emailStrategy: EmailNotificationStrategy,
    private readonly smsStrategy: SmsNotificationStrategy,
    private readonly whatsappStrategy: WhatsAppNotificationStrategy,
  ) {}

  getStrategy(channel: NotificationChannel): NotificationChannelStrategy {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailStrategy;
      case NotificationChannel.SMS:
        return this.smsStrategy;
      case NotificationChannel.WHATSAPP:
        return this.whatsappStrategy;
      default:
        return this.emailStrategy;
    }
  }

  getStrategiesInPriorityOrder(): NotificationChannelStrategy[] {
    return [this.whatsappStrategy, this.smsStrategy, this.emailStrategy];
  }
}
