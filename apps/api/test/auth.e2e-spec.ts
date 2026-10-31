import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';

// Needs Postgres (migrated) and Redis: `make infra-up && make migrate`.
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports every dependency up', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(Object.keys(res.body.details)).toEqual(['database', 'redis', 'storage']);
  });

  it('rejects protected routes without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer()).get('/api/v1/iam/roles').expect(401);
  });

  it('returns every error in the standard shape with a request id', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    expect(res.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'لطفاً دوباره وارد شوید',
      path: '/api/v1/auth/me',
    });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('keeps a valid incoming x-request-id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/nope')
      .set('x-request-id', 'trace-12345678')
      .expect(404);
    expect(res.headers['x-request-id']).toBe('trace-12345678');
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', requestId: 'trace-12345678' });
  });

  it('lists validation errors in details', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '09121234567', code: 'abc', extra: 1 })
      .expect(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.message).toBe('داده‌های ارسالی معتبر نیست');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('answers malformed JSON with 400, not 500', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .set('content-type', 'application/json')
      .send('{"mobile":')
      .expect(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });

  it('exposes Prometheus metrics outside /api/v1', async () => {
    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('http_request_duration_seconds');
    expect(res.text).toContain('queue_jobs{');
    expect(res.text).toContain('process_cpu_seconds_total');
    await request(app.getHttpServer()).get('/api/v1/metrics').expect(404);
  });

  it('rejects an invalid mobile on OTP request', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ mobile: '12345' })
      .expect(400);
    expect(res.body.message).toBe('شماره موبایل نامعتبر است');
  });

  it('rejects a wrong OTP code', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '09129999999', code: '00000' })
      .expect(401);
  });
});
