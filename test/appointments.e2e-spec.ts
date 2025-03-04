import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { DateUtils } from '../src/utils/date.utils';

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
    }).compile();

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

    // Limpa banco de dados de teste e cria dados de teste
    await setupTestData();
  });

  async function setupTestData() {
    // Limpar dados existentes
    await prisma.appointment.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();

    // Criar usuário de teste (cliente)
    const clientUser = await prisma.user.create({
      data: {
        name: 'Test Client',
        email: 'client@example.com',
        password: 'password123',
        role: UserRole.CLIENT,
      },
    });
    testUserId = clientUser.id;

    // Criar usuário profissional
    const professionalUser = await prisma.user.create({
      data: {
        name: 'Test Professional',
        email: 'professional@example.com',
        password: 'password123',
        role: UserRole.PROFESSIONAL,
      },
    });

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

    // Criar um agendamento de teste
    const appointment = await prisma.appointment.create({
      data: {
        date: new Date('2025-03-20T10:00:00'),
        status: AppointmentStatus.SCHEDULED,
        notes: 'Test appointment',
        userId: clientUser.id,
        serviceId: service.id,
      },
    });
    testAppointmentId = appointment.id;

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
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /appointments/available-slots', () => {
    it('should return available slots for a given date and service', async () => {
      return request(app.getHttpServer())
        .get(
          `/appointments/available-slots?date=2025-03-15&serviceId=${testServiceId}`,
        )
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('date', '2025-03-15');
          expect(res.body).toHaveProperty('slots');
          expect(Array.isArray(res.body.slots)).toBe(true);
        });
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
      const res = await request(app.getHttpServer())
        .post('/client/appointments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          appointmentDate: '2025-03-15',
          appointmentTime: '14:00',
          notes: 'New test appointment',
          serviceId: testServiceId,
        })
        .expect(201);

      // Manualmente formatar a data para verificar se está correto
      const date = new Date(res.body.date);
      const formatted = DateUtils.formatAppointmentDateTime(date);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status', AppointmentStatus.SCHEDULED);
      expect(res.body).toHaveProperty('notes', 'New test appointment');
      expect(formatted.appointmentDate).toBe('2025-03-15');
      // O horário pode variar por causa de timezone, então não verificamos exatamente
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
      return request(app.getHttpServer())
        .put(`/client/appointments/${testAppointmentId}/reschedule`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          appointmentDate: '2025-03-25',
          appointmentTime: '16:00',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testAppointmentId);
          expect(res.body).toHaveProperty(
            'status',
            AppointmentStatus.RESCHEDULED,
          );
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
          }
        });
    });

    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get('/client/appointments')
        .expect(401);
    });
  });

  // Testes adicionais para verificar regras de negócio
  describe('Business rules', () => {
    it('should not allow booking at a time that already has an appointment', async () => {
      // Primeiro, crie um agendamento
      await request(app.getHttpServer())
        .post('/client/appointments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          appointmentDate: '2025-04-01',
          appointmentTime: '10:00',
          notes: 'Test appointment',
          serviceId: testServiceId,
        })
        .expect(201);

      // Agora tente agendar no mesmo horário
      return request(app.getHttpServer())
        .post('/client/appointments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          appointmentDate: '2025-04-01',
          appointmentTime: '10:00',
          notes: 'Conflicting appointment',
          serviceId: testServiceId,
        })
        .expect((response) => {
          // Deve retornar 409 Conflict ou 400 Bad Request
          expect([400, 409]).toContain(response.status);
        });
    });
  });
});
