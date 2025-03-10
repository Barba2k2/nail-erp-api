import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/decorator/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Req() req) {
    return this.notificationsService.findAllForUser(req.user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.notificationsService.deleteNotification(+id);
  }

  @Get('preferences')
  async getPreferences(@Req() req) {
    return this.notificationsService.getNotificationPreference(req.user.id);
  }

  @Put('preferences')
  async updatePreferences(
    @Req() req,
    @Body() updatePreferenceDto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updateNotificationPreference(
      req.user.id,
      updatePreferenceDto,
    );
  }
}

// Controlador administrativo para profissionais enviarem notificações
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('users/:userId')
  async findAllForUser(@Param('userId') userId: string) {
    return this.notificationsService.findAllForUser(+userId);
  }

  @Post('send-custom')
  async sendCustomNotification(@Body() data: any) {
    const notification = await this.notificationsService.createNotification({
      userId: data.userId,
      type: 'CUSTOM_MESSAGE',
      channel: data.channel || 'EMAIL',
      title: data.title,
      content: data.content,
      scheduledFor: new Date(),
    });

    await this.notificationsService.processNotification(notification.id);

    return { success: true, message: 'Notificação enviada com sucesso' };
  }
}
