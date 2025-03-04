import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimeBlocksService } from './time-blocks.service';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { UpdateTimeBlockDto } from './dto/update-time-block.dto';
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';

@Controller('admin/time-blocks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class TimeBlocksController {
  constructor(private readonly timeBlocksService: TimeBlocksService) {}

  @Get()
  async findAll() {
    return this.timeBlocksService.findAll();
  }

  @Get('by-date')
  async findByDate(@Query('date') date: string) {
    return this.timeBlocksService.findByDate(date);
  }

  @Post()
  async create(@Body() data: CreateTimeBlockDto) {
    return this.timeBlocksService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTimeBlockDto,
  ) {
    return this.timeBlocksService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.timeBlocksService.remove(id);
  }
}
