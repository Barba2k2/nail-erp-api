import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannelStrategy } from '../interface/notification-channel.interface';
import { TwilioService } from '../providers/twilio.service';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class SmsNotificationStrategy implements NotificationChannelStrategy {
  private readonly logger = new Logger(SmsNotificationStrategy.name);

  constructor(private readonly twilioService: TwilioService) {}

  async send(to: string, subject: string, content: string): Promise<boolean> {
    try {
      this.logger.log(`Enviando SMS para ${to}`);
      return await this.twilioService.sendSMS(to, content);
    } catch (error) {
      this.logger.error(`Erro ao enviar SMS: ${error.message}`, error.stack);
      return false;
    }
  }

  validateDestination(phone: string): boolean {
    if (!phone) return false;

    const cleanedPhone = phone.replace(/\D/g, '');

    return cleanedPhone.length >= 8;
  }

  getChannel(): NotificationChannel {
    return NotificationChannel.SMS;
  }
}
