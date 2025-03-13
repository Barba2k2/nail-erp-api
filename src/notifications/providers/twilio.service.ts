import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: Twilio | null = null;
  private readonly fromNumber: string;
  private readonly whatsappFromNumber: string;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER', '');
    this.whatsappFromNumber = this.configService.get<string>(
      'TWILIO_WHATSAPP_FROM_NUMBER',
      this.fromNumber,
    );
    this.isDevelopment =
      this.configService.get<string>('NODE_ENV') !== 'production';

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
      this.logger.log('Twilio configurado com sucesso');
    } else {
      this.logger.warn('Twilio não está configurado completamente');
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.client || !this.fromNumber) {
      this.logger.error('Twilio nao esta configurado corretamente');
      return false;
    }

    const formattedTo = to.replace(/\s+|\(|\)|-/g, '');

    try {
      const toNumber = formattedTo.startsWith('+')
        ? formattedTo
        : formattedTo.startsWith('55')
          ? `+${formattedTo}`
          : `+55${formattedTo}`;

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: toNumber,
      });

      this.logger.log(`SMS enviado para ${to}: ${result.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Error ao enviar SMS: ${error.message}`, error.stack);
      return false;
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    if (!this.client || !this.whatsappFromNumber) {
      this.logger.error('WhatsApp nao esta configurado corretamente');

      if (this.isDevelopment) {
        this.logger.log(
          `[DEV] Simulando envio de WhatsApp para ${to}: ${message.substring(0, 50)}...`,
        );
        return true;
      }

      return false;
    }

    const formattedTo = this.formatPhoneNumber(to);
    const whatsappTo = `whatsapp:${formattedTo}`;
    const whatsappFrom = `whatsapp:${this.whatsappFromNumber}`;

    try {
      // Em desenvolvimento, apenas simular envio
      if (
        this.isDevelopment &&
        this.configService.get('DISABLE_ACTUAL_WHATSAPP', 'true') === 'true'
      ) {
        this.logger.log(
          `[DEV] Simulando envio de WhatsApp via Twilio para ${whatsappTo}`,
        );
        this.logger.debug(`[DEV] Mensagem: ${message.substring(0, 50)}...`);
        return true;
      }

      // Enviar de fato
      const result = await this.client.messages.create({
        body: message,
        from: whatsappFrom,
        to: whatsappTo,
      });

      this.logger.log(`WhatsApp enviado para ${to}: ${result.sid}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar WhatsApp: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    const formattedTo = phone.replace(/\s+|\(|\)|-/g, '');

    return formattedTo.startsWith('+')
      ? formattedTo
      : formattedTo.startsWith('55')
        ? `+${formattedTo}`
        : `+55${formattedTo}`;
  }
}
