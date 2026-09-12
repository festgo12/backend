import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AuditService } from './audit.service';
export declare class AuditInterceptor implements NestInterceptor {
    private readonly reflector;
    private readonly auditService;
    private readonly logger;
    constructor(reflector: Reflector, auditService: AuditService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private extractIp;
    private writeLog;
    private isValidUUID;
    private sanitizeResponse;
}
