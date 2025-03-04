import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { SpecialBusinessDayDto } from './dto/special-business-day.dto';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('initialize-hours')
  async initializeDefaultHours() {
    return this.settingsService.initializeDefaultHours();
  }

  @Get('business-hours')
  async getBusinessHours() {
    return this.settingsService.getBusinessHours();
  }

  @Put('business-hours')
  async updateBusinessHours(@Body() data: UpdateBusinessHoursDto) {
    return this.settingsService.updateBusinessHours(data);
  }

  @Get('special-days')
  async getSpecialDays() {
    return this.settingsService.getSpecialDays();
  }

  @Post('special-days')
  async addSpecialDay(@Body() data: SpecialBusinessDayDto) {
    return this.settingsService.addSpecialDay(data);
  }

  @Delete('special-days/:id')
  async removeSpecialDay(@Param('id') id: string) {
    return this.settingsService.removeSpecialDay(+id);
  }
}
