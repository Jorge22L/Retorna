import { createClient } from '@libsql/client';
import { env } from '../../env';

// Inicialización directa y segura del cliente
export const db = createClient({
  url: env.TURSO_URL,
  authToken: env.TURSO_AUTH_TOKEN || undefined,
});

// Si en el futuro necesitas una función getter por alguna razón:
export function getDb() {
  return db;
}