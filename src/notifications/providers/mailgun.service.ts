import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);
  private mailgun;
  private mg;
  private readonly domain: string;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.mailgun = new Mailgun(FormData);

    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    if (!apiKey) {
      this.logger.error('Mailgun API key nao configurado');
    }

    this.domain = this.configService.get<string>('MAILGUN_DOMAIN', '');
    this.from = this.configService.get<string>(
      'EMAIL_FORM',
      'no-reply@example.com',
    );

    this.mg = this.mailgun.client({
      username: 'api',
      key: apiKey || '',
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    if (!this.mg || !this.domain) {
      this.logger.error('Mailgun nao esta configurado corretamente');
      return false;
    }

    try {
      const data = {
        from: this.from,
        to: [to],
        subject: subject,
        html: htmlContent,
      };

      const response = await this.mg.messages.create(this.domain, data);
      this.logger.log(`Email enviado para ${to}: ${response.status}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email: ${error.message}`, error.stack);
      return false;
    }
  }
}
