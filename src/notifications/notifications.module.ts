import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  NotificationsController,
  AdminNotificationsController,
} from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { AppointmentNotificationListener } from './listeners/appointment-notification.listener';
import { NotificationTemplatesController } from './template/notification-templates.controller';
import { NotificationTemplatesService } from './template/notification-templates.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    NotificationsController,
    AdminNotificationsController,
    NotificationTemplatesController,
  ],
  providers: [
    NotificationsService,
    NotificationSchedulerService,
    AppointmentNotificationListener,
    NotificationTemplatesService,
  ],
  exports: [
    NotificationsService,
    NotificationSchedulerService,
    NotificationTemplatesService,
  ],
})
export class NotificationsModule {}
