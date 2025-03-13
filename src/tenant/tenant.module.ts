import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SettingsModule } from 'src/settings/settings.module';
import { PublicTenantController, TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [TenantController, PublicTenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
