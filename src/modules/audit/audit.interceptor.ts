import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { AUDIT_KEY } from './audit.decorator';
import { AuditMetadata } from './audit.types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get<AuditMetadata>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const ip = this.extractIp(request);
    const device = request.headers['user-agent'] || 'unknown';

    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        this.writeLog(auditMeta, {
          userId: user?.id,
          actorId: user?.id,
          ip,
          device,
          newValue: response,
          success: true,
          startTime,
        });
      }),
      catchError((error) => {
        const isAuthFailure =
          auditMeta.action.includes('LOGIN') ||
          auditMeta.action.includes('AUTH');

        this.writeLog(auditMeta, {
          userId: user?.id,
          actorId: user?.id,
          ip,
          device,
          success: false,
          errorMessage: error.message,
          metadata: isAuthFailure ? { statusCode: error.status || 500 } : undefined,
          startTime,
        });

        return throwError(() => error);
      }),
    );
  }

  private extractIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  private writeLog(
    auditMeta: AuditMetadata,
    data: {
      userId?: string;
      actorId?: string;
      ip: string;
      device: string;
      newValue?: any;
      success: boolean;
      errorMessage?: string;
      metadata?: Record<string, any>;
      startTime: number;
    },
  ): void {
    const resourceId = data.newValue?.id || data.newValue?.orderId || undefined;

    this.auditService.log({
      userId: data.actorId || data.userId || 'system',
      actorId: data.actorId,
      action: auditMeta.action,
      resource: auditMeta.resource,
      resourceId,
      newValue: data.newValue
        ? this.sanitizeResponse(data.newValue)
        : undefined,
      metadata: {
        ...data.metadata,
        duration: `${Date.now() - data.startTime}ms`,
      },
      ipAddress: data.ip,
      device: data.device,
      success: data.success,
      errorMessage: data.errorMessage,
    });
  }

  private sanitizeResponse(data: any): Record<string, any> {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = ['passwordHash', 'password', 'twoFactorSecret', 'resetToken', 'fcmToken'];
    const sanitized = { ...data };

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
