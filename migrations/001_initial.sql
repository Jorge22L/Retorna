-- ============================================================
-- Migración 001: Esquema inicial
-- Sistema Interno de Inventario y Venta de Bebidas Gaseosas
-- Compatible con SQLite / libSQL (Turso)
-- Moneda: C$ almacenada en CENTAVOS (INTEGER)
-- IDs: TEXT (UUID/nanoid) para preparar iteración offline
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- 1. USUARIOS, ROLES Y SESIONES
-- ------------------------------------------------------------
CREATE TABLE roles (
    id            TEXT PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    description   TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    email           TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    must_change_pwd INTEGER NOT NULL DEFAULT 0,
    last_login_at   TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE user_roles (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE permissions (
    id       TEXT PRIMARY KEY,
    role_id  TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource TEXT NOT NULL,
    action   TEXT NOT NULL,
    UNIQUE (role_id, resource, action)
);

CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TEXT NOT NULL,
    ip_address  TEXT,
    user_agent  TEXT,
    is_revoked  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ------------------------------------------------------------
-- 2. CATÁLOGO DE PRODUCTOS
-- ------------------------------------------------------------
CREATE TABLE product_types (
    id          TEXT PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE container_types (
    id            TEXT PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    capacity_ml   INTEGER,
    is_returnable INTEGER NOT NULL DEFAULT 1,
    deposit_value INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE products (
    id                TEXT PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    presentation      TEXT NOT NULL,
    product_type_id   TEXT NOT NULL REFERENCES product_types(id),
    container_type_id TEXT REFERENCES container_types(id),
    units_per_case    INTEGER NOT NULL CHECK (units_per_case > 0),
    stock_min         INTEGER NOT NULL DEFAULT 0,
    stock_target      INTEGER NOT NULL DEFAULT 0,
    stock_safety      INTEGER NOT NULL DEFAULT 0,
    supply_days       INTEGER NOT NULL DEFAULT 0,
    is_active         INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_products_type ON products(product_type_id);

-- ------------------------------------------------------------
-- 3. HISTÓRICO DE PRECIOS Y COSTOS (inmutable)
-- ------------------------------------------------------------
CREATE TABLE price_history (
    id              TEXT PRIMARY KEY,
    product_id      TEXT NOT NULL REFERENCES products(id),
    case_cost       INTEGER NOT NULL,
    suggested_price INTEGER NOT NULL,
    default_price   INTEGER NOT NULL,
    min_price       INTEGER NOT NULL,
    effective_from  TEXT NOT NULL,
    effective_to    TEXT,
    reason          TEXT NOT NULL,
    changed_by      TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_price_history_product ON price_history(product_id, effective_from);

-- ------------------------------------------------------------
-- 4. UBICACIONES E INVENTARIO
-- ------------------------------------------------------------
CREATE TABLE locations (
    id        TEXT PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name      TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE inventory (
    product_id  TEXT NOT NULL REFERENCES products(id),
    location_id TEXT NOT NULL REFERENCES locations(id),
    quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    PRIMARY KEY (product_id, location_id)
);

CREATE TABLE inventory_movements (
    id             TEXT PRIMARY KEY,
    product_id     TEXT NOT NULL REFERENCES products(id),
    location_id    TEXT NOT NULL REFERENCES locations(id),
    movement_type  TEXT NOT NULL,
    quantity       INTEGER NOT NULL,
    reference_type TEXT,
    reference_id   TEXT,
    reason         TEXT,
    performed_by   TEXT NOT NULL REFERENCES users(id),
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_inv_mov_product ON inventory_movements(product_id, created_at);

-- ------------------------------------------------------------
-- 5. PROVEEDORES, COMPRAS Y COMPOSICIONES (mixtas)
-- ------------------------------------------------------------
CREATE TABLE suppliers (
    id         TEXT PRIMARY KEY,
    code       TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    contact    TEXT,
    phone      TEXT,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE purchases (
    id               TEXT PRIMARY KEY,
    supplier_id      TEXT NOT NULL REFERENCES suppliers(id),
    purchase_date    TEXT NOT NULL,
    invoice_number   TEXT,
    total_cases      INTEGER NOT NULL DEFAULT 0,
    total_amount     INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'confirmed',
    received_by      TEXT NOT NULL REFERENCES users(id),
    notes            TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    annulled_at      TEXT,
    annulled_by      TEXT REFERENCES users(id),
    annulment_reason TEXT
);

CREATE TABLE purchase_details (
    id              TEXT PRIMARY KEY,
    purchase_id     TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id      TEXT NOT NULL REFERENCES products(id),
    purchase_mode   TEXT NOT NULL,
    units_received  INTEGER NOT NULL CHECK (units_received > 0),
    case_cost_paid  INTEGER NOT NULL,
    unit_cost       INTEGER NOT NULL,
    subtotal        INTEGER NOT NULL
);
CREATE INDEX idx_pdet_purchase ON purchase_details(purchase_id);

CREATE TABLE purchase_compositions (
    id            TEXT PRIMARY KEY,
    purchase_id   TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id    TEXT NOT NULL REFERENCES products(id),
    units_in_case INTEGER NOT NULL CHECK (units_in_case > 0),
    assigned_cost INTEGER NOT NULL,
    unit_cost     INTEGER NOT NULL
);
CREATE INDEX idx_pcomp_purchase ON purchase_compositions(purchase_id);

-- ------------------------------------------------------------
-- 6. VECINOS AUTORIZADOS Y ENVASES RETORNABLES
-- ------------------------------------------------------------
CREATE TABLE authorized_neighbors (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    reference      TEXT,
    phone          TEXT,
    max_containers INTEGER NOT NULL DEFAULT 0,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE container_balances (
    neighbor_id       TEXT NOT NULL REFERENCES authorized_neighbors(id),
    container_type_id TEXT NOT NULL REFERENCES container_types(id),
    pending           INTEGER NOT NULL DEFAULT 0 CHECK (pending >= 0),
    PRIMARY KEY (neighbor_id, container_type_id)
);

CREATE TABLE container_movements (
    id                TEXT PRIMARY KEY,
    neighbor_id       TEXT REFERENCES authorized_neighbors(id),
    container_type_id TEXT NOT NULL REFERENCES container_types(id),
    movement_type     TEXT NOT NULL,
    quantity          INTEGER NOT NULL,
    reference_type    TEXT,
    reference_id      TEXT,
    notes             TEXT,
    performed_by      TEXT NOT NULL REFERENCES users(id),
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ------------------------------------------------------------
-- 7. VENTAS (con histórico inmutable)
-- ------------------------------------------------------------
CREATE TABLE sales (
    id               TEXT PRIMARY KEY,
    sale_date        TEXT NOT NULL,
    total_amount     INTEGER NOT NULL,
    total_cost       INTEGER NOT NULL,
    total_profit     INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'confirmed',
    sold_by          TEXT NOT NULL REFERENCES users(id),
    cash_register_id TEXT,
    notes            TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    annulled_at      TEXT,
    annulled_by      TEXT REFERENCES users(id),
    annulment_reason TEXT
);
CREATE INDEX idx_sales_date ON sales(sale_date);

CREATE TABLE sale_details (
    id               TEXT PRIMARY KEY,
    sale_id          TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id       TEXT NOT NULL REFERENCES products(id),
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    suggested_price  INTEGER NOT NULL,
    charged_price    INTEGER NOT NULL,
    unit_cost        INTEGER NOT NULL,
    subtotal         INTEGER NOT NULL,
    cost_total       INTEGER NOT NULL,
    profit           INTEGER NOT NULL,
    container_status TEXT NOT NULL DEFAULT 'returned'
);
CREATE INDEX idx_sdet_sale ON sale_details(sale_id);

-- ------------------------------------------------------------
-- 8. CAJA, GASTOS Y MOVIMIENTOS
-- ------------------------------------------------------------
CREATE TABLE cash_registers (
    id              TEXT PRIMARY KEY,
    open_date       TEXT NOT NULL,
    close_date      TEXT,
    opening_amount  INTEGER NOT NULL,
    expected_amount INTEGER,
    counted_amount  INTEGER,
    difference      INTEGER,
    status          TEXT NOT NULL DEFAULT 'open',
    opened_by       TEXT NOT NULL REFERENCES users(id),
    closed_by       TEXT REFERENCES users(id),
    observation     TEXT
);
CREATE INDEX idx_cash_open ON cash_registers(open_date, status);

CREATE TABLE cash_movements (
    id               TEXT PRIMARY KEY,
    cash_register_id TEXT NOT NULL REFERENCES cash_registers(id),
    movement_type    TEXT NOT NULL,
    amount           INTEGER NOT NULL,
    reference_type   TEXT,
    reference_id     TEXT,
    description      TEXT,
    performed_by     TEXT NOT NULL REFERENCES users(id),
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX idx_cash_mov_reg ON cash_movements(cash_register_id, created_at);

CREATE TABLE expense_categories (
    id        TEXT PRIMARY KEY,
    code      TEXT NOT NULL UNIQUE,
    name      TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE expenses (
    id               TEXT PRIMARY KEY,
    category_id      TEXT NOT NULL REFERENCES expense_categories(id),
    expense_date     TEXT NOT NULL,
    amount           INTEGER NOT NULL,
    description      TEXT NOT NULL,
    cash_register_id TEXT REFERENCES cash_registers(id),
    registered_by    TEXT NOT NULL REFERENCES users(id),
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- ------------------------------------------------------------
-- 9. RECOMENDACIONES DE PEDIDO
-- ------------------------------------------------------------
CREATE TABLE recommended_orders (
    id           TEXT PRIMARY KEY,
    generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    period_from  TEXT NOT NULL,
    period_to    TEXT NOT NULL,
    generated_by TEXT NOT NULL REFERENCES users(id),
    notes        TEXT
);

CREATE TABLE recommended_order_items (
    id              TEXT PRIMARY KEY,
    order_id        TEXT NOT NULL REFERENCES recommended_orders(id) ON DELETE CASCADE,
    product_id      TEXT NOT NULL REFERENCES products(id),
    current_stock   INTEGER NOT NULL,
    avg_daily_sales REAL NOT NULL,
    coverage_days   REAL NOT NULL,
    suggested_cases INTEGER NOT NULL,
    reason          TEXT
);

-- ------------------------------------------------------------
-- 10. AUDITORÍA (inmutable, solo inserciones)
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id              TEXT PRIMARY KEY,
    occurred_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    user_id         TEXT REFERENCES users(id),
    action          TEXT NOT NULL,
    module          TEXT NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT,
    previous_values TEXT,
    new_values      TEXT,
    ip_address      TEXT,
    user_agent      TEXT,
    reason          TEXT,
    result          TEXT NOT NULL DEFAULT 'SUCCESS'
);
CREATE INDEX idx_audit_user   ON audit_logs(user_id, occurred_at);
CREATE INDEX idx_audit_module ON audit_logs(module, occurred_at);

-- ------------------------------------------------------------
-- 11. PARÁMETROS DEL SISTEMA
-- ------------------------------------------------------------
CREATE TABLE system_parameters (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_by  TEXT REFERENCES users(id)
);