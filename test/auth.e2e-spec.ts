import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register/client (POST) - should register a new client', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register/client')
      .send({
        email: 'client1@example.com',
        password: 'password123',
        name: 'Client One',
      })
      .expect(201);
    expect(response.body).toHaveProperty('id');
  });

  it('/auth/register/professional (POST) - should register a new professional', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register/professional')
      .send({
        email: 'pro1@example.com',
        password: 'password123',
        name: 'Professional One',
      })
      .expect(201);
    expect(response.body).toHaveProperty('id');
  });

  it('/auth/login/client (POST) - should login as client', async () => {
    // Registra o cliente se ainda não estiver registrado
    await request(app.getHttpServer())
      .post('/auth/register/client')
      .send({
        email: 'client2@example.com',
        password: 'password123',
        name: 'Client Two',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login/client')
      .send({
        email: 'client2@example.com',
        password: 'password123',
      })
      .expect(201);
    expect(response.body).toHaveProperty('access_token');
  });

  it('/auth/login/professional (POST) - should login as professional', async () => {
    await request(app.getHttpServer())
      .post('/auth/register/professional')
      .send({
        email: 'pro2@example.com',
        password: 'password123',
        name: 'Professional Two',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login/professional')
      .send({
        email: 'pro2@example.com',
        password: 'password123',
      })
      .expect(201);
    expect(response.body).toHaveProperty('access_token');
  });

  it('/auth/recover-password (POST) - should initiate password recovery', async () => {
    // Registra um usuário para teste
    await request(app.getHttpServer())
      .post('/auth/register/client')
      .send({
        email: 'recover@example.com',
        password: 'password123',
        name: 'Recover User',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/recover-password')
      .send({ email: 'recover@example.com' })
      .expect(201);
    expect(response.body).toHaveProperty(
      'message',
      'Email de recuperação enviado',
    );
    expect(response.body).toHaveProperty('token');
  });

  // O teste de reset de senha pode ser feito com o token retornado no recover-password.
});
