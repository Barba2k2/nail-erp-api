import {
  Controller,
  UseGuards,
  Get,
  Put,
  Req,
  Body,
  Post,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { ClientHistoryService } from './client-history.service';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/decorator/roles.guard';

@Controller('client/history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class ClientHistoryController {
  constructor(private readonly clientHistoryService: ClientHistoryService) {}

  @Get()
  async getClientHistory(@Req() req) {
    return this.clientHistoryService.getClientHistory(req.user.id);
  }

  // @Get('profile')
  // async getMyProfile(@Req() req) {
  //   return this.clientHistoryService.getClientProfile(req.user.id);
  // }

  @Put('preferences')
  async updateClientPreferences(@Req() req, @Body() data: any) {
    return this.clientHistoryService.updateClientPreferences(req.user.id, data);
  }

  // @Post('appointments/:id/feedback')
  // async addFeedback(
  //   @Param('id') id: string,
  //   @Body() data: { feedback: string; rating?: number },
  // ) {
  //   return this.clientHistoryService.addAppointmentFeddback(
  //     +id,
  //     data.feedback,
  //     data.rating,
  //   );
  // }
}

@Controller('admin/clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class AdminClientHistoryController {
  constructor(private readonly clientHistoryService: ClientHistoryService) {}

  @Get(':id/history')
  async getClientHistory(@Param('id') id: string) {
    return this.clientHistoryService.getClientHistory(+id);
  }

  @Get(':id/profile')
  async getClientProfile(@Param('id') id: string) {
    return this.clientHistoryService.getClientProfile(+id);
  }

  @Put(':id/notes')
  async updateClientNotes(
    @Param('id') id: string,
    @Body('notes') data: { notes: string },
  ) {
    return this.clientHistoryService.updateClientNotes(+id, data.notes);
  }

  @Put(':id/preferences')
  async updateClientPreferences(@Param('id') id: string, @Body() data: any) {
    return this.clientHistoryService.updateClientPreferences(+id, data);
  }
}
