import { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { HttpAdapterHost } from '@nestjs/core';
export declare class AllExceptionsFilter extends BaseExceptionFilter {
    private readonly logger;
    constructor(httpAdapter: HttpAdapterHost['httpAdapter']);
    catch(exception: unknown, host: ArgumentsHost): void;
}
