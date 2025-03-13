import { Module } from '@nestjs/common';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SettingsModule } from 'src/settings/settings.module';
import { MessageTemplateController } from './message-template.controller';
import { MessageTemplateService } from './message-template.service';

@Module({
  imports: [PrismaModule, SettingsModule, NotificationsModule],
  controllers: [MessageTemplateController],
  providers: [MessageTemplateService],
  exports: [MessageTemplateService],
})
export class MessagingModule {}
