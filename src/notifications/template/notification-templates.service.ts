import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.notificationTemplate.findMany({
      orderBy: {
        type: 'asc',
      },
    });
  }

  async findByType(type: NotificationType) {
    return this.prisma.notificationTemplate.findMany({
      where: { type },
      orderBy: {
        isDefault: 'desc',
      },
    });
  }

  async findTemplateByPurpose(purpose: string) {
    let type: NotificationType;

    switch (purpose.toUpperCase()) {
      case 'PASSWORD_RECOVERY':
        type = NotificationType.PASSWORD_RECOVERY;
        break;
      case 'APPOINTMENT_REMINDER':
        type = NotificationType.APPOINTMENT_REMINDER;
        break;
      case 'APPOINTMENT_CONFIRMATION':
        type = NotificationType.APPOINTMENT_CONFIRMATION;
        break;
      case 'APPOINTMENT_CANCELLATION':
        type = NotificationType.APPOINTMENT_CANCELLATION;
        break;
      case 'APPOINTMENT_RESCHEDULED':
        type = NotificationType.APPOINTMENT_RESCHEDULED;
        break;
      case 'CUSTOM':
      case 'CUSTOM_MESSAGE':
        type = NotificationType.CUSTOM_MESSAGE;
        break;
      default:
        throw new NotFoundException(
          `Template com propósito ${purpose} não encontrado`,
        );
    }

    return this.findDefault(type);
  }

  async findDefault(type: NotificationType) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        type,
        isDefault: true,
      },
    });

    if (!template) {
      throw new NotFoundException(
        `Template padrao para ${type} nao encontrado`,
      );
    }

    return template;
  }

  async findOne(id: number) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template com ID ${id} nao encontrado`);
    }

    return template;
  }

  async create(data: any) {
    if (data.isDefault) {
      await this.prisma.notificationTemplate.updateMany({
        where: {
          type: data.type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.notificationTemplate.create({
      data,
    });
  }

  async update(id: number, data: any) {
    const template = await this.findOne(id);

    if (data.isDefault && data.isDefault !== template.isDefault) {
      await this.prisma.notificationTemplate.updateMany({
        where: {
          type: template.type,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    const template = await this.findOne(id);

    if (template.isDefault) {
      throw new Error(
        'Nao e possível excluir o template padrão. Defina outro template como padrão primeiro.',
      );
    }

    return this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  processTemplate(template: any, data: any) {
    let content = template.content;
    let subject = template.subject;

    if (data.user) {
      content = content.replace(/{{user\.name}}/g, data.user.name || '');
      subject = subject.replace(/{{user\.name}}/g, data.user.name || '');
    }

    if (data.service) {
      content = content.replace(/{{service\.name}}/g, data.service.name || '');
      subject = subject.replace(/{{service\.name}}/g, data.service.name || '');

      content = content.replace(
        /{{service\.duration}}/g,
        data.service.duration?.toString() || '',
      );
      subject = subject.replace(
        /{{service\.duration}}/g,
        data.service.duration?.toString() || '',
      );

      const formattedPrice = data.service.price
        ? data.service.price.toFixed(2)
        : '';

      content = content.replace(/{{service\.price}}/g, formattedPrice);
      subject = subject.replace(/{{service\.price}}/g, formattedPrice);
    }

    if (data.appointment) {
      content = content.replace(
        /{{appointment\.date}}/g,
        data.appointment.date?.toString() || '',
      );
      subject = subject.replace(
        /{{appointment\.date}}/g,
        data.appointment.date?.toString() || '',
      );
    }

    if (data.message) {
      content = content.replace(/{{message}}/g, data.message);
      subject = subject.replace(/{{message}}/g, data.message);
    }

    return {
      subject,
      content,
    };
  }
}
