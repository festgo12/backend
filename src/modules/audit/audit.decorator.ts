import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_metadata';

export const AuditLog = (action: string, resource?: string) =>
  SetMetadata(AUDIT_KEY, { action, resource });
