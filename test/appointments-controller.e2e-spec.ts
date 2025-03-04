import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsController } from 'src/appointments/appointments.controller';
import { AppointmentsService } from 'src/appointments/appointments.service';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let service: AppointmentsService;

  const mockAppointmentsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    reschedule: jest.fn(),
    cancel: jest.fn(),
    getAvailableSlots: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        { provide: AppointmentsService, useValue: mockAppointmentsService },
      ],
    }).compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
    service = module.get<AppointmentsService>(AppointmentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all appointments with formatted date and time', async () => {
      const mockAppointments = [
        {
          id: 1,
          date: new Date('2025-03-10T10:00:00'),
          status: AppointmentStatus.SCHEDULED,
        },
        {
          id: 2,
          date: new Date('2025-03-11T14:30:00'),
          status: AppointmentStatus.CONFIRMED,
        },
      ];
      mockAppointmentsService.findAll.mockResolvedValue(mockAppointments);

      const result = await controller.findAll();
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('appointmentDate', '2025-03-10');
      expect(result[0]).toHaveProperty('appointmentTime', '10:00');
      expect(result[1]).toHaveProperty('appointmentDate', '2025-03-11');
      expect(result[1]).toHaveProperty('appointmentTime', '14:30');
    });
  });

  describe('findOne', () => {
    it('should return a single appointment with formatted date and time', async () => {
      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-10T10:00:00'),
        status: AppointmentStatus.SCHEDULED,
      };
      mockAppointmentsService.findOne.mockResolvedValue(mockAppointment);

      const result = await controller.findOne(1);
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('appointmentDate', '2025-03-10');
      expect(result).toHaveProperty('appointmentTime', '10:00');
    });

    it('should throw NotFoundException when appointment not found', async () => {
      mockAppointmentsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new appointment', async () => {
      const createDto = {
        appointmentDate: '2025-03-10',
        appointmentTime: '10:00',
        serviceId: 1,
      };
      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-10T10:00:00'),
        status: AppointmentStatus.SCHEDULED,
        serviceId: 1,
      };
      mockAppointmentsService.create.mockResolvedValue(mockAppointment);

      const req = { user: { id: 1 } };
      const result = await controller.create(req, createDto);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('appointmentDate', '2025-03-10');
      expect(result).toHaveProperty('appointmentTime', '10:00');
      expect(mockAppointmentsService.create).toHaveBeenCalledWith(1, createDto);
    });

    it('should throw error when user is not authenticated', async () => {
      const req = { user: null };
      const createDto = {
        appointmentDate: '2025-03-10',
        appointmentTime: '10:00',
        serviceId: 1,
      };

      await expect(controller.create(req, createDto)).rejects.toThrow();
    });
  });

  describe('reschedule', () => {
    it('should reschedule an appointment', async () => {
      const rescheduleDto = {
        appointmentDate: '2025-03-15',
        appointmentTime: '14:00',
      };
      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-15T14:00:00'),
        status: AppointmentStatus.RESCHEDULED,
      };
      mockAppointmentsService.reschedule.mockResolvedValue(mockAppointment);

      const result = await controller.reschedule(1, rescheduleDto);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('appointmentDate', '2025-03-15');
      expect(result).toHaveProperty('appointmentTime', '14:00');
      expect(mockAppointmentsService.reschedule).toHaveBeenCalledWith(
        1,
        rescheduleDto,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel an appointment', async () => {
      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-10T10:00:00'),
        status: AppointmentStatus.CANCELED,
      };
      mockAppointmentsService.cancel.mockResolvedValue(mockAppointment);

      const result = await controller.cancel(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('status', AppointmentStatus.CANCELED);
      expect(mockAppointmentsService.cancel).toHaveBeenCalledWith(1);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots', async () => {
      const query = { date: '2025-03-10', serviceId: 1 };
      const mockResponse = {
        date: '2025-03-10',
        isOpen: true,
        businessHours: '08:00 - 18:00',
        slots: [
          {
            time: '2025-03-10T08:00:00.000Z',
            formattedTime: '08:00',
            duration: 60,
            service: { id: 1, name: 'Manicure', duration: 60 },
          },
          {
            time: '2025-03-10T09:00:00.000Z',
            formattedTime: '09:00',
            duration: 60,
            service: { id: 1, name: 'Manicure', duration: 60 },
          },
        ],
      };
      mockAppointmentsService.getAvailableSlots.mockResolvedValue(mockResponse);

      const result = await controller.getAvailableSlots(query);

      expect(result).toEqual(mockResponse);
      expect(mockAppointmentsService.getAvailableSlots).toHaveBeenCalledWith(
        query,
      );
    });
  });
});
