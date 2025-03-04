import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';

describe('Client Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let appointmentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Registra um cliente e realiza login para obter o token JWT
    await request(app.getHttpServer())
      .post('/auth/register/client')
      .send({
        email: 'client@test.com',
        password: 'password123',
        name: 'Client Test',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login/client')
      .send({
        email: 'client@test.com',
        password: 'password123',
      })
      .expect(201);
    jwtToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/client/profile (GET) - should return client profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/client/profile')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toEqual('client@test.com');
  });

  it('/client/profile (PUT) - should update client profile', async () => {
    const response = await request(app.getHttpServer())
      .put('/client/profile')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ name: 'Updated Client' })
      .expect(200);
    expect(response.body.name).toEqual('Updated Client');
  });

  // Agendamentos: esses endpoints são acessíveis tanto por CLIENT quanto por PROFESSIONAL
  it('/client/appointments (POST) - client can create an appointment', async () => {
    const response = await request(app.getHttpServer())
      .post('/client/appointments')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        date: new Date().toISOString(),
        notes: 'Need a quick manicure',
        serviceId: 1, // considere que esse serviço exista no banco
      })
      .expect(201);
    expect(response.body).toHaveProperty('id');
    appointmentId = response.body.id;
  });

  it('/client/appointments (GET) - should return client appointments', async () => {
    const response = await request(app.getHttpServer())
      .get('/client/appointments')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });

  it('/client/appointments/:id/reschedule (PUT) - client can reschedule an appointment', async () => {
    const newDate = new Date(Date.now() + 86400000).toISOString(); // +1 dia
    const response = await request(app.getHttpServer())
      .put(`/client/appointments/${appointmentId}/reschedule`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ date: newDate })
      .expect(200);
    expect(response.body.status).toEqual('RESCHEDULED');
  });

  it('/client/appointments/:id (DELETE) - client can cancel an appointment', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/client/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(response.body.status).toEqual('CANCELED');
  });
});
