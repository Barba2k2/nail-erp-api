import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { DateUtils } from '../utils/date.utils';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { RolesGuard } from '../auth/decorator/roles.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentCanceledEvent, AppointmentCreatedEvent, AppointmentRescheduledEvent } from './events/appointment.events';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  async findAll() {
    const appointments = await this.appointmentsService.findAll();

    return appointments.map((appointment) => ({
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    }));
  }

  @Post()
  async create(@Req() req, @Body() data: CreateAppointmentDto) {
    if (!req.user || !req.user.id) {
      throw new Error('Usuário não autenticado ou ID ausente');
    }

    const appointment = await this.appointmentsService.create(
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

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const appointment = await this.appointmentsService.findOne(id);

    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
    }

    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Post(':id/reschedule')
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: RescheduleAppointmentDto,
  ) {
    const appointment = await this.appointmentsService.reschedule(id, data);

    this.eventEmitter.emit(
      'appointment.rescheduled',
      new AppointmentRescheduledEvent(appointment.id),
    );

    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const appointment = await this.appointmentsService.cancel(id);

    this.eventEmitter.emit(
      'appointment.canceled',
      new AppointmentCanceledEvent(appointment.id),
    );

    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Get('available-slots')
  async getAvailableSlots(@Query() query: AvailableSlotsDto) {
    return this.appointmentsService.getAvailableSlots(query);
  }

  @Post(':id/feedback')
  async addFeedback(
    @Param('id') id: string,
    @Body() data: { feedback: string; rating?: number },
  ) {
    return this.appointmentsService.addAppointmentFeedback(
      +id,
      data.feedback,
      data.rating,
    );
  }
}
