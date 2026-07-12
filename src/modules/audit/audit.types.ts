export interface AuditParams {
  userId: string;
  actorId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string;
  device?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface AuditMetadata {
  action: string;
  resource?: string;
}
