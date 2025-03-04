import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanupDatabase, generateUniqueEmail } from './test-utils';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    await cleanupDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  it('/auth/register/client (POST) - should register a new client', async () => {
    const clientEmail = generateUniqueEmail('client_register');

    const response = await request(app.getHttpServer())
      .post('/auth/register/client')
      .send({
        email: clientEmail,
        password: 'password123',
        role: 'CLIENT',
        name: 'Client One',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });

  it('/auth/register/professional (POST) - should register a new professional', async () => {
    const professionalEmail = generateUniqueEmail('prof_register');

    const response = await request(app.getHttpServer())
      .post('/auth/register/professional')
      .send({
        email: professionalEmail,
        password: 'password123',
        role: 'PROFESSIONAL',
        name: 'Professional One',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });

  it('/auth/login/client (POST) - should login as client', async () => {
    const clientEmail = generateUniqueEmail('client_login');

    await request(app.getHttpServer())
      .post('/auth/register/client')
      .send({
        email: clientEmail,
        password: 'password123',
        role: 'CLIENT',
        name: 'Client Two',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login/client')
      .send({
        email: clientEmail,
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
  });

  it('/auth/login/professional (POST) - should login as professional', async () => {
    const professionalEmail = generateUniqueEmail('prof_login');

    await request(app.getHttpServer())
      .post('/auth/register/professional')
      .send({
        email: professionalEmail,
        password: 'password123',
        role: 'PROFESSIONAL',
        name: 'Professional Two',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login/professional')
      .send({
        email: professionalEmail,
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
  });

  it('/auth/recover-password (POST) - should initiate password recovery', async () => {
    const recoverEmail = generateUniqueEmail('recover');

    await request(app.getHttpServer())
      .post('/auth/register/client')
      .send({
        email: recoverEmail,
        password: 'password123',
        role: 'CLIENT',
        name: 'Recover User',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/recover-password')
      .send({
        email: recoverEmail,
      })
      .expect(201);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('token');
  });
});
