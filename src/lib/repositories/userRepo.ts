import { db } from '../db/client';

export interface UserWithRoles {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  email: string | null;
  is_active: number;
  must_change_pwd: number;
  roles: Array<{ id: string; code: string; name: string }>;
}

export async function findByUsername(username: string): Promise<UserWithRoles | null> {
  const userResult = await db.execute({
    sql: `SELECT id, username, password_hash, full_name, email, is_active, must_change_pwd
          FROM users
          WHERE username = ? AND is_active = 1`,
    args: [username],
  });

  if (userResult.rows.length === 0) return null;

  const row = userResult.rows[0];
  if (!row) return null;

  const rolesResult = await db.execute({
    sql: `SELECT r.id, r.code, r.name
          FROM roles r
          INNER JOIN user_roles ur ON ur.role_id = r.id
          WHERE ur.user_id = ? AND r.is_active = 1`,
    args: [row.id as string],
  });

  return {
    id: row.id as string,
    username: row.username as string,
    password_hash: row.password_hash as string,
    full_name: row.full_name as string,
    email: (row.email as string | null) ?? null,
    is_active: row.is_active as number,
    must_change_pwd: row.must_change_pwd as number,
    roles: rolesResult.rows.map((r) => ({
      id: r.id as string,
      code: r.code as string,
      name: r.name as string,
    })),
  };
}

export async function updateLastLogin(userId: string): Promise<void> {
  await db.execute({
    sql: `UPDATE users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
    args: [userId],
  });
}