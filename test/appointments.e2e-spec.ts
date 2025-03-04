import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';

describe('Appointments Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let appointmentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Registra um cliente para testes de agendamento
    await request(app.getHttpServer())
      .post('/auth/register/client')
      .send({
        email: 'appointment@test.com',
        password: 'password123',
        name: 'Appointment User',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login/client')
      .send({
        email: 'appointment@test.com',
        password: 'password123',
      })
      .expect(201);
    jwtToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/appointments (POST) - should create a new appointment', async () => {
    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        date: new Date().toISOString(),
        notes: 'Test appointment',
        serviceId: 1, // Certifique-se de que o serviço com ID 1 exista ou crie um previamente
        userId: 1, // Esse campo pode ser obtido do token; se for definido no backend, não é necessário enviar
        status: 'SCHEDULED', // Se o backend não definir automaticamente, envie o status
      })
      .expect(201);
    expect(response.body).toHaveProperty('id');
    appointmentId = response.body.id;
  });

  it('/appointments/:id (GET) - should return appointment details', async () => {
    const response = await request(app.getHttpServer())
      .get(`/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('id', appointmentId);
  });

  it('/appointments/:id/reschedule (PUT) - should reschedule the appointment', async () => {
    const newDate = new Date(Date.now() + 3600000).toISOString(); // +1 hora
    const response = await request(app.getHttpServer())
      .put(`/appointments/${appointmentId}/reschedule`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ date: newDate })
      .expect(200);
    expect(response.body.status).toEqual('RESCHEDULED');
  });

  it('/appointments/:id/cancel (PUT) - should cancel the appointment', async () => {
    const response = await request(app.getHttpServer())
      .put(`/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(response.body.status).toEqual('CANCELED');
  });
});
