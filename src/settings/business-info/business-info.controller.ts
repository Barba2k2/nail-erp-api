import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { BusinessInfoService } from './business-info.service';
import { UpdateBusinessInfoDto } from './dto/update-business-info.dto';

@Controller('admin/settings/business-info')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class BusinessInfoController {
  constructor(private readonly businessInfoService: BusinessInfoService) {}

  @Get()
  async getBusinessInfo() {
    return this.businessInfoService.getBusinessInfo();
  }

  @Put()
  async updateBusinessInfo(
    @Body() updateBusinessInfoDto: UpdateBusinessInfoDto,
  ) {
    return this.businessInfoService.updateBusinessInfo(updateBusinessInfoDto);
  }
}

@Controller('settings/business-info')
export class PublicBusinessInfoController {
  constructor(private readonly businessInfoService: BusinessInfoService) {}

  @Get()
  async getPublicBusinessInfo() {
    const businessInfo = await this.businessInfoService.getBusinessInfo();

    return {
      name: businessInfo.name,
      slogan: businessInfo.slogan,
      description: businessInfo.description,
      logo: businessInfo.logo,
      email: businessInfo.email,
      phone: businessInfo.phone,
      whatsapp: businessInfo.whatsapp,
      address: businessInfo.address,
      city: businessInfo.city,
      state: businessInfo.state,
      zipCode: businessInfo.zipCode,
      neighborhood: businessInfo.neighborhood,
      instagram: businessInfo.instagram,
      facebook: businessInfo.facebook,
      tiktok: businessInfo.tiktok,
      youtube: businessInfo.youtube,
    };
  }
}
