import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { HttpAdapterHost } from '@nestjs/core';

/**
 * Global exception filter that sanitizes error responses.
 * In production, internal error details are stripped; only safe messages
 * are returned to the client.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(httpAdapter: HttpAdapterHost['httpAdapter']) {
    super(httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (isProduction && status >= 500) {
        this.logger.error('Internal server error', exception.stack);
        super.catch(
          new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR),
          host,
        );
        return;
      }

      super.catch(exception, host);
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));

    if (isProduction) {
      super.catch(
        new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR),
        host,
      );
    } else {
      super.catch(exception as any, host);
    }
  }
}
