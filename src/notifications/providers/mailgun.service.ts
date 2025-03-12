import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';
import Mailgun from 'mailgun.js';

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);
  private mailgun;
  private mg;
  private readonly domain: string;
  private readonly from: string;
  private isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    try {
      this.mailgun = new Mailgun(FormData);

      const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
      this.domain = this.configService.get<string>('MAILGUN_DOMAIN', '');
      this.from = this.configService.get<string>(
        'EMAIL_FROM',
        'postmaster@sandboxc04e07b0236e408089ac9ea095494000.mailgun.org',
      );

      // Log detalhado da configuração (sem expor a chave completa)
      this.logger.log(
        `Configurando Mailgun com: Domain=${this.domain}, From=${this.from}`,
      );
      if (apiKey) {
        this.logger.log(
          `API Key está presente (primeiros 4 caracteres: ${apiKey.substring(0, 4)}...)`,
        );
      } else {
        this.logger.error('MAILGUN_API_KEY não está configurada no .env');
      }

      if (!this.domain) {
        this.logger.error('MAILGUN_DOMAIN não está configurado no .env');
      }

      if (apiKey && this.domain) {
        // Inicializa o cliente Mailgun
        this.mg = this.mailgun.client({
          username: 'api',
          key: apiKey,
        });
        this.isConfigured = true;
        this.logger.log('Mailgun configurado com sucesso');
      } else {
        this.logger.warn(
          'Mailgun não configurado completamente devido à falta de configurações',
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao inicializar Mailgun: ${error.message}`,
        error.stack,
      );
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    this.logger.log(
      `Tentando enviar email para ${to} com assunto "${subject}"`,
    );

    // Verificar NODE_ENV
    const environment = this.configService.get<string>('NODE_ENV');
    this.logger.log(`Ambiente atual: ${environment}`);

    if (!this.isConfigured) {
      this.logger.error('Mailgun não está configurado corretamente');

      // Em ambiente de produção, não devemos falhar silenciosamente
      if (environment === 'production') {
        this.logger.error(
          `Não foi possível enviar email de produção para ${to} devido à configuração incompleta`,
        );
        return false;
      }

      // Em outros ambientes, simulamos o envio
      this.logger.log('Simulando envio de email em ambiente não-produção');
      this.logger.log(`Para: ${to}`);
      this.logger.log(`Assunto: ${subject}`);
      this.logger.log(`Conteúdo: ${htmlContent.substring(0, 100)}...`);
      return true;
    }

    try {
      this.logger.log(
        `Enviando email via Mailgun: domain=${this.domain}, from=${this.from}, to=${to}`,
      );

      const data = {
        from: this.from,
        to: [to],
        subject: subject,
        html: htmlContent,
      };

      this.logger.log('Dados do email preparados, chamando API do Mailgun');
      const response = await this.mg.messages.create(this.domain, data);
      this.logger.log(`Resposta do Mailgun: ${JSON.stringify(response)}`);

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email via Mailgun: ${error.message}`,
        error.stack,
      );
      if (error.response) {
        this.logger.error(
          `Detalhes da resposta: ${JSON.stringify(error.response)}`,
        );
      }
      return false;
    }
  }
}
