import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController, AdminNotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { AppointmentNotificationListener } from './listeners/appointment-notification.listener';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    NotificationsService,
    NotificationSchedulerService,
    AppointmentNotificationListener,
  ],
  exports: [NotificationsService, NotificationSchedulerService],
})
export class NotificationsModule {}
