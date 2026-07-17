import { nanoid } from 'nanoid';
import { db } from '../db/client';

export interface CreateSessionOptions {
  userId: string;
  ttlMinutes: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export async function createSession(opts: CreateSessionOptions): Promise<Session> {
  const id = nanoid(40);
  const expiresAt = new Date(Date.now() + opts.ttlMinutes * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z');

  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, opts.userId, expiresAtIso, opts.ipAddress ?? null, opts.userAgent ?? null],
  });

  return { id, userId: opts.userId, expiresAt };
}

export async function revokeSession(sessionId: string): Promise<void>{
  await db.execute({
    sql: `UPDATE sessions SET is_revoked = 1 WHERE id = ?`,
    args: [sessionId]
  });
}

export async function findSession(sessionId: string): Promise<Session | null>{
  const result = await db.execute({
    sql: `SELECT id, user_id, expires_at
      FROM sessions
      WHERE id = ? AND is_revoked = 0 AND expires_at > strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
    args: [sessionId],
  });

  if(result.rows.length === 0) return null;

  const row = result.rows[0];
  if(!row) return null;

  return {
    id: row.is as string,
    userId: row.user_id as string,
    expiresAt: new Date(row.expires_at as string),
  };
}