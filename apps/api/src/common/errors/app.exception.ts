import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * A business-rule error with a stable machine-readable `code`, e.g.
 *   throw new AppException('ORDER_LOCKED', 'این سفارش قفل شده است', HttpStatus.CONFLICT);
 * The global filter turns it into the standard error response.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}
