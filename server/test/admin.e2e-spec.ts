import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Real-backend e2e: boots the actual AppModule against the real database and
 * drives it over HTTP. Verifies the two-tier access control end-to-end —
 * a CLIENT is refused the admin API, and an ADMIN is served it.
 *
 * Creates one temporary user (unique email) and deletes it afterward.
 */
describe('Admin API access (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e+${Date.now()}@test.local`;
  const password = 'E2ePass123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirror main.ts so routes + validation + cookies behave like production.
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('refuses a CLIENT and serves an ADMIN the dashboard', async () => {
    const agent = request.agent(app.getHttpServer());

    // 1) Register a fresh client (sets auth cookies).
    await agent
      .post('/api/auth/register')
      .send({ email, password, firstName: 'E2e', lastName: 'Tester' })
      .expect(201);

    // 2) The session is a CLIENT.
    const me = await agent.get('/api/users/me').expect(200);
    expect(me.body.role).toBe('CLIENT');

    // 3) The admin API is forbidden for a client (RolesGuard).
    await agent.get('/api/admin/dashboard').expect(403);

    // 4) Promote to ADMIN and re-login so the JWT carries the new role.
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    await agent.post('/api/auth/login').send({ email, password }).expect(200);

    // 5) The dashboard is now served with real KPI fields.
    const dash = await agent.get('/api/admin/dashboard').expect(200);
    expect(dash.body).toHaveProperty('totalClients');
    expect(dash.body).toHaveProperty('pendingWithdrawals');
    expect(dash.body).toHaveProperty('openTickets');
  });
});
