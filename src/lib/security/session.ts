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