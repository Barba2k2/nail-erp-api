import {
  Controller,
  UseGuards,
  Get,
  Post,
  Delete,
  Query,
  Param,
  ParseIntPipe,
  Body,
  Put,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationType } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
@Controller('admin/notification-templates')
export class NotificationTemplatesController {
  constructor(
    private readonly templatesService: NotificationTemplatesService,
  ) {}

  @Get()
  async findAll() {
    return this.templatesService.findAll();
  }

  @Get('by-type')
  async findByType(@Query('type') type: NotificationType) {
    return this.templatesService.findByType(type);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.templatesService.create(data);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.templatesService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.remove(id);
  }

  @Get('preview/:id')
  async preview(@Param('id', ParseIntPipe) id: number, @Query() query: any) {
    const template = await this.templatesService.findOne(id);

    const previewData = {
      user: {
        name: query.userName || 'Nome do cliente',
      },
      service: {
        name: query.serviceName || 'Nome do servico',
        duration: query.serviceDuration || 60,
        price: query.servicePrice || 100.0,
      },
      appointment: {
        date: query.date || '01/01/2025',
        time: query.time || '14:00',
      },
      message:
        query.message || 'Esta e uma mensagem personalizada para o cliente',
    };

    return this.templatesService.processTemplate(template, previewData);
  }
}
