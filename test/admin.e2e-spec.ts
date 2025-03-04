import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';

describe('Admin Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let createdAppointmentId: number;
  let createdServiceId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Registra um profissional e realiza login para obter o token JWT
    await request(app.getHttpServer())
      .post('/auth/register/professional')
      .send({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Admin Test',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login/professional')
      .send({
        email: 'admin@test.com',
        password: 'password123',
      })
      .expect(201);
    jwtToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/admin/profile (GET) - should return professional profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/profile')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toEqual('admin@test.com');
  });

  it('/admin/appointments (GET) - should return appointments (initially empty)', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/appointments')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });

  it('/admin/services (POST) - professional can create a service', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/services')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Manicure',
        description: 'Basic manicure service',
        duration: 60,
        price: 50,
        image: 'https://example.com/image.png',
      })
      .expect(201);
    expect(response.body).toHaveProperty('id');
    createdServiceId = response.body.id;
  });

  it('/admin/services/:id (PUT) - professional can update a service', async () => {
    const response = await request(app.getHttpServer())
      .put(`/admin/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Manicure Premium',
        description: 'Premium manicure service',
        duration: 90,
        price: 80,
        image: 'https://example.com/new-image.png',
      })
      .expect(200);
    expect(response.body.name).toEqual('Manicure Premium');
  });

  it('/admin/services/:id (DELETE) - professional can delete a service', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
  });
});
