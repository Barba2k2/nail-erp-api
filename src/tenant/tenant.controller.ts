import {
  Body,
  Controller,
  Get,
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
import { TenantService } from './tenant.service';

@Controller('admin/tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async getCurrentTenant() {
    return this.tenantService.getCurrentTenant();
  }

  @Post()
  async createTenant(@Body('subdomain') subdomain: string) {
    return this.tenantService.create(subdomain);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body('subdomain') subdomain: string,
  ) {
    return this.tenantService.update(id, subdomain);
  }

  @Get('check')
  async checkSubdomainAvailabilty(@Query('subdomain') subdomain: string) {
    return this.tenantService.checkSubdomainAvailability(subdomain);
  }

  @Put(':id/toggle-active')
  async toggleActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.tenantService.toggleActive(id, isActive);
  }
}

@Controller('tenant')
export class PublicTenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get(':subdomain')
  async getTonantSubdomain(@Param('subdomain') subdomain: string) {
    const tenant = await this.tenantService.findBySubdomain(subdomain);

    return {
      subdomain: tenant.subdomain,
      business: {
        name: tenant.business.name,
        slogan: tenant.business.slogan,
        logo: tenant.business.logo,
        email: tenant.business.email,
        phone: tenant.business.phone,
      },
    };
  }
}
