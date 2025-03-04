import { Injectable } from '@nestjs/common';

@Injectable()
export class MockSettingsService {
  async getBusinessHoursForDate(date: Date) {
    return {
      isOpen: true,
      openTime: '08:00',
      closeTime: '18:00',
    };
  }
}
