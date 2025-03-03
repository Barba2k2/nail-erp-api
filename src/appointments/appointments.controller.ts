import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  async findAll() {
    return this.appointmentsService.findAll();
  }

  @Post()
  async create(@Body() data: any) {
    return this.appointmentsService.create(data);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.appointmentsService.findOne(id);
  }

  @Post(':id/reschedule')
  async reschedule(@Param('id') id: number, @Body() data: any) {
    return this.appointmentsService.reschedule(id, data);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: number) {
    return this.appointmentsService.cancel(id);
  }
}