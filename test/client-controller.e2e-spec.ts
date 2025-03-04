import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from '../src/clients/clients.controller';
import { ClientsService } from '../src/clients/clients.service';
import { AppointmentStatus } from '@prisma/client';
import { DateUtils } from '../src/utils/date.utils';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: ClientsService;

  const mockClientsService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getAppointments: jest.fn(),
    createAppointment: jest.fn(),
    rescheduleAppointment: jest.fn(),
    cancelAppointment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: mockClientsService }],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    service = module.get<ClientsService>(ClientsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return the user profile', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
      mockClientsService.getProfile.mockResolvedValue(mockUser);

      const req = { user: { id: 1 } };
      const result = await controller.getProfile(req);

      expect(result).toEqual(mockUser);
      expect(mockClientsService.getProfile).toHaveBeenCalledWith(1);
    });
  });

  describe('updateProfile', () => {
    it('should update the user profile', async () => {
      const updateData = { name: 'Updated Name' };
      const mockUser = {
        id: 1,
        name: 'Updated Name',
        email: 'test@example.com',
      };
      mockClientsService.updateProfile.mockResolvedValue(mockUser);

      const req = { user: { id: 1 } };
      const result = await controller.updateProfile(req, updateData);

      expect(result).toEqual(mockUser);
      expect(mockClientsService.updateProfile).toHaveBeenCalledWith(
        1,
        updateData,
      );
    });
  });

  describe('getAppointments', () => {
    it('should return user appointments', async () => {
      const mockAppointments = [
        {
          id: 1,
          date: new Date('2025-03-04T15:15:55.977Z'),
          status: AppointmentStatus.SCHEDULED,
        },
        {
          id: 2,
          date: new Date('2025-03-04T15:15:55.977Z'),
          status: AppointmentStatus.CONFIRMED,
        },
      ];

      mockClientsService.getAppointments.mockResolvedValue(mockAppointments);

      const expectedResult = mockAppointments.map((appointment) => ({
        ...appointment,
        ...DateUtils.formatAppointmentDateTime(appointment.date),
      }));

      const req = { user: { id: 1 } };
      const result = await controller.getAppointments(req);

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.getAppointments).toHaveBeenCalledWith(1);
    });
  });

  describe('createAppointment', () => {
    it('should create an appointment', async () => {
      const createData = {
        appointmentDate: '2025-03-10',
        appointmentTime: '10:00',
        notes: 'Teste',
        serviceId: 1,
      };

      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-10T13:00:00.000Z'),
        status: AppointmentStatus.SCHEDULED,
        notes: 'Teste',
        serviceId: 1,
      };

      mockClientsService.createAppointment.mockResolvedValue(mockAppointment);

      const expectedResult = {
        ...mockAppointment,
        appointmentDate: '2025-03-10',
        appointmentTime: '10:00',
      };

      const req = { user: { id: 1 } };
      const result = await controller.createAppointment(req, createData);

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.createAppointment).toHaveBeenCalledWith(
        1,
        createData,
      );
    });

    it('should throw error when user is not authenticated', async () => {
      const req = { user: null };
      const createData = {
        appointmentDate: '2025-03-10',
        appointmentTime: '10:00',
        serviceId: 1,
      };

      await expect(
        controller.createAppointment(req, createData),
      ).rejects.toThrow();
    });
  });

  describe('rescheduleAppointment', () => {
    it('should reschedule an appointment', async () => {
      const rescheduleData = {
        appointmentDate: '2025-03-15',
        appointmentTime: '14:00',
      };

      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-15T17:00:00.000Z'),
        status: AppointmentStatus.RESCHEDULED,
      };

      mockClientsService.rescheduleAppointment.mockResolvedValue(
        mockAppointment,
      );

      const expectedResult = {
        ...mockAppointment,
        appointmentDate: '2025-03-15',
        appointmentTime: '14:00',
      };

      const result = await controller.rescheduleAppointment(
        '1',
        rescheduleData,
      );

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.rescheduleAppointment).toHaveBeenCalledWith(
        1,
        rescheduleData,
      );
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel an appointment', async () => {
      const mockAppointment = {
        id: 1,
        date: new Date('2025-03-04T15:15:56.046Z'),
        status: AppointmentStatus.CANCELED,
      };

      mockClientsService.cancelAppointment.mockResolvedValue(mockAppointment);

      const expectedResult = {
        ...mockAppointment,
        appointmentDate: '2025-03-04',
        appointmentTime: '12:15',
      };

      const result = await controller.cancelAppointment('1');

      expect(result).toEqual(expectedResult);
      expect(mockClientsService.cancelAppointment).toHaveBeenCalledWith(1);
    });
  });
});
