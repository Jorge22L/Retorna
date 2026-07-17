import { verify } from '@node-rs/argon2';
import { loginSchema, type LoginInput } from '../validators/auth.schema';
import { findByUsername, updateLastLogin, type UserWithRoles } from '../repositories/userRepo';
import { createSession, revokeSession, type Session } from '../security/session';
import { logAudit } from '../utils/audit';
import { db } from '../db/client';

export type LoginResult =
  | { success: true; user: UserWithRoles; session: Session }
  | { success: false; reason: 'validation_error' | 'invalid_credentials' | 'user_inactive'; errors?: string[] };

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

async function getSessionTtlMinutes(): Promise<number> {
  try {
    const result = await db.execute({
      sql: `SELECT value FROM system_parameters WHERE key = ?`,
      args: ['session_ttl_minutes'],
    });
    const value = result.rows[0]?.value;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 480;
  } catch {
    return 480;
  }
}

export async function login(
  rawInput: unknown,
  context: LoginContext = {},
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(rawInput);

  if (!parsed.success) {
    await logAudit({
      action: 'LOGIN_FAILURE',
      module: 'auth',
      entityType: 'user',
      reason: 'validation_error',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      result: 'FAILURE',
    });
    return {
      success: false,
      reason: 'validation_error',
      errors: parsed.error.issues.map((i) => i.message),
    };
  }

  const input: LoginInput = parsed.data;
  const user = await findByUsername(input.username);

  if (!user) {
    await logAudit({
      action: 'LOGIN_FAILURE',
      module: 'auth',
      entityType: 'user',
      reason: 'invalid_credentials',
      newValues: { username: input.username },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      result: 'FAILURE',
    });
    return { success: false, reason: 'invalid_credentials' };
  }

  const passwordValid = await verify(user.password_hash, input.password);
  if (!passwordValid) {
    await logAudit({
      action: 'LOGIN_FAILURE',
      module: 'auth',
      entityType: 'user',
      entityId: user.id,
      reason: 'invalid_credentials',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      result: 'FAILURE',
    });
    return { success: false, reason: 'invalid_credentials' };
  }

  if (user.is_active !== 1) {
    await logAudit({
      action: 'LOGIN_FAILURE',
      module: 'auth',
      entityType: 'user',
      entityId: user.id,
      reason: 'user_inactive',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      result: 'FAILURE',
    });
    return { success: false, reason: 'user_inactive' };
  }

  const ttlMinutes = await getSessionTtlMinutes();
  const session = await createSession({
    userId: user.id,
    ttlMinutes,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  await updateLastLogin(user.id);

  await logAudit({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    module: 'auth',
    entityType: 'session',
    entityId: session.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    result: 'SUCCESS',
  });

  return { success: true, user, session };
}

export async function logout(sessionId: string, userId: string, context: LoginContext = {}): Promise<void>{
  await revokeSession(sessionId);

  await logAudit({
    userId,
    action: 'LOGOUT',
    module: 'auth',
    entityType: 'session',
    entityId: sessionId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    result: 'SUCCESS',
  });
}