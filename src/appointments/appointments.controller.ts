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

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

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

    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const appointment = await this.appointmentsService.cancel(id);

    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Get('available-slots')
  async getAvailableSlots(@Query() query: AvailableSlotsDto) {
    return this.appointmentsService.getAvailableSlots(query);
  }
}
