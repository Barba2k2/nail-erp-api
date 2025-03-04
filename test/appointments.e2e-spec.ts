import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { SettingsService } from '../src/settings/settings.service';
import { cleanupDatabase, generateUniqueEmail } from './test-utils';

// Definir um mock para o SettingsService
class MockSettingsService {
  async getBusinessHoursForDate(date: Date) {
    return {
      isOpen: true,
      openTime: '08:00',
      closeTime: '18:00',
    };
  }
}

describe('Appointments E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let clientToken: string;
  let professionalToken: string;
  let testUserId: number;
  let testServiceId: number;
  let testAppointmentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SettingsService)
      .useClass(MockSettingsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Limpar banco de dados
    await cleanupDatabase(prisma);

    // Criar dados de teste
    await setupTestData();
  });

  async function setupTestData() {
    // Criar usuário de teste (cliente)
    const clientEmail = generateUniqueEmail('client_e2e');
    const clientUser = await prisma.user.create({
      data: {
        name: 'Test Client',
        email: clientEmail,
        password: 'password123',
        role: UserRole.CLIENT,
      },
    });
    testUserId = clientUser.id;
    console.log('Created test client with ID:', testUserId);

    // Criar usuário profissional
    const professionalEmail = generateUniqueEmail('professional_e2e');
    const professionalUser = await prisma.user.create({
      data: {
        name: 'Test Professional',
        email: professionalEmail,
        password: 'password123',
        role: UserRole.PROFESSIONAL,
      },
    });
    console.log('Created test professional with ID:', professionalUser.id);

    // Criar serviço de teste
    const service = await prisma.service.create({
      data: {
        name: 'Test Service',
        description: 'Test service description',
        duration: 60,
        price: 100,
      },
    });
    testServiceId = service.id;
    console.log('Created test service with ID:', testServiceId);

    // Criar um agendamento de teste
    const appointment = await prisma.appointment.create({
      data: {
        date: new Date('2025-03-20T10:00:00Z'),
        status: AppointmentStatus.SCHEDULED,
        notes: 'Test appointment',
        userId: clientUser.id,
        serviceId: service.id,
      },
    });
    testAppointmentId = appointment.id;
    console.log('Created test appointment with ID:', testAppointmentId);

    // Criar tokens JWT para testes
    clientToken = jwtService.sign({
      sub: clientUser.id,
      id: clientUser.id,
      email: clientUser.email,
      role: clientUser.role,
    });

    professionalToken = jwtService.sign({
      sub: professionalUser.id,
      id: professionalUser.id,
      email: professionalUser.email,
      role: professionalUser.role,
    });
  }

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /appointments/available-slots', () => {
    it('should return available slots for a given date and service', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/appointments/available-slots?date=2025-03-15&serviceId=${testServiceId}`,
        )
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      console.log('Available slots response:', res.body);

      expect(res.body).toHaveProperty('date', '2025-03-15');
      expect(res.body).toHaveProperty('slots');
      expect(Array.isArray(res.body.slots)).toBe(true);
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get(
          `/appointments/available-slots?date=2025-03-15&serviceId=${testServiceId}`,
        )
        .expect(401);
    });
  });

  describe('POST /client/appointments', () => {
    it('should create a new appointment', async () => {
      // Escolher data futura para evitar conflitos com outros testes
      const appointmentDate = '2025-05-15';
      const appointmentTime = '14:00';

      const res = await request(app.getHttpServer())
        .post('/client/appointments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          appointmentDate,
          appointmentTime,
          notes: 'New test appointment',
          serviceId: testServiceId,
        })
        .expect(201);

      console.log('Create appointment response:', res.body);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status', AppointmentStatus.SCHEDULED);
      expect(res.body).toHaveProperty('notes', 'New test appointment');
      expect(res.body).toHaveProperty('appointmentDate', appointmentDate);
      expect(res.body).toHaveProperty('appointmentTime', appointmentTime);
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .post('/client/appointments')
        .send({
          appointmentDate: '2025-03-15',
          appointmentTime: '14:00',
          serviceId: testServiceId,
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      return request(app.getHttpServer())
        .post('/client/appointments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          // Faltando campos obrigatórios
        })
        .expect(400);
    });
  });

  describe('PUT /client/appointments/:id/reschedule', () => {
    it('should reschedule an appointment', async () => {
      const newDate = '2025-05-25';
      const newTime = '16:00';

      return request(app.getHttpServer())
        .put(`/client/appointments/${testAppointmentId}/reschedule`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          appointmentDate: newDate,
          appointmentTime: newTime,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testAppointmentId);
          expect(res.body).toHaveProperty(
            'status',
            AppointmentStatus.RESCHEDULED,
          );
          expect(res.body).toHaveProperty('appointmentDate', newDate);
          expect(res.body).toHaveProperty('appointmentTime', newTime);
        });
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .put(`/client/appointments/${testAppointmentId}/reschedule`)
        .send({
          appointmentDate: '2025-03-25',
          appointmentTime: '16:00',
        })
        .expect(401);
    });
  });

  describe('DELETE /client/appointments/:id', () => {
    it('should cancel an appointment', async () => {
      return request(app.getHttpServer())
        .delete(`/client/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testAppointmentId);
          expect(res.body).toHaveProperty('status', AppointmentStatus.CANCELED);
        });
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .delete(`/client/appointments/${testAppointmentId}`)
        .expect(401);
    });
  });

  describe('GET /client/appointments', () => {
    it('should return user appointments', async () => {
      return request(app.getHttpServer())
        .get('/client/appointments')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('date');
            expect(res.body[0]).toHaveProperty('status');
            expect(res.body[0]).toHaveProperty('appointmentDate');
            expect(res.body[0]).toHaveProperty('appointmentTime');
          }
        });
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get('/client/appointments')
        .expect(401);
    });
  });

  describe('Business rules', () => {
    it('should handle conflicting appointments appropriately', async () => {
      // Primeiro, criar um agendamento
      const date = '2025-06-01';
      const time = '10:00';

      await request(app.getHttpServer())
        .post('/client/appointments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          appointmentDate: date,
          appointmentTime: time,
          notes: 'Test appointment',
          serviceId: testServiceId,
        })
        .expect(201);

      // Agora tentar agendar no mesmo horário deve falhar com 409 ou 400
      const response = await request(app.getHttpServer())
        .post('/client/appointments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          appointmentDate: date,
          appointmentTime: time,
          notes: 'Conflicting appointment',
          serviceId: testServiceId,
        });

      expect([400, 409]).toContain(response.status);
    });
  });
});
