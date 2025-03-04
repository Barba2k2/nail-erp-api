import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppointmentStatus, UserRole } from '@prisma/client';

describe('ClientsService', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let userId: number;
  let serviceId: number;
  let appointmentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Criar dados de teste
    await setupTestData();
  });

  async function setupTestData() {
    // 1. Limpar dados existentes
    await prisma.appointment.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();

    // 2. Criar um usuário para teste
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.CLIENT,
      },
    });
    userId = user.id;

    // 3. Criar token JWT
    userToken = jwtService.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // 4. Criar serviço para teste
    const service = await prisma.service.create({
      data: {
        name: 'Test Service',
        description: 'Test Service Description',
        duration: 60,
        price: 100,
      },
    });
    serviceId = service.id;

    // 5. Criar agendamento para teste
    const appointment = await prisma.appointment.create({
      data: {
        date: new Date('2025-03-10T10:00:00'),
        status: AppointmentStatus.SCHEDULED,
        notes: 'Test appointment',
        userId: user.id,
        serviceId: service.id,
      },
    });
    appointmentId = appointment.id;
  }

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('should create an appointment', async () => {
    const response = await request(app.getHttpServer())
      .post('/client/appointments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        appointmentDate: '2025-03-15',
        appointmentTime: '14:00',
        notes: 'New appointment',
        serviceId: serviceId, // Use o ID do serviço criado no setupTestData
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status', AppointmentStatus.SCHEDULED);
  });

  it('should reschedule an appointment', async () => {
    const response = await request(app.getHttpServer())
      .put(`/client/appointments/${appointmentId}/reschedule`) // Use o ID do agendamento criado no setupTestData
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        appointmentDate: '2025-03-20',
        appointmentTime: '16:00',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', appointmentId);
    expect(response.body).toHaveProperty(
      'status',
      AppointmentStatus.RESCHEDULED,
    );
  });

  it('should cancel an appointment', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/client/appointments/${appointmentId}`) // Use o ID do agendamento criado no setupTestData
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', appointmentId);
    expect(response.body).toHaveProperty('status', AppointmentStatus.CANCELED);
  });
});
