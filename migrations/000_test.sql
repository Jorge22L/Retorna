-- Migracion de prueba
CREATE TABLE IF NOT EXISTS test_table(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    create_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
)