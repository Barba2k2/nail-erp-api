import { Controller, Get, Param } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('services')
export class PublicServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll() {
    return this.servicesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(Number(id));
  }
}
