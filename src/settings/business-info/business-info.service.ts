import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BusinessInfoService {
  private readonly logger = new Logger(BusinessInfoService.name);
  private businessCache: any = null;
  private cacheLastUpdate: Date = new Date(0);
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {
    this.refreshCache();
  }

  private async refreshCache(): Promise<void> {
    try {
      const businessInfo = await this.prisma.businessInfo.findFirst();

      if (!businessInfo) {
        this.businessCache = await this.createDefaultBussinessInfo();
      } else {
        this.businessCache = businessInfo;
      }

      this.cacheLastUpdate = new Date();
      this.logger.error('Cache da informação de negócio atualizada');
    } catch (error) {
      this.logger.error(`Erro ao atualizar cache do negócio: ${error.message}`);
    }
  }

  private async createDefaultBussinessInfo() {
    try {
      return await this.prisma.businessInfo.create({
        data: {
          name: 'Meu salão de Beleza',
          email: 'contato@exemplo.com',
          phone: '(00) 00000-0000',
          address: 'Rua 1, 123',
          city: 'Cidade',
          state: 'Estado',
          zipCode: '00000-000',
          logo: 'https://example.com/logo.png',
        },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao criar informações do negócio: ${error.message}`,
      );
      throw error;
    }
  }

  async getBusinessInfo() {
    const now = new Date();
    if (now.getTime() - this.cacheLastUpdate.getTime() > this.cacheTTL) {
      await this.refreshCache();
    }

    return this.businessCache;
  }

  async updateBusinessInfo(data: any) {
    try {
      const business = await this.prisma.businessInfo.findFirst();

      if (!business) {
        const newBusiness = await this.prisma.businessInfo.create({
          data,
        });

        this.businessCache = newBusiness;
        this.cacheLastUpdate = new Date();

        return newBusiness;
      } else {
        const updatedBusiness = await this.prisma.businessInfo.update({
          where: {
            id: business.id,
          },
          data,
        });

        this.businessCache = updatedBusiness;
        this.cacheLastUpdate = new Date();

        return updatedBusiness;
      }
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar informações do negócio: ${error.message}`,
      );
      throw error;
    }
  }

  async getBusinessField(field: string) {
    const business = await this.getBusinessInfo();

    if (!business || !(field in business)) {
      throw new NotFoundException(
        `Campo ${field} não encontrado nas informações do negócio`,
      );
    }

    return business[field];
  }
}
