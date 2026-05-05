-- ============================================================
-- CST Transport Manager – Complete Database Schema
-- City Star Transport Passengers LLC
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────
-- USERS & ROLES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL,
  email       TEXT,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('admin','editor','visitor')),
  is_active   INTEGER NOT NULL DEFAULT 1,
  permissions TEXT NOT NULL DEFAULT '{}',  -- JSON blob of granular perms
  avatar      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- CLIENTS / COMPANIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            TEXT PRIMARY KEY,
  company_name  TEXT NOT NULL,
  contact_name  TEXT,
  mobile        TEXT,
  email         TEXT,
  address       TEXT,
  tax_number    TEXT,
  credit_limit  REAL DEFAULT 0,
  notes         TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- VEHICLES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id              TEXT PRIMARY KEY,
  plate_number    TEXT UNIQUE NOT NULL,
  vehicle_type    TEXT NOT NULL,        -- Bus, Coaster, Van, Car, etc.
  make            TEXT,
  model           TEXT,
  year            INTEGER,
  seats           INTEGER NOT NULL DEFAULT 0,
  owner_name      TEXT NOT NULL,
  owner_mobile    TEXT,
  color           TEXT,
  status          TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','on_trip','maintenance','inactive')),
  insurance_expiry TEXT,
  mulkiya_expiry  TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- DRIVERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id              TEXT PRIMARY KEY,
  full_name       TEXT NOT NULL,
  mobile          TEXT NOT NULL,
  license_number  TEXT,
  license_expiry  TEXT,
  nationality     TEXT,
  id_number       TEXT,
  id_expiry       TEXT,
  base_salary     REAL NOT NULL DEFAULT 0,
  joining_date    TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- DAILY TRIPS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id              TEXT PRIMARY KEY,
  trip_date       TEXT NOT NULL,
  vehicle_id      TEXT REFERENCES vehicles(id),
  driver_id       TEXT REFERENCES drivers(id),
  client_id       TEXT REFERENCES clients(id),
  client_name     TEXT NOT NULL,       -- denormalized for speed / archived clients
  client_mobile   TEXT,
  job_description TEXT NOT NULL,
  pickup_location TEXT,
  dropoff_location TEXT,
  trip_type       TEXT DEFAULT 'one_way' CHECK (trip_type IN ('one_way','round_trip','daily_hire','monthly')),
  start_time      TEXT,
  end_time        TEXT,
  vehicle_type    TEXT,
  seats           INTEGER,
  driver_name     TEXT,               -- denormalized
  driver_mobile   TEXT,
  owner_name      TEXT,               -- vehicle owner denormalized
  payment_amount  REAL NOT NULL DEFAULT 0,
  payment_status  TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid','unpaid','partial')),
  payment_method  TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','bank','online','other')),
  partial_amount  REAL DEFAULT 0,
  received_by     TEXT,               -- staff who received payment
  booked_by       TEXT,               -- staff who booked
  created_by      TEXT REFERENCES users(id),
  invoice_id      TEXT REFERENCES invoices(id),
  reminder_sent   INTEGER DEFAULT 0,
  last_reminder   TEXT,
  remarks         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              TEXT PRIMARY KEY,
  invoice_number  TEXT UNIQUE NOT NULL,
  client_id       TEXT REFERENCES clients(id),
  client_name     TEXT NOT NULL,
  invoice_date    TEXT NOT NULL,
  due_date        TEXT,
  service_period  TEXT,
  subtotal        REAL NOT NULL DEFAULT 0,
  tax_rate        REAL NOT NULL DEFAULT 5,
  tax_amount      REAL NOT NULL DEFAULT 0,
  discount        REAL NOT NULL DEFAULT 0,
  total           REAL NOT NULL DEFAULT 0,
  amount_paid     REAL NOT NULL DEFAULT 0,
  balance_due     REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','partial','overdue','cancelled')),
  notes           TEXT,
  terms           TEXT DEFAULT 'Payment due within 30 days.',
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id              TEXT PRIMARY KEY,
  invoice_id      TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  trip_id         TEXT REFERENCES trips(id),
  description     TEXT NOT NULL,
  vehicle_type    TEXT,
  vehicle_plate   TEXT,
  driver_name     TEXT,
  trip_date       TEXT,
  quantity        REAL NOT NULL DEFAULT 1,
  unit_price      REAL NOT NULL DEFAULT 0,
  line_total      REAL NOT NULL DEFAULT 0,
  sort_order      INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────
