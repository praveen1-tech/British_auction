import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'auction.db');

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS rfqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bid_start_time TEXT NOT NULL,
    bid_close_time TEXT NOT NULL,
    original_close_time TEXT NOT NULL,
    forced_close_time TEXT NOT NULL,
    pickup_date TEXT,
    trigger_window_minutes INTEGER NOT NULL DEFAULT 10,
    extension_duration_minutes INTEGER NOT NULL DEFAULT 5,
    extension_trigger_type TEXT NOT NULL DEFAULT 'bid_received',
    status TEXT NOT NULL DEFAULT 'upcoming',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER NOT NULL,
    carrier_name TEXT NOT NULL,
    freight_charges REAL NOT NULL DEFAULT 0,
    origin_charges REAL NOT NULL DEFAULT 0,
    destination_charges REAL NOT NULL DEFAULT 0,
    total_price REAL NOT NULL DEFAULT 0,
    transit_time TEXT,
    quote_validity TEXT,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (rfq_id) REFERENCES rfqs(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (rfq_id) REFERENCES rfqs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_bids_rfq_id ON bids(rfq_id);
  CREATE INDEX IF NOT EXISTS idx_bids_total_price ON bids(rfq_id, total_price);
  CREATE INDEX IF NOT EXISTS idx_activity_log_rfq_id ON activity_log(rfq_id);
`);

export default db;
