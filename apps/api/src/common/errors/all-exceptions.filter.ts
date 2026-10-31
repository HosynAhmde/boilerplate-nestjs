import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { defaultMessage, statusCode, type ErrorResponse } from './error-response.js';

interface Mapped {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  /** True when the error is a server bug and must be logged with its stack. */
  unexpected: boolean;
}

const PERSIAN = /[؀-ۿ]/;

/** Postgres SQLSTATE codes we turn into client errors instead of a 500. */
const PG_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  '23505': { status: 409, code: 'DUPLICATE', message: 'این رکورد قبلاً ثبت شده است' },
  '23503': {
    status: 409,
    code: 'REFERENCE_VIOLATION',
    message: 'این رکورد به داده‌های دیگری وابسته است',
  },
  '23502': { status: 400, code: 'MISSING_FIELD', message: 'یکی از فیلدهای الزامی خالی است' },
  '23514': { status: 400, code: 'CHECK_VIOLATION', message: 'داده‌های ارسالی معتبر نیست' },
  '22P02': { status: 400, code: 'INVALID_VALUE', message: 'مقدار ارسالی معتبر نیست' },
  '22003': { status: 400, code: 'OUT_OF_RANGE', message: 'عدد ارسالی خارج از محدوده است' },
  '22001': { status: 400, code: 'VALUE_TOO_LONG', message: 'متن ارسالی بیش از حد طولانی است' },
  '40001': {
    status: 409,
    code: 'CONCURRENT_UPDATE',
    message: 'هم‌زمان تغییر دیگری ثبت شد؛ دوباره تلاش کنید',
  },
  '40P01': {
    status: 409,
    code: 'CONCURRENT_UPDATE',
    message: 'هم‌زمان تغییر دیگری ثبت شد؛ دوباره تلاش کنید',
  },
  '55P03': {
    status: 409,
    code: 'LOCKED',
    message: 'این رکورد در حال ویرایش است؛ کمی بعد تلاش کنید',
  },
  '57014': { status: 503, code: 'QUERY_TIMEOUT', message: 'پاسخ پایگاه داده طول کشید' },
};

/**
 * Global filter: every error leaves the API in the same `ErrorResponse` shape,
 * with a Persian message safe to show users. Internal details (stack traces,
 * SQL) are logged, never sent. The request id ties the response to the log line.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const mapped = this.map(exception);
    if (mapped.unexpected) {
      // pino-http attaches res.err to the request log line (with stack).
      res.err = exception instanceof Error ? exception : new Error(String(exception));
      if (!req.log) this.logger.error(exception);
    }

    if (res.headersSent) return;

    const body: ErrorResponse = {
      statusCode: mapped.status,
      code: mapped.code,
      message: mapped.message,
      ...(mapped.details !== undefined && { details: mapped.details }),
      requestId: requestIdOf(req),
      path: req.originalUrl ?? req.url,
      timestamp: new Date().toISOString(),
    };
    res.status(mapped.status).json(body);
  }

  private map(exception: unknown): Mapped {
    if (exception instanceof HttpException) return this.fromHttp(exception);

    if (exception instanceof QueryFailedError) {
      const driver = exception.driverError as { code?: string; constraint?: string } | undefined;
      const known = driver?.code ? PG_ERRORS[driver.code] : undefined;
      if (known) {
        return {
          ...known,
          details: driver?.constraint ? { constraint: driver.constraint } : undefined,
          // lock/timeout errors point at load problems worth seeing in the logs
          unexpected: known.status >= 500,
        };
      }
    }

    if (exception instanceof EntityNotFoundError) {
      return { status: 404, code: 'NOT_FOUND', message: defaultMessage(404), unexpected: false };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: defaultMessage(500),
      unexpected: true,
    };
  }

  private fromHttp(exception: HttpException): Mapped {
    const status = exception.getStatus();
    const raw = exception.getResponse();
    const obj: Record<string, unknown> =
      typeof raw === 'string' ? { message: raw } : { ...(raw as Record<string, unknown>) };

    // Nest turns body-parser's SyntaxError into a plain 400 with the parser's text.
    if (status === 400 && typeof obj.message === 'string' && isJsonSyntaxError(obj.message)) {
      return {
        status,
        code: 'INVALID_JSON',
        message: 'بدنه درخواست JSON معتبر نیست',
        unexpected: false,
      };
    }

    const code = typeof obj.code === 'string' ? obj.code : statusCode(status);
    let message = defaultMessage(status);
    let details: unknown = obj.details;

    if (Array.isArray(obj.message)) {
      // ValidationPipe: one entry per failed rule
      message = 'داده‌های ارسالی معتبر نیست';
      details = obj.message;
    } else if (typeof obj.message === 'string' && PERSIAN.test(obj.message)) {
      message = obj.message;
    } else if (typeof obj.message === 'string' && status < 500 && !isDefaultText(obj.message)) {
      // An English message thrown on purpose: keep it as a detail for developers.
      details ??= { reason: obj.message };
    }

    // Anything else the thrower attached (e.g. retryAfterSeconds) goes in details.
    const extra = Object.fromEntries(
      Object.entries(obj).filter(
        ([k]) => !['message', 'error', 'statusCode', 'code', 'details'].includes(k),
      ),
    );
    if (Object.keys(extra).length) {
      details = { ...(isRecord(details) ? details : {}), ...extra };
    }

    return { status, code, message, details, unexpected: status >= 500 };
  }
}

/** Nest/Express built-in texts like "Unauthorized" or "Cannot GET /x". */
function isDefaultText(message: string): boolean {
  return (
    /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(message) ||
    message.startsWith('ThrottlerException') ||
    [
      'Unauthorized',
      'Forbidden resource',
      'Forbidden',
      'Not Found',
      'Bad Request',
      'Internal server error',
      'Too Many Requests',
    ].includes(message)
  );
}

/** pino-http's id; for errors raised before it ran (bad JSON), the proxy's header. */
function requestIdOf(req: Request): string | undefined {
  const id: unknown = req.id ?? req.headers['x-request-id'];
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined;
}

function isJsonSyntaxError(message: string): boolean {
  return /JSON|Unexpected (token|end|non-whitespace)|Bad control character/.test(message);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
