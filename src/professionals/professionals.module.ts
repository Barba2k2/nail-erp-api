import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService],
})
export class ProfessionalsModule {}
