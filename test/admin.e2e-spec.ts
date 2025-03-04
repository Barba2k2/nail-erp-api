import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { cleanupDatabase, generateUniqueEmail } from './test-utils';

describe('Services Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let serviceId: number;

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

    // Limpar banco de dados
    await cleanupDatabase(prisma);

    // Criar usuário profissional para testes
    const adminEmail = generateUniqueEmail('service_admin');

    // Criar diretamente para evitar problemas com o endpoint
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: 'password123',
        role: UserRole.PROFESSIONAL,
        name: 'Service Admin',
      },
    });

    // Obter token de autenticação para o resto dos testes
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login/professional')
      .send({
        email: adminEmail,
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;

    // Criar um serviço para os testes
    const serviceResponse = await request(app.getHttpServer())
      .post('/admin/services')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Service',
        description: 'Test service description',
        duration: 60,
        price: 100,
      });

    serviceId = serviceResponse.body.id;
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  it('/services (GET) - should return list of services (public)', async () => {
    return request(app.getHttpServer())
      .get('/services')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('name');
        }
      });
  });

  it('/services/:id (GET) - should return service details (public)', async () => {
    return request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id', serviceId);
        expect(res.body).toHaveProperty('name');
        expect(res.body).toHaveProperty('description');
        expect(res.body).toHaveProperty('duration');
        expect(res.body).toHaveProperty('price');
      });
  });

  it('/admin/services (PUT) - professional can update a service', async () => {
    return request(app.getHttpServer())
      .put(`/admin/services/${serviceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Service Name',
        description: 'Updated description',
        duration: 90,
        price: 150,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id', serviceId);
        expect(res.body).toHaveProperty('name', 'Updated Service Name');
        expect(res.body).toHaveProperty('description', 'Updated description');
        expect(res.body).toHaveProperty('duration', 90);
        expect(res.body).toHaveProperty('price', 150);
      });
  });

  it('/admin/services (DELETE) - professional can delete a service', async () => {
    // Criar um serviço para deletar
    const createResponse = await request(app.getHttpServer())
      .post('/admin/services')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Service to Delete',
        description: 'This service will be deleted',
        duration: 30,
        price: 50,
      })
      .expect(201);

    const deleteId = createResponse.body.id;

    return request(app.getHttpServer())
      .delete(`/admin/services/${deleteId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
