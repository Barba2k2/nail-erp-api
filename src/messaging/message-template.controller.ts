import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { MessageTemplateService } from './message-template.service';
import { CreateMessageTemplateDto } from './dto/create-message-template.dto';
import { QueryMessageTemplateDto } from './dto/query-message-template.dto';
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto';
import { TestMessageTemplateDto } from './dto/test-message-template.dto';

@Controller('admin/messaging/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class MessageTemplateController {
  constructor(
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  @Post()
  async create(@Body() createDto: CreateMessageTemplateDto) {
    return this.messageTemplateService.create(createDto);
  }

  @Get()
  async findAll(@Query() query: QueryMessageTemplateDto) {
    return this.messageTemplateService.findAll(query);
  }

  @Get('variables')
  async getAvailableVariables() {
    return this.messageTemplateService.getAvailableVariables();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.messageTemplateService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMessageTemplateDto,
  ) {
    return this.messageTemplateService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.messageTemplateService.remove(id);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.messageTemplateService.duplicate(id);
  }

  @Post(':id/set-default')
  async setDefault(@Param('id', ParseIntPipe) id: number) {
    return this.messageTemplateService.setDefaultTemplate(id);
  }

  @Post('test/email')
  async testEmail(@Body() testDto: TestMessageTemplateDto) {
    if (!testDto.testEmail) {
      throw new BadRequestException('E-mail para teste é obrigatório');
    }

    return this.messageTemplateService.testSendTemplate(
      +testDto.templateId,
      testDto.testEmail,
      testDto.testData,
    );
  }

  @Post('test/whatsapp')
  async testSms(@Body() testDto: TestMessageTemplateDto) {
    if (!testDto.testWhatsapp) {
      throw new BadRequestException(
        'Número de Whatsapp para teste é obrigatório',
      );
    }

    return this.messageTemplateService.testSendTemplate(
      +testDto.templateId,
      testDto.testWhatsapp,
      testDto.testData,
    );
  }

  @Post('preview')
  async previewTemplate(
    @Body('templateId', ParseIntPipe) id: number,
    @Body('testData') testData?: Record<string, any>,
  ) {
    const template = await this.messageTemplateService.findOne(id);

    const defaultData = {
      client: {
        name: 'Cliente Teste',
        firstName: 'Cliente',
        email: 'teste@email.com',
        phone: '(11) 98765-4321',
      },
      business: {
        name: 'Empresa Teste',
        phone: '(11) 1234-5678',
        address: 'Rua Teste, 123, São Paulo/SP',
        email: 'contato@empresa.com',
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
      resetLink: 'https://exemplo.com/resetar-senha?token=abc123',
      ...testData,
    };

    const processedTemplate = this.messageTemplateService.processTemplate(
      template,
      defaultData,
    );

    return {
      templateName: template.name,
      templateType: template.type,
      templatePurpose: template.purpose,
      ...processedTemplate,
    }
  }
}
