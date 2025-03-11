import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: Twilio | null = null;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER', '');

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.error('Twilio nao esta configurado corretamente');
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
}
