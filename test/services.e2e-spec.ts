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
  let adminUser: any;

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

    const adminEmail = generateUniqueEmail('service_admin');
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: 'password123',
        role: UserRole.PROFESSIONAL,
        name: 'Service Admin',
      },
    });
    console.log('Created test admin with ID:', adminUser.id);

    authToken = jwtService.sign({
      sub: adminUser.id,
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });
    console.log('Generated auth token for admin');

    try {
      const serviceData = {
        name: 'Test Service',
        description: 'Test service description',
        duration: 60,
        price: 100,
      };

      const serviceResponse = await request(app.getHttpServer())
        .post('/admin/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send(serviceData);

      if (serviceResponse.status === 201) {
        serviceId = serviceResponse.body.id;
        console.log('Created test service with ID:', serviceId);
      } else {
        console.log(
          'Failed to create service, status:',
          serviceResponse.status,
        );
        console.log('Response:', serviceResponse.body);

        const service = await prisma.service.create({
          data: serviceData,
        });
        serviceId = service.id;
        console.log(
          'Created test service directly with Prisma, ID:',
          serviceId,
        );
      }
    } catch (error) {
      console.error('Error creating test service:', error);
    }
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
      });
  });

  it('/services/:id (GET) - should return service details (public)', async () => {
    try {
      let testService = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!testService) {
        testService = await prisma.service.create({
          data: {
            name: 'Test Service',
            description: 'Test service description',
            duration: 60,
            price: 100,
          },
        });
        serviceId = testService.id;
        console.log('Created missing test service:', serviceId);
      }
    } catch (error) {
      console.error('Error ensuring test service exists:', error);
    }

    const response = await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .expect(200);

    console.log('Service details response:', response.body);

    expect(response.body).toHaveProperty('id', serviceId);
    expect(response.body).toHaveProperty('name');
  });

  it('/admin/services (PUT) - professional can update a service', async () => {
    const response = await request(app.getHttpServer())
      .put(`/admin/services/${serviceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Service Name',
        description: 'Updated description',
        duration: 90,
        price: 150,
      });

    console.log('Update service response:', response.body);
    console.log('Update service status:', response.status);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', serviceId);
    expect(response.body).toHaveProperty('name', 'Updated Service Name');
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
      });

    console.log('Create service for deletion response:', createResponse.body);
    console.log('Create service status:', createResponse.status);

    expect(createResponse.status).toBe(201);

    const deleteId = createResponse.body.id;
    console.log('Service created for deletion with ID:', deleteId);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/admin/services/${deleteId}`)
      .set('Authorization', `Bearer ${authToken}`);

    console.log('Delete service response:', deleteResponse.body);
    console.log('Delete service status:', deleteResponse.status);

    expect(deleteResponse.status).toBe(200);
  });
});
