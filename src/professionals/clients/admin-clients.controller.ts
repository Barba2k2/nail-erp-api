import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { AdminClientsService } from './admin-clients.service';

@Controller('admin/clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class AdminClientsController {
  constructor(private readonly adminClientsService: AdminClientsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new BadRequestException('Parametros de paginacao invalidos');
    }

    return this.adminClientsService.findAll({
      page: pageNum,
      limit: limitNum,
      search,
      sortBy,
      order,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const client = await this.adminClientsService.findOne(id);
    if (!client) {
      throw new NotFoundException(`Cliente com ID ${id} nao encontrado`);
    }

    return client;
  }

  @Post()
  async create(@Body() data: any) {
    data.role = 'CLIENT';
    return this.adminClientsService.create(data);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    if (data.role && data.role !== 'CLIENT') { 
      throw new BadRequestException('Nao e possivel alterar o role de um cliente');
    }

    return this.adminClientsService.update(id, data);
  }

  @Get(':id/appointments')
  async getClientAppointments(@Param('id', ParseIntPipe) id: number, @Query('status') status?: string) { 
    return this.adminClientsService.getClientAppointments(id, status);
  }

  @Get('stats/overview')
  async getClientsOverview() { 
    return this.adminClientsService.getClientsOverview();
  }

  @Get('stats/recent')
  async getRecentClients() { 
    return this.adminClientsService.getRecentClients();
  }
}
