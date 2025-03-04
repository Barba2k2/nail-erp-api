import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus } from '@prisma/client';
import { ClientsController } from 'src/clients/clients.controller';
import { ClientsService } from 'src/clients/clients.service';

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

    // Reset all mocks before each test
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
        { id: 1, date: new Date(), status: AppointmentStatus.SCHEDULED },
        { id: 2, date: new Date(), status: AppointmentStatus.CONFIRMED },
      ];
      mockClientsService.getAppointments.mockResolvedValue(mockAppointments);

      const req = { user: { userId: 1 } };
      const result = await controller.getAppointments(req);

      expect(result).toEqual(mockAppointments);
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
        date: new Date('2025-03-10T10:00:00'),
        status: AppointmentStatus.SCHEDULED,
        notes: 'Teste',
        userId: 1,
        serviceId: 1,
      };
      mockClientsService.createAppointment.mockResolvedValue(mockAppointment);

      const req = { user: { id: 1 } };
      const result = await controller.createAppointment(req, createData);

      expect(result).toEqual(mockAppointment);
      expect(mockClientsService.createAppointment).toHaveBeenCalledWith(
        1,
        createData,
      );
    });

    it('should log debug information', async () => {
      const createData = {
        appointmentDate: '2025-03-10',
        appointmentTime: '10:00',
        serviceId: 1,
      };
      const mockAppointment = { id: 1 };
      mockClientsService.createAppointment.mockResolvedValue(mockAppointment);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const req = { user: { id: 1 } };
      await controller.createAppointment(req, createData);

      expect(consoleSpy).toHaveBeenCalledWith('Req user:', { id: 1 });
      expect(consoleSpy).toHaveBeenCalledWith('User ID:', 1);
      expect(consoleSpy).toHaveBeenCalledWith('Request data:', createData);

      consoleSpy.mockRestore();
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
        date: new Date('2025-03-15T14:00:00'),
        status: AppointmentStatus.RESCHEDULED,
      };
      mockClientsService.rescheduleAppointment.mockResolvedValue(
        mockAppointment,
      );

      const result = await controller.rescheduleAppointment(
        '1',
        rescheduleData,
      );

      expect(result).toEqual(mockAppointment);
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
        date: new Date(),
        status: AppointmentStatus.CANCELED,
      };
      mockClientsService.cancelAppointment.mockResolvedValue(mockAppointment);

      const result = await controller.cancelAppointment('1');

      expect(result).toEqual(mockAppointment);
      expect(mockClientsService.cancelAppointment).toHaveBeenCalledWith(1);
    });
  });
});
