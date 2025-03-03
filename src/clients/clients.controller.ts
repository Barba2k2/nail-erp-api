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
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { Roles } from 'src/auth/decorator/roler.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('client')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Endpoints de perfil: apenas CLIENT pode acessar

  @Roles('CLIENT')
  @Get('profile')
  async getProfile(@Req() req) {
    return this.clientsService.getProfile(req.user.userId);
  }

  @Roles('CLIENT')
  @Put('profile')
  async updateProfile(@Req() req, @Body() data: any) {
    return this.clientsService.updateProfile(req.user.userId, data);
  }

  // Endpoints de agendamentos: podem ser acessados tanto por CLIENT quanto por PROFESSIONAL

  @Roles('CLIENT', 'PROFESSIONAL')
  @Get('appointments')
  async getAppointments(@Req() req) {
    return this.clientsService.getAppointments(req.user.userId);
  }

  @Roles('CLIENT', 'PROFESSIONAL')
  @Post('appointments')
  async createAppointment(@Req() req, @Body() data: any) {
    return this.clientsService.createAppointment(req.user.userId, data);
  }

  @Roles('CLIENT', 'PROFESSIONAL')
  @Put('appointments/:id/reschedule')
  async rescheduleAppointment(@Param('id') id: string, @Body() data: any) {
    return this.clientsService.rescheduleAppointment(Number(id), data);
  }

  @Roles('CLIENT', 'PROFESSIONAL')
  @Delete('appointments/:id')
  async cancelAppointment(@Param('id') id: string) {
    return this.clientsService.cancelAppointment(Number(id));
  }
}
