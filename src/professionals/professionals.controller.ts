import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { ProfessionalsService } from './professionals.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
@Controller('admin')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get('profile')
  async getProfile(@Req() req) {
    console.log('User from token:', req.user);
    return this.professionalsService.getProfile(req.user.id);
  }

  @Put('profile')
  async updateProfile(@Req() req, @Body() data: any) {
    return this.professionalsService.updateProfile(req.user.id, data);
  }

  @Get('appointments')
  async getAppointments(@Req() req) {
    return this.professionalsService.getAppointments(req.user.userId);
  }

  @Put('appointments/:id/status')
  async updateAppointmentStatus(@Param('id') id: string, @Body() data: any) {
    return this.professionalsService.updateAppointmentStatus(
      Number(id),
      data.status,
    );
  }

  @Get('services')
  async getServices(@Req() req) {
    return this.professionalsService.getServices(req.user.userId);
  }

  @Post('services')
  async createService(@Req() req, @Body() data: any) {
    return this.professionalsService.createService(req.user.userId, data);
  }

  @Put('services/:id')
  async updateService(@Param('id') id: string, @Body() data: any) {
    return this.professionalsService.updateService(Number(id), data);
  }

  @Delete('services/:id')
  async deleteService(@Param('id') id: string) {
    return this.professionalsService.deleteService(Number(id));
  }
}
