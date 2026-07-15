import { type Client, createClient } from '@libsql/client';
import { env } from '../../env';

let _client: Client | null = null;

export function getDb(): Client {
  if (!_client) {
    _client = createClient({
      url: env.TURSO_URL,
      authToken: env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return _client;
}

// Proxy para acceso directo
export const db = new Proxy({} as Client, {
  get: (_, prop) => Reflect.get(getDb(), prop),
});
