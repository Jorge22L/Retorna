import { nanoid } from 'nanoid';
import { db } from '../db/client';

export interface AuditInput {
  userId?: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId?: string | null;
  previousValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  result?: 'SUCCESS' | 'FAILURE';
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT INTO audit_logs
            (id, user_id, action, module, entity_type, entity_id,
             previous_values, new_values, ip_address, user_agent, reason, result)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nanoid(),
        input.userId ?? null,
        input.action,
        input.module,
        input.entityType,
        input.entityId ?? null,
        input.previousValues ? JSON.stringify(input.previousValues) : null,
        input.newValues ? JSON.stringify(input.newValues) : null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        input.reason ?? null,
        input.result ?? 'SUCCESS',
      ],
    });
  } catch (err) {
    // La auditoría nunca debe romper el flujo principal
    console.error('[audit] Error registrando auditoría:', err);
  }
}