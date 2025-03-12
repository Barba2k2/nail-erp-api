import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessInfoController, PublicBusinessInfoController } from './business-info/business-info.controller';
import { BusinessInfoService } from './business-info/business-info.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SettingsController,
    BusinessInfoController,
    PublicBusinessInfoController,
  ],
  providers: [SettingsService, BusinessInfoService],
  exports: [SettingsService, BusinessInfoService],
})
export class SettingsModule {}
