import { ForbiddenException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { AppException } from './app.exception.js';

function run(exception: unknown) {
  const res = {
    headersSent: false,
    statusCode: 0,
    body: undefined as unknown,
    err: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const req = { id: 'req-1', originalUrl: '/api/v1/x', log: {} };
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return res as typeof res & { body: Record<string, unknown> };
}

function pgError(code: string, constraint?: string) {
  return new QueryFailedError(
    'INSERT ...',
    [],
    Object.assign(new Error('pg'), { code, constraint }),
  );
}

describe('AllExceptionsFilter', () => {
  it('hides unknown errors behind a generic 500 and keeps them for the log', () => {
    const err = new Error('connection string with password');
    const res = run(err);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      code: 'INTERNAL_ERROR',
      requestId: 'req-1',
      path: '/api/v1/x',
    });
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(res.err).toBe(err);
  });

  it('keeps Persian messages and replaces Nest default English ones', () => {
    expect(run(new ForbiddenException('دسترسی به این عملیات ندارید')).body.message).toBe(
      'دسترسی به این عملیات ندارید',
    );
    expect(run(new NotFoundException()).body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'موردی یافت نشد',
    });
  });

  it('moves extra fields into details', () => {
    const res = run(
      new HttpException(
        { message: 'صبر کنید', retryAfterSeconds: 30 },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
    expect(res.body).toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: 'صبر کنید',
      details: { retryAfterSeconds: 30 },
    });
  });

  it('uses the code of an AppException', () => {
    const res = run(new AppException('ORDER_LOCKED', 'این سفارش قفل شده است', HttpStatus.CONFLICT));
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'ORDER_LOCKED', message: 'این سفارش قفل شده است' });
  });

  it.each([
    ['23505', 409, 'DUPLICATE'],
    ['23503', 409, 'REFERENCE_VIOLATION'],
    ['22P02', 400, 'INVALID_VALUE'],
    ['40P01', 409, 'CONCURRENT_UPDATE'],
  ])('maps Postgres %s to %i %s', (sqlState, status, code) => {
    const res = run(pgError(sqlState, 'uq_app_user_mobile'));
    expect(res.statusCode).toBe(status);
    expect(res.body).toMatchObject({ code, details: { constraint: 'uq_app_user_mobile' } });
  });

  it('treats an unknown Postgres error as a 500', () => {
    expect(run(pgError('XX000')).statusCode).toBe(500);
  });
});
