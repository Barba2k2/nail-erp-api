import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessInfoService } from 'src/settings/business-info/business-info.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessInfoService: BusinessInfoService,
  ) {}

  async create(subdomain: string) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (existingTenant) {
      throw new ConflictException(`O subdomínio ${subdomain} já está em uso.`);
    }

    const businessInfo = await this.businessInfoService.getBusinessInfo();

    const existingBusinessTenant = await this.prisma.tenant.findUnique({
      where: { businessId: businessInfo.id },
    });

    if (existingBusinessTenant) {
      throw new ConflictException(
        `Esse negócio já possui um subdomínio associado.`,
      );
    }

    const normalizeSubdomain = this.normalizeSubdomain(subdomain);

    return this.prisma.tenant.create({
      data: {
        subdomain: normalizeSubdomain,
        businessId: businessInfo.id,
        isActive: true,
      },
    });
  }

  async update(id: number, subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${id} não encontrado`);
    }

    const normalizeSubdomain = this.normalizeSubdomain(subdomain);

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain: normalizeSubdomain },
    });

    if (existingTenant && existingTenant.id !== id) {
      throw new ConflictException(`O subdomínio ${subdomain} já está em uso.`);
    }

    return this.prisma.tenant.update({
      where: { id },
      data: {
        subdomain: normalizeSubdomain,
      },
    });
  }

  async findOne(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        business: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant com ID ${id} não encontrado`);
    }

    return tenant;
  }

  async findBySubdomain(subdomain: string) {
    const normalizedSubdomain = this.normalizeSubdomain(subdomain);

    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain: normalizedSubdomain },
      include: {
        business: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant com subdomínio ${subdomain} não encontrado`,
      );
    }

    return tenant;
  }

  async getCurrentTenant() {
    const businessInfo = await this.businessInfoService.getBusinessInfo();

    const tenant = await this.prisma.tenant.findUnique({
      where: { businessId: businessInfo.id },
      include: {
        business: true,
      },
    });

    if (!tenant) {
      return {
        business: businessInfo,
        tenant: null,
      };
    }

    return tenant;
  }

  async toggleActive(id: number, isActive: boolean) {
    const tenant = await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: { isActive },
    });
  }

  private normalizeSubdomain(subdomain: string) {
    return subdomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  async checkSubdomainAvailability(subdomain: string) {
    const normalizedSubdomain = this.normalizeSubdomain(subdomain);

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain: normalizedSubdomain },
    });

    return {
      subdomain: normalizedSubdomain,
      available: !existingTenant,
    };
  }
}
