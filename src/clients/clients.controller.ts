import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { RolesGuard } from '../auth/decorator/roles.guard';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { DateUtils } from '../utils/date.utils';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentCanceledEvent, AppointmentCreatedEvent, AppointmentRescheduledEvent } from 'src/appointments/events/appointment.events';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('client')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Roles('CLIENT')
  @Get('profile')
  async getProfile(@Req() req) {
    return this.clientsService.getProfile(req.user.id);
  }

  @Roles('CLIENT')
  @Put('profile')
  async updateProfile(@Req() req, @Body() data: any) {
    return this.clientsService.updateProfile(req.user.id, data);
  }

  @Roles('CLIENT', 'PROFESSIONAL')
  @Get('appointments')
  async getAppointments(@Req() req) {
    const appointments = await this.clientsService.getAppointments(req.user.id);

    return appointments.map((appointment) => ({
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    }));
  }

  @Roles('CLIENT', 'PROFESSIONAL')
  @Post('appointments')
  async createAppointment(@Req() req, @Body() data: any) {
    if (!req.user || !req.user.id) {
      throw new Error('Usuário não autenticado ou ID ausente no token');
    }

    const appointment = await this.clientsService.createAppointment(
      req.user.id,
      data,
    );

    this.eventEmitter.emit(
      'appointment.created',
      new AppointmentCreatedEvent(appointment.id),
    );

    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Roles('CLIENT', 'PROFESSIONAL')
  @Put('appointments/:id/reschedule')
  async rescheduleAppointment(@Param('id') id: string, @Body() data: any) {
    const appointment = await this.clientsService.rescheduleAppointment(
      Number(id),
      data,
    );

    this.eventEmitter.emit(
      'appointment.rescheduled',
      new AppointmentRescheduledEvent(appointment.id),
    );

    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Roles('CLIENT', 'PROFESSIONAL')
  @Delete('appointments/:id')
  async cancelAppointment(@Param('id') id: string) {
    const appointment = await this.clientsService.cancelAppointment(Number(id));

    this.eventEmitter.emit(
      'appointment.canceled',
      new AppointmentCanceledEvent(appointment.id),
    );

    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }
}
