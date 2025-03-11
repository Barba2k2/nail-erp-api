import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { AdminClientsController } from './clients/admin-clients.controller';
import { AdminClientsService } from './clients/admin-clients.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProfessionalsController, AdminClientsController],
  providers: [ProfessionalsService, AdminClientsService],
})
export class ProfessionalsModule {}