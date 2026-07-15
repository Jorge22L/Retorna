import { hash } from '@node-rs/argon2';
import { nanoid } from 'nanoid';
import { getDb } from '../src/lib/db/client.js';

// ============================================================
// Seed inicial: roles, admin, ubicaciones, catálogos base,
// categorías de gasto y parámetros del sistema.
// ============================================================

async function seed() {
  const db = getDb();
  console.log('🌱 Iniciando seed de datos iniciales...\n');

  // Verificar que las migraciones se hayan aplicado
  try {
    await db.execute('SELECT COUNT(*) FROM roles');
  } catch (err) {
    console.error('❌ La tabla "roles" no existe. Ejecuta primero: pnpm db:migrate');
    process.exit(1);
  }

  // --------------------------------------------------------
  // 1. ROLES
  // --------------------------------------------------------
  const adminId = nanoid();
  const operatorId = nanoid();
  const viewerId = nanoid();

  await db.execute({
    sql: `INSERT INTO roles (id, code, name, description) VALUES (?, ?, ?, ?)`,
    args: [adminId, 'admin', 'Administrador', 'Acceso total al sistema'],
  });
  await db.execute({
    sql: `INSERT INTO roles (id, code, name, description) VALUES (?, ?, ?, ?)`,
    args: [operatorId, 'operator', 'Operador de venta', 'Registra ventas, devoluciones y movimientos básicos'],
  });
  await db.execute({
    sql: `INSERT INTO roles (id, code, name, description) VALUES (?, ?, ?, ?)`,
    args: [viewerId, 'viewer', 'Usuario de consulta', 'Solo lectura de reportes e inventario'],
  });
  console.log('✅ Roles creados: admin, operator, viewer');

  // --------------------------------------------------------
  // 2. USUARIO ADMIN INICIAL
  //    Usuario: admin
  //    Contraseña: admin123 (debe cambiarse en primer login)
  // --------------------------------------------------------
  const adminUserId = nanoid();
  const passwordHash = await hash('admin123', {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await db.execute({
    sql: `INSERT INTO users (id, username, password_hash, full_name, must_change_pwd)
          VALUES (?, ?, ?, ?, ?)`,
    args: [adminUserId, 'admin', passwordHash, 'Administrador del sistema', 1],
  });

  await db.execute({
    sql: `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
    args: [adminUserId, adminId],
  });
  console.log('✅ Usuario admin creado (admin / admin123) — debe cambiar contraseña');

  // --------------------------------------------------------
  // 3. UBICACIONES
  // --------------------------------------------------------
  await db.execute({
    sql: `INSERT INTO locations (id, code, name) VALUES (?, ?, ?)`,
    args: [nanoid(), 'FRIDGE', 'Refrigerador'],
  });
  await db.execute({
    sql: `INSERT INTO locations (id, code, name) VALUES (?, ?, ?)`,
    args: [nanoid(), 'STORAGE', 'Almacenamiento externo'],
  });
  console.log('✅ Ubicaciones creadas: FRIDGE, STORAGE');

  // --------------------------------------------------------
  // 4. TIPOS DE PRODUCTO
  // --------------------------------------------------------
  await db.execute({
    sql: `INSERT INTO product_types (id, code, name, description) VALUES (?, ?, ?, ?)`,
    args: [nanoid(), 'GASEOSA', 'Gaseosa', 'Bebidas gaseosas retornables'],
  });
  await db.execute({
    sql: `INSERT INTO product_types (id, code, name, description) VALUES (?, ?, ?, ?)`,
    args: [nanoid(), 'AGUA', 'Agua', 'Agua embotellada retornable'],
  });
  console.log('✅ Tipos de producto creados');

  // --------------------------------------------------------
  // 5. TIPOS DE ENVASE
  // --------------------------------------------------------
  const envases = [
    { code: 'BOT-350', name: 'Botella 350ml', ml: 350, deposit: 1000 },
    { code: 'BOT-600', name: 'Botella 600ml', ml: 600, deposit: 1500 },
    { code: 'BOT-1L', name: 'Botella 1L', ml: 1000, deposit: 2000 },
    { code: 'BOT-2L', name: 'Botella 2L', ml: 2000, deposit: 2500 },
  ];
  for (const e of envases) {
    await db.execute({
      sql: `INSERT INTO container_types (id, code, name, capacity_ml, deposit_value)
            VALUES (?, ?, ?, ?, ?)`,
      args: [nanoid(), e.code, e.name, e.ml, e.deposit],
    });
  }
  console.log('✅ Tipos de envase creados:', envases.map((e) => e.code).join(', '));

  // --------------------------------------------------------
  // 6. CATEGORÍAS DE GASTO
  // --------------------------------------------------------
  const categorias = [
    { code: 'TRANSPORTE', name: 'Transporte y combustible' },
    { code: 'SERVICIOS', name: 'Servicios básicos (luz, agua, internet)' },
    { code: 'MANTENIMIENTO', name: 'Mantenimiento de equipos' },
    { code: 'ALQUILER', name: 'Alquiler del local' },
    { code: 'OTROS', name: 'Otros gastos operativos' },
  ];
  for (const c of categorias) {
    await db.execute({
      sql: `INSERT INTO expense_categories (id, code, name) VALUES (?, ?, ?)`,
      args: [nanoid(), c.code, c.name],
    });
  }
  console.log('✅ Categorías de gasto creadas');

  // --------------------------------------------------------
  // 7. PARÁMETROS DEL SISTEMA
  // --------------------------------------------------------
  const parametros = [
    { key: 'default_stock_min', value: '10', description: 'Stock mínimo por defecto (unidades)' },
    { key: 'default_stock_target', value: '50', description: 'Stock objetivo por defecto (unidades)' },
    { key: 'default_stock_safety', value: '5', description: 'Stock de seguridad por defecto (unidades)' },
    { key: 'default_supply_days', value: '3', description: 'Días de entrega proveedor por defecto' },
    { key: 'cash_diff_threshold', value: '10000', description: 'Umbral de diferencia de caja que requiere observación (centavos)' },
    { key: 'session_ttl_minutes', value: '480', description: 'Duración de sesión en minutos (8 horas)' },
    { key: 'max_login_attempts', value: '5', description: 'Intentos máximos de login antes de bloqueo' },
    { key: 'currency_code', value: 'NIO', description: 'Código de moneda (Córdoba nicaragüense)' },
    { key: 'currency_symbol', value: 'C$', description: 'Símbolo de moneda' },
  ];
  for (const p of parametros) {
    await db.execute({
      sql: `INSERT INTO system_parameters (key, value, description, updated_by)
            VALUES (?, ?, ?, ?)`,
      args: [p.key, p.value, p.description, adminUserId],
    });
  }
  console.log('✅ Parámetros del sistema creados');

  // --------------------------------------------------------
  // 8. AUDITORÍA DEL SEED
  // --------------------------------------------------------
  await db.execute({
    sql: `INSERT INTO audit_logs (id, user_id, action, module, entity_type, reason, result)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      nanoid(),
      adminUserId,
      'SEED',
      'system',
      'database',
      'Seed inicial ejecutado',
      'SUCCESS',
    ],
  });

  console.log('\n✨ Seed completado exitosamente');
  console.log('\n📋 Credenciales iniciales:');
  console.log('   Usuario: admin');
  console.log('   Contraseña: admin123');
  console.log('   ⚠️  Debe cambiarse en el primer inicio de sesión\n');
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});