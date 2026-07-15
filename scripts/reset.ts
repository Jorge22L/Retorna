import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

async function reset() {
  const dbPath = join(process.cwd(), 'automatizacion.db');
  console.log('Eliminando base de datos local...');

  try {
    await unlink(dbPath);
    console.log('Base de datos eliminada');
  } catch (err) {
    console.log('No existía base de datos');
  }

  console.log('Ejecuta "pnpm db:migrate" para recrearla');
}

reset().catch((err) => {
  console.error('Error: ', err);
  process.exit(1);
});
