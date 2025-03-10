import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminClientHistoryController,
  ClientHistoryController,
} from './history/client-history.controller';
import { ClientHistoryService } from './history/client-history.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ClientsController,
    ClientHistoryController,
    AdminClientHistoryController,
  ],
  providers: [ClientsService, ClientHistoryService],
})
export class ClientsModule {}
