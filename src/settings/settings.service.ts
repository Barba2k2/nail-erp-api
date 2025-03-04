import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { SpecialBusinessDayDto } from './dto/special-business-day.dto';

interface BusinessHoursSettings {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeDefaultHours() {
    // Verifica se já há configurações
    const existing = await this.prisma.businessSettings.count();
    if (existing > 0) {
      return { message: 'Configurações de horário já existem' };
    }

    // Cria os horários padrão para todos os dias da semana
    const days: BusinessHoursSettings[] = [];
    for (let i = 0; i < 7; i++) {
      days.push({
        dayOfWeek: i,
        isOpen: i !== 0, // Fechado aos domingos por padrão
        openTime: '08:00',
        closeTime: '18:00',
      });
    }

    await this.prisma.businessSettings.createMany({
      data: days,
    });

    return { message: 'Horários padrão inicializados com sucesso' };
  }

  async getBusinessHours() {
    const hours = await this.prisma.businessSettings.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });

    const dayNames = [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ];

    return hours.map((h) => ({
      ...h,
      dayName: dayNames[h.dayOfWeek],
    }));
  }

  async updateBusinessHours(data: UpdateBusinessHoursDto) {
    const { dayOfWeek, isOpen, openTime, closeTime } = data;

    const existing = await this.prisma.businessSettings.findUnique({
      where: { dayOfWeek },
    });

    if (!existing) {
      throw new NotFoundException(
        `Configuração para o dia ${dayOfWeek} não encontrada`,
      );
    }

    return this.prisma.businessSettings.update({
      where: { dayOfWeek },
      data: {
        isOpen,
        ...(openTime && { openTime }),
        ...(closeTime && { closeTime }),
      },
    });
  }

  async getSpecialDays() {
    return this.prisma.specialBusinessDay.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async addSpecialDay(data: SpecialBusinessDayDto) {
    const { date, isOpen, openTime, closeTime, reason } = data;

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    const existingDay = await this.prisma.specialBusinessDay.findFirst({
      where: { date: parsedDate },
    });

    if (existingDay) {
      return this.prisma.specialBusinessDay.update({
        where: { id: existingDay.id },
        data: {
          isOpen,
          openTime,
          closeTime,
          reason,
        },
      });
    }

    return this.prisma.specialBusinessDay.create({
      data: {
        date: parsedDate,
        isOpen,
        openTime,
        closeTime,
        reason,
      },
    });
  }

  async removeSpecialDay(id: number) {
    return this.prisma.specialBusinessDay.delete({
      where: { id },
    });
  }

  // Método que será chamado pelo AppointmentsService
  async getBusinessHoursForDate(date: Date) {
    // Criar uma cópia da data para não modificar a original
    const dateCopy = new Date(date);
    // Definir para o início do dia
    const startOfDay = new Date(dateCopy.setHours(0, 0, 0, 0));

    // Verifica se há configuração especial para a data usando findFirst
    const specialDay = await this.prisma.specialBusinessDay.findFirst({
      where: {
        date: startOfDay,
      },
    });

    if (specialDay) {
      if (!specialDay.isOpen) {
        return { isOpen: false };
      }

      return {
        isOpen: true,
        openTime: specialDay.openTime || '08:00',
        closeTime: specialDay.closeTime || '18:00',
      };
    }

    // Caso não haja configuração especial, usa a do dia da semana
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const defaultSettings = await this.prisma.businessSettings.findUnique({
      where: { dayOfWeek },
    });

    if (!defaultSettings) {
      // Se não houver configuração, assume horário comercial padrão
      return {
        isOpen: true,
        openTime: '08:00',
        closeTime: '18:00',
      };
    }

    return {
      isOpen: defaultSettings.isOpen,
      openTime: defaultSettings.openTime,
      closeTime: defaultSettings.closeTime,
    };
  }
}
