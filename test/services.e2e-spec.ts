import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { cleanupDatabase, generateUniqueEmail } from './test-utils';

describe('Services Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let serviceId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    await cleanupDatabase(prisma);

    const adminEmail = generateUniqueEmail('admin_test');
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: 'password123',
        role: UserRole.PROFESSIONAL,
        name: 'Admin Test User',
      },
    });

    console.log('Created admin user with ID:', admin.id);

    authToken = jwtService.sign({
      sub: admin.id,
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    console.log('Generated auth token for testing');

    const service = await prisma.service.create({
      data: {
        name: 'Test Admin Service',
        description: 'Service for admin testing',
        duration: 60,
        price: 100,
      },
    });
    serviceId = service.id;
    console.log('Created test service for admin tests, ID:', serviceId);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  it('/services/:id (GET) - should return service details (public)', async () => {
    const testService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!testService) {
      console.log(`Service with ID ${serviceId} not found, creating new one`);
      const newService = await prisma.service.create({
        data: {
          name: 'Test Service',
          description: 'Service for testing',
          duration: 60,
          price: 100,
        },
      });
      serviceId = newService.id;
      console.log(`Created new service with ID: ${serviceId}`);
    }

    const response = await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .expect(200);

    console.log('Service details response:', response.body);

    expect(response.body).toHaveProperty('id', serviceId);
    expect(response.body).toHaveProperty('name');
  });

  it('/services/:id (GET) - should return service details (public)', async () => {
    return request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id', serviceId);
        expect(res.body).toHaveProperty('name');
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
      });
  });

  it('/admin/services (DELETE) - professional can delete a service', async () => {
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
    console.log('Created service for deletion, ID:', deleteId);

    return request(app.getHttpServer())
      .delete(`/admin/services/${deleteId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
