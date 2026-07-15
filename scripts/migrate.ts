import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getDb } from '@/lib/db/client';

async function migrate() {
  const db = getDb();
  const migrationsDir = join(process.cwd(), 'migrations');

  console.log('Ejecutando migraciones...');

  // Crear tabla de control de migraciones
  await db.execute(`
        CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )
        `);

  // Leer archivos de migración
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    const migrationId = file.replace('.sql', '');

    // Verificar si ya está aplicada
    const result = await db.execute({
      sql: 'SELECT id FROM _migrations WHERE id = ?',
      args: [migrationId],
    });

    if (result.rows.length > 0) {
      console.log(`${file} ya aplicada`);
      continue;
    }

    // Leer y ejecutar migración
    const sql = await readFile(join(migrationsDir, file), 'utf-8');
    console.log(`Aplicando ${file}`);

    await db.executeMultiple(sql);
    await db.execute({
      sql: 'INSERT INTO _migrations (id) VALUES (?)',
      args: [migrationId],
    });
  }

  console.log('✨ Migraciones completadas');
}

migrate().catch((err) => {
  console.error('Error en migraciones: ', err);
  process.exit(1);
});
