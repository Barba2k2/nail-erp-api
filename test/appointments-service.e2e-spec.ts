import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from 'src/appointments/appointments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SettingsService } from 'src/settings/settings.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prismaService: PrismaService;
  let settingsService: SettingsService;

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
    },
    timeBlock: {
      findMany: jest.fn(),
    },
  };

  const mockSettingsService = {
    getBusinessHoursForDate: jest.fn().mockResolvedValue({
      isOpen: true,
      openTime: '08:00',
      closeTime: '18:00',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    settingsService = module.get<SettingsService>(SettingsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all appointments', async () => {
      const mockAppointments = [
        { id: 1, date: new Date(), status: AppointmentStatus.SCHEDULED },
        { id: 2, date: new Date(), status: AppointmentStatus.CONFIRMED },
      ];
      mockPrismaService.appointment.findMany.mockResolvedValue(
        mockAppointments,
      );

      const result = await service.findAll();
      expect(result).toEqual(mockAppointments);
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
          service: true,
        },
      });
    });
  });

  describe('create', () => {
    it('should create an appointment', async () => {
      const userId = 1;
      const createDto = {
        appointmentDate: '2025-03-10',
        appointmentTime: '10:00',
        notes: 'Teste',
        serviceId: 1,
      };
      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-10T10:00:00'),
        status: AppointmentStatus.SCHEDULED,
        notes: 'Teste',
        userId: 1,
        serviceId: 1,
      };

      mockPrismaService.appointment.create.mockResolvedValue(mockAppointment);

      const result = await service.create(userId, createDto);
      expect(result).toEqual(mockAppointment);
      expect(mockPrismaService.appointment.create).toHaveBeenCalledWith({
        data: {
          date: expect.any(Date),
          status: AppointmentStatus.SCHEDULED,
          notes: 'Teste',
          user: {
            connect: { id: userId },
          },
          service: {
            connect: { id: createDto.serviceId },
          },
        },
        include: {
          service: true,
        },
      });
    });

    it('should throw an error if userId is invalid', async () => {
      const userId = undefined;
      const createDto = {
        appointmentDate: '2025-03-10',
        appointmentTime: '10:00',
        notes: 'Teste',
        serviceId: 1,
      };

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots', async () => {
      const query = { date: '2025-03-10', serviceId: 1 };

      const mockService = {
        id: 1,
        name: 'Manicure',
        duration: 60,
        price: 50,
      };

      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.appointment.findMany.mockResolvedValue([]);
      mockPrismaService.timeBlock.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots(query);

      expect(result).toHaveProperty('date', '2025-03-10');
      expect(result).toHaveProperty('isOpen', true);
      expect(result).toHaveProperty('slots');
      expect(Array.isArray(result.slots)).toBe(true);

      expect(result.slots.length).toBeGreaterThan(0);

      expect(mockPrismaService.service.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should handle closed business days', async () => {
      const query = { date: '2025-03-10', serviceId: 1 };

      mockSettingsService.getBusinessHoursForDate.mockResolvedValueOnce({
        isOpen: false,
      });

      const result = await service.getAvailableSlots(query);

      expect(result).toHaveProperty('date', '2025-03-10');
      expect(result).toHaveProperty('isOpen', false);
      expect(result.slots).toEqual([]);
    });
  });

  describe('reschedule', () => {
    it('should reschedule an appointment', async () => {
      const id = 1;
      const rescheduleDto = {
        appointmentDate: '2025-03-15',
        appointmentTime: '14:00',
      };
      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-15T14:00:00'),
        status: AppointmentStatus.RESCHEDULED,
      };

      mockPrismaService.appointment.update.mockResolvedValue(mockAppointment);

      const result = await service.reschedule(id, rescheduleDto);
      expect(result).toEqual(mockAppointment);
      expect(mockPrismaService.appointment.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          date: expect.any(Date),
          status: AppointmentStatus.RESCHEDULED,
        },
      });
    });
  });

  describe('cancel', () => {
    it('should cancel an appointment', async () => {
      const id = 1;
      const mockAppointment = {
        id: 1,
        date: new Date(),
        status: AppointmentStatus.CANCELED,
      };

      mockPrismaService.appointment.update.mockResolvedValue(mockAppointment);

      const result = await service.cancel(id);
      expect(result).toEqual(mockAppointment);
      expect(mockPrismaService.appointment.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELED,
        },
      });
    });
  });
});
