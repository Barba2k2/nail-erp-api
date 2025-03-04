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
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { DateUtils } from '../utils/date.utils';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { CreateAppointmentDto } from './appointments/dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './appointments/dto/reschedule-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  async findAll() {
    const appointments = await this.appointmentsService.findAll();

    // Adiciona campos separados de data e hora para cada agendamento
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

    // Retorna o agendamento com data e hora separados
    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const appointment = await this.appointmentsService.findOne(id);

    // Verifica se o agendamento foi encontrado
    if (!appointment) {
      throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
    }

    // Retorna o agendamento com data e hora separados
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

    // Retorna o agendamento com data e hora separados
    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const appointment = await this.appointmentsService.cancel(id);

    // Retorna o agendamento com data e hora separados
    return {
      ...appointment,
      ...DateUtils.formatAppointmentDateTime(appointment.date),
    };
  }
}
