import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannelStrategy } from '../interface/notification-channel.interface';
import { NotificationChannel } from '@prisma/client';
import { TwilioService } from '../providers/twilio.service';

@Injectable()
export class WhatsAppNotificationStrategy
  implements NotificationChannelStrategy
{
  private readonly logger = new Logger(WhatsAppNotificationStrategy.name);

  constructor(private readonly twilioService: TwilioService) {}

  async send(to: string, subject: string, content: string): Promise<boolean> {
    try {
      this.logger.log(`Enviando WhatsApp para ${to}`);
      return await this.twilioService.sendWhatsApp(to, content);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar WhatsApp: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
  validateDestination(phone: string): boolean {
    if (!phone) return false;

    const cleanedPhone = phone.replace(/\D/g, '');

    return cleanedPhone.length >= 8;
  }

  getChannel(): NotificationChannel {
    return NotificationChannel.WHATSAPP;
  }
}
