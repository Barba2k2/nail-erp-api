import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannelStrategy } from "src/notifications/interface/notification-channel.interface";
import { MailgunService } from "../providers/mailgun.service";
import { NotificationChannel } from "@prisma/client";

@Injectable()
export class EmailNotificationStrategy implements NotificationChannelStrategy {
  private readonly logger = new Logger(EmailNotificationStrategy.name);

  constructor(private readonly mailgunService: MailgunService) { }

  async send(to: string, subject: string, content: string): Promise<boolean> {
    try {
      this.logger.log(`Enviando email para ${to}`)
      return await this.mailgunService.sendEmail(to, subject, content);
    } catch (error) {
      this.logger.error(`Erro ao enviar email: ${error.message}`, error.stack)
      return false;
    }
  }

  validateDestination(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getChannel(): NotificationChannel {
    return NotificationChannel.EMAIL;
  }
}