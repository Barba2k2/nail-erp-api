import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController, AdminNotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, NotificationSchedulerService],
  exports: [NotificationsService, NotificationSchedulerService],
})
export class NotificationsModule {}
