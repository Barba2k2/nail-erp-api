import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SettingsModule } from 'src/settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
