import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';

describe('Services Endpoints (e2e)', () => {
  let app: INestApplication;
  let adminJwtToken: string;
  let createdServiceId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Registra um profissional para operações administrativas e login
    await request(app.getHttpServer())
      .post('/auth/register/professional')
      .send({
        email: 'serviceadmin@test.com',
        password: 'password123',
        name: 'Service Admin',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login/professional')
      .send({
        email: 'serviceadmin@test.com',
        password: 'password123',
      })
      .expect(201);
    adminJwtToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // Endpoints públicos para listagem de serviços
  it('/services (GET) - should return list of services (public)', async () => {
    const response = await request(app.getHttpServer())
      .get('/services')
      .expect(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });

  it('/services/:id (GET) - should return service details (public)', async () => {
    // Primeiro, crie um serviço via admin para ter um ID
    const createResponse = await request(app.getHttpServer())
      .post('/admin/services')
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .send({
        name: 'Pedicure',
        description: 'Basic pedicure service',
        duration: 60,
        price: 45,
        image: 'https://example.com/pedicure.png',
      })
      .expect(201);
    createdServiceId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .get(`/services/${createdServiceId}`)
      .expect(200);
    expect(response.body.name).toEqual('Pedicure');
  });

  // Endpoints administrativos para gerenciamento de serviços
  it('/admin/services (PUT) - professional can update a service', async () => {
    const response = await request(app.getHttpServer())
      .put(`/admin/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .send({
        name: 'Pedicure Premium',
        description: 'Premium pedicure service',
        duration: 75,
        price: 60,
        image: 'https://example.com/pedicure-premium.png',
      })
      .expect(200);
    expect(response.body.name).toEqual('Pedicure Premium');
  });

  it('/admin/services (DELETE) - professional can delete a service', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .expect(200);
  });
});
