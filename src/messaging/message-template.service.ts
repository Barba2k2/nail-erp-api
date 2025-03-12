import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { QueryMessageTemplateDto } from './dto/query-message-template.dto';
import {
  TEMPLATE_VARIABLES,
  TemplateVariable,
} from './interfaces/message-template.interface';
import { BusinessInfoService } from '../settings/business-info/business-info.service';
import { MailgunService } from '../notifications/providers/mailgun.service';
import { TwilioService } from '../notifications/providers/twilio.service';
import { MessageTemplatePurpose, MessageTemplateType, Prisma } from '@prisma/client';


@Injectable()
export class MessageTemplateService {
  private readonly logger = new Logger(MessageTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessInfoService: BusinessInfoService,
    private readonly mailgunService: MailgunService,
    private readonly twilioService: TwilioService,
  ) {}

  async create(createDto: CreateMessageTemplateDto) {
    try {
      if (createDto.isDefault) {
        await this.prisma.messageTemplate.updateMany({
          where: {
            purpose: createDto.purpose,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return await this.prisma.messageTemplate.create({
        data: createDto,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao criar template: ${error.message}`,
        error.stack,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Já existe um template padrão para este propósito. Desmarque-o como padrão primeiro.',
          );
        }
      }

      throw error;
    }
  }

  async findAll(query: QueryMessageTemplateDto) {
    const where: Prisma.MessageTemplateWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.purpose) {
      where.purpose = query.purpose;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.messageTemplate.findMany({
      where,
      orderBy: [
        { purpose: 'asc' },
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async findOne(id: number) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template com ID ${id} não encontrado`);
    }

    return template;
  }

  async update(id: number, updateDto: UpdateMessageTemplateDto) {
    try {
      const template = await this.findOne(id);

      if (
        updateDto.isDefault &&
        (!template.isDefault || updateDto.purpose !== template.purpose)
      ) {
        const purpose = updateDto.purpose || template.purpose;

        await this.prisma.messageTemplate.updateMany({
          where: {
            purpose,
            isDefault: true,
            id: { not: id },
          },
          data: {
            isDefault: false,
          },
        });
      }

      return await this.prisma.messageTemplate.update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar template ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Já existe um template padrão para este propósito. Desmarque-o como padrão primeiro.',
          );
        }
      }

      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.messageTemplate.delete({
      where: { id },
    });
  }

  async findDefault(purpose: MessageTemplatePurpose) {
    const template = await this.prisma.messageTemplate.findFirst({
      where: {
        purpose,
        isDefault: true,
      },
    });

    if (!template) {
      throw new NotFoundException(
        `Template padrão para ${purpose} não encontrado`,
      );
    }

    return template;
  }

  async setDefaultTemplate(id: number) {
    const template = await this.findOne(id);

    await this.prisma.messageTemplate.updateMany({
      where: {
        purpose: template.purpose,
        isDefault: true,
        id: { not: id },
      },
      data: {
        isDefault: false,
      },
    });

    return this.prisma.messageTemplate.update({
      where: { id },
      data: {
        isDefault: true,
      },
    });
  }

  processTemplate(template: any, data: any) {
    let subject = template.subject;
    let content = template.content;

    if (data.client) {
      subject = subject.replace(/{{client\.name}}/g, data.client.name || '');
      content = content.replace(/{{client\.name}}/g, data.client.name || '');

      if (data.client.name) {
        const firstName = data.client.name.split(' ')[0];
        subject = subject.replace(/{{client\.firstName}}/g, firstName);
        content = content.replace(/{{client\.firstName}}/g, firstName);
      }

      subject = subject.replace(/{{client\.email}}/g, data.client.email || '');
      content = content.replace(/{{client\.email}}/g, data.client.email || '');

      subject = subject.replace(/{{client\.phone}}/g, data.client.phone || '');
      content = content.replace(/{{client\.phone}}/g, data.client.phone || '');
    }

    if (data.business) {
      subject = subject.replace(
        /{{business\.name}}/g,
        data.business.name || '',
      );
      content = content.replace(
        /{{business\.name}}/g,
        data.business.name || '',
      );

      subject = subject.replace(
        /{{business\.phone}}/g,
        data.business.phone || '',
      );
      content = content.replace(
        /{{business\.phone}}/g,
        data.business.phone || '',
      );

      subject = subject.replace(
        /{{business\.address}}/g,
        data.business.address || '',
      );
      content = content.replace(
        /{{business\.address}}/g,
        data.business.address || '',
      );

      subject = subject.replace(
        /{{business\.email}}/g,
        data.business.email || '',
      );
      content = content.replace(
        /{{business\.email}}/g,
        data.business.email || '',
      );
    }

    if (data.appointment) {
      subject = subject.replace(
        /{{appointment\.date}}/g,
        data.appointment.date || '',
      );
      content = content.replace(
        /{{appointment\.date}}/g,
        data.appointment.date || '',
      );

      subject = subject.replace(
        /{{appointment\.time}}/g,
        data.appointment.time || '',
      );
      content = content.replace(
        /{{appointment\.time}}/g,
        data.appointment.time || '',
      );

      subject = subject.replace(
        /{{appointment\.service}}/g,
        data.appointment.service || '',
      );
      content = content.replace(
        /{{appointment\.service}}/g,
        data.appointment.service || '',
      );

      subject = subject.replace(
        /{{appointment\.price}}/g,
        data.appointment.price || '',
      );
      content = content.replace(
        /{{appointment\.price}}/g,
        data.appointment.price || '',
      );
    }

    if (data.service) {
      subject = subject.replace(/{{service\.name}}/g, data.service.name || '');
      content = content.replace(/{{service\.name}}/g, data.service.name || '');

      subject = subject.replace(
        /{{service\.price}}/g,
        data.service.price || '',
      );
      content = content.replace(
        /{{service\.price}}/g,
        data.service.price || '',
      );

      subject = subject.replace(
        /{{service\.duration}}/g,
        data.service.duration || '',
      );
      content = content.replace(
        /{{service\.duration}}/g,
        data.service.duration || '',
      );
    }

    if (data.resetLink) {
      subject = subject.replace(/{{resetLink}}/g, data.resetLink);
      content = content.replace(/{{resetLink}}/g, data.resetLink);
    }

    const currentDate = new Date().toLocaleDateString('pt-BR');
    subject = subject.replace(/{{currentDate}}/g, currentDate);
    content = content.replace(/{{currentDate}}/g, currentDate);

    return { subject, content };
  }

  async testSendTemplate(
    id: number,
    testEmail: string,
    testData?: Record<string, any>,
  ) {
    const template = await this.findOne(id);
    const businessInfo = await this.businessInfoService.getBusinessInfo();

    const defaultData = {
      client: {
        name: 'Cliente Teste',
        firstName: 'Cliente',
        email: testEmail,
        phone: '(11) 98765-4321',
      },
      business: {
        name: businessInfo.name,
        phone: businessInfo.phone,
        address: `${businessInfo.address}, ${businessInfo.city}/${businessInfo.state}`,
        email: businessInfo.email,
      },
      appointment: {
        date: '25/03/2025',
        time: '14:30',
        service: 'Manicure',
        price: 'R$ 50,00',
      },
      service: {
        name: 'Manicure',
        price: 'R$ 50,00',
        duration: '45 minutos',
      },
      resetLink: 'https:https://exemplo.com/resetar-senha?token=abc123',
      ...testData,
    };

    const { subject, content } = this.processTemplate(template, defaultData);

    if (
      template.type === MessageTemplateType.EMAIL ||
      template.type === MessageTemplateType.BOTH
    ) {
      try {
        const result = await this.mailgunService.sendEmail(
          testEmail,
          subject,
          content,
        );
        return {
          success: result,
          message: result
            ? 'Email de teste enviado com sucesso'
            : 'Falha ao enviar email de teste',
          emailTo: testEmail,
          subject,
          preview: content.substring(0, 300) + '...',
        };
      } catch (error) {
        this.logger.error(
          `Erro ao enviar email de teste: ${error.message}`,
          error.stack,
        );
        return {
          success: false,
          message: `Erro ao enviar email: ${error.message}`,
          emailTo: testEmail,
          subject,
          preview: content.substring(0, 300) + '...',
        };
      }
    }

    return {
      success: false,
      message: 'Este template não está configurado para email',
      emailTo: testEmail,
      subject,
      preview: content.substring(0, 300) + '...',
    };
  }

  async testSendWhatsApp(
    id: number,
    phoneNumber: string,
    testData?: Record<string, any>,
  ) {
    const template = await this.findOne(id);
    const businessInfo = await this.businessInfoService.getBusinessInfo();

    if (
      template.type !== MessageTemplateType.WHATSAPP &&
      template.type !== MessageTemplateType.BOTH
    ) {
      return {
        success: false,
        message: 'Este template não está configurado para WhatsApp',
      };
    }

    const defaultData = {
      client: {
        name: 'Cliente Teste',
        firstName: 'Cliente',
        email: 'teste@email.com',
        phone: phoneNumber,
      },
      business: {
        name: businessInfo.name,
        phone: businessInfo.phone,
        address: `${businessInfo.address}, ${businessInfo.city}/${businessInfo.state}`,
        email: businessInfo.email,
      },
      appointment: {
        date: '25/03/2025',
        time: '14:30',
        service: 'Manicure',
        price: 'R$ 50,00',
      },
      service: {
        name: 'Manicure',
        price: 'R$ 50,00',
        duration: '45 minutos',
      },
      resetLink: 'https:https://exemplo.com/resetar-senha?token=abc123',
      ...testData,
    };

    const { content } = this.processTemplate(template, defaultData);

    try {
      const result = await this.twilioService.sendSMS(phoneNumber, content);
      return {
        success: result,
        message: result
          ? 'Mensagem WhatsApp de teste enviada com sucesso'
          : 'Falha ao enviar mensagem WhatsApp de teste',
        phoneTo: phoneNumber,
        preview: content.substring(0, 300) + '...',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar WhatsApp de teste: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Erro ao enviar WhatsApp: ${error.message}`,
        phoneTo: phoneNumber,
        preview: content.substring(0, 300) + '...',
      };
    }
  }

  getAvailableVariables(): TemplateVariable[] {
    return TEMPLATE_VARIABLES;
  }

  async duplicate(id: number) {
    const template = await this.findOne(id);

    const {
      id: _,
      isDefault,
      createdAt,
      updatedAt,
      ...templateData
    } = template;

    return this.create({
      ...templateData,
      name: `Cópia de ${template.name}`,
      isDefault: false,
    } as CreateMessageTemplateDto);
  }
}
