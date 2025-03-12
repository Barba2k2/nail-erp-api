/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { MailgunService } from "src/notifications/providers/mailgun.service";
import { TwilioService } from "src/notifications/providers/twilio.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BusinessInfoService } from "src/settings/business-info/business-info.service";
import { CreateMessageTemplateDto } from "../dto/create-message-template.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class MessageTemplateService {
  private readonly logger = new Logger(MessageTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessInfoService: BusinessInfoService,
    private readonly mailgunService: MailgunService,
    private readonly twilioService: TwilioService,
  ) { }

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

      return await this.prisma.messageTemplate.create({ data: createDto });
    } catch (error) {
      this.logger.error(`Erro ao criar template: ${error.message}`);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ja existe um template padrao para este proposito. Desmarque-o como padrao primeiro'
          );
        }
      }
      
      throw error;
    }
  }
}
