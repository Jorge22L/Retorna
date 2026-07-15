// src/env.ts
import { z } from 'zod';

const schema = z.object({
  TURSO_URL: z.string().min(1, 'TURSO_URL es requerido'),
  TURSO_AUTH_TOKEN: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener mínimo 32 caracteres'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = schema.parse({
  TURSO_URL: import.meta.env?.TURSO_URL ?? process.env.TURSO_URL,
  TURSO_AUTH_TOKEN: import.meta.env?.TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN,
  SESSION_SECRET: import.meta.env?.SESSION_SECRET ?? process.env.SESSION_SECRET,
  NODE_ENV: import.meta.env?.NODE_ENV ?? process.env.NODE_ENV ?? 'development',
});

export type Env = z.infer<typeof schema>;