-- STATEMENT OF ACCOUNT (SOA)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soa_transactions (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id),
  transaction_date TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('invoice','payment','credit','debit','adjustment')),
  reference       TEXT,               -- invoice_number, receipt number, etc.
  invoice_id      TEXT REFERENCES invoices(id),
  description     TEXT NOT NULL,
  debit           REAL NOT NULL DEFAULT 0,
  credit          REAL NOT NULL DEFAULT 0,
  balance         REAL NOT NULL DEFAULT 0,  -- running balance
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- VEHICLE EXPENSES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id              TEXT PRIMARY KEY,
  vehicle_id      TEXT NOT NULL REFERENCES vehicles(id),
  expense_date    TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('fuel','maintenance','repair','insurance','registration','fine','parking','other')),
  description     TEXT NOT NULL,
  amount          REAL NOT NULL DEFAULT 0,
  vendor          TEXT,
  receipt_number  TEXT,
  odometer        INTEGER,
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- DRIVER ASSIGNMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_assignments (
  id              TEXT PRIMARY KEY,
  driver_id       TEXT NOT NULL REFERENCES drivers(id),
  vehicle_id      TEXT NOT NULL REFERENCES vehicles(id),
  assigned_date   TEXT NOT NULL,
  released_date   TEXT,
  notes           TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- DRIVER SALARIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_salaries (
  id              TEXT PRIMARY KEY,
  driver_id       TEXT NOT NULL REFERENCES drivers(id),
  period_month    INTEGER NOT NULL,   -- 1-12
  period_year     INTEGER NOT NULL,
  base_salary     REAL NOT NULL DEFAULT 0,
  overtime_hours  REAL DEFAULT 0,
  overtime_rate   REAL DEFAULT 0,
  overtime_amount REAL DEFAULT 0,
  deductions      REAL DEFAULT 0,
  deduction_reason TEXT,
  bonus           REAL DEFAULT 0,
  gross_salary    REAL NOT NULL DEFAULT 0,
  amount_paid     REAL NOT NULL DEFAULT 0,
  remaining       REAL NOT NULL DEFAULT 0,
  payment_date    TEXT,
  payment_method  TEXT DEFAULT 'cash',
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','partial')),
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(driver_id, period_month, period_year)
);

-- ─────────────────────────────────────────
-- PAYMENT REMINDERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_reminders (
  id              TEXT PRIMARY KEY,
  trip_id         TEXT REFERENCES trips(id),
  invoice_id      TEXT REFERENCES invoices(id),
  client_name     TEXT NOT NULL,
  client_email    TEXT,
  outstanding     REAL NOT NULL,
  overdue_days    INTEGER NOT NULL DEFAULT 0,
  reminder_type   TEXT NOT NULL CHECK (reminder_type IN ('in_app','email','both')),
  status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','acknowledged')),
  message         TEXT,
  sent_at         TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT,
  created_by      TEXT REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- REMINDER CONFIGURATION
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminder_config (
  id              TEXT PRIMARY KEY DEFAULT 'singleton',
  enabled         INTEGER NOT NULL DEFAULT 1,
  frequency       TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly','monthly','custom')),
  custom_days     INTEGER DEFAULT 7,
  send_email      INTEGER NOT NULL DEFAULT 1,
  send_inapp      INTEGER NOT NULL DEFAULT 1,
  email_to        TEXT NOT NULL DEFAULT 'citystar815@gmail.com',
  email_from      TEXT,
  smtp_host       TEXT,
  smtp_port       INTEGER DEFAULT 587,
  smtp_user       TEXT,
  smtp_pass       TEXT,
  last_run        TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- AI CHAT HISTORY
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id),
  session_id      TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- ACTIVITY / AUDIT LOG
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id),
  username        TEXT,
  action          TEXT NOT NULL,       -- CREATE, UPDATE, DELETE, LOGIN, etc.
  entity_type     TEXT,                -- invoice, trip, driver, etc.
  entity_id       TEXT,
  details         TEXT,                -- JSON
  ip_address      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- APP SETTINGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- IN-APP NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id),  -- NULL = all users
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
  is_read         INTEGER NOT NULL DEFAULT 0,
  entity_type     TEXT,
  entity_id       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trips_date        ON trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_client      ON trips(client_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver      ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle     ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_payment     ON trips(payment_status);
CREATE INDEX IF NOT EXISTS idx_trips_invoice     ON trips(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client   ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date     ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_soa_client        ON soa_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle  ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON vehicle_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_salaries_driver   ON driver_salaries(driver_id);
CREATE INDEX IF NOT EXISTS idx_chat_session      ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_user     ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ─────────────────────────────────────────
-- DEFAULT DATA
-- ─────────────────────────────────────────
INSERT OR IGNORE INTO app_settings(key, value) VALUES
  ('company_name',    'City Star Transport Passengers LLC'),
  ('company_address', 'Dubai, United Arab Emirates'),
  ('company_phone',   '+971-XX-XXXXXXX'),
  ('company_email',   'citystar815@gmail.com'),
  ('company_trn',     'TRN-XXXXXXXXXX'),
  ('currency',        'AED'),
  ('tax_rate',        '5'),
  ('invoice_prefix',  'INV'),
  ('invoice_counter', '1000'),
  ('theme',           'dark'),
  ('anthropic_key',   ''),
  ('logo_path',       '');

INSERT OR IGNORE INTO reminder_config(id) VALUES ('singleton');
