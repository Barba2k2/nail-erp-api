import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ClientsModule } from './clients/clients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ServicesModule } from './services/services.module';
import { SettingsModule } from './settings/settings.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MessagingModule } from './messaging/messaging.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
      ignoreErrors: false,
      verboseMemoryLeak: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfessionalsModule,
    ClientsModule,
    AppointmentsModule,
    ServicesModule,
    SettingsModule,
    NotificationsModule,
    MessagingModule,
    TenantModule,
  ],
})
export class AppModule {}
