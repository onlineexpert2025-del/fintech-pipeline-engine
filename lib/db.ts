import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('goalpulse.db');

export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target REAL NOT NULL,
      saved REAL NOT NULL DEFAULT 0,
      monthly_contribution REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category TEXT,
      date TEXT NOT NULL,
      receipt_id INTEGER,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (receipt_id) REFERENCES receipts(id)
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_uri TEXT NOT NULL,
      store TEXT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      extracted_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO goals (id, name, target, saved, monthly_contribution) VALUES (1, 'House', 22000, 1944.17, 2000);
    INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'USD');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('biometric_enabled', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notifications_enabled', 'true');
  `);
}

export interface Goal {
  id: number;
  name: string;
  target: number;
  saved: number;
  monthly_contribution: number;
  created_at?: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string | null;
  date: string;
  receipt_id: number | null;
  note: string | null;
  created_at?: string;
}

export interface Receipt {
  id: number;
  image_uri: string;
  store: string | null;
  amount: number;
  date: string;
  extracted_text: string | null;
  created_at?: string;
}

export function getGoal(): Goal | null {
  const row = db.getFirstSync<Goal>('SELECT * FROM goals LIMIT 1');
  return row ?? null;
}

export function updateGoalSaved(id: number, saved: number) {
  db.runSync('UPDATE goals SET saved = ? WHERE id = ?', [saved, id]);
}

export function getTransactions(limit = 50): Transaction[] {
  return db.getAllSync<Transaction>('SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?', [limit]);
}

export function addTransaction(t: Omit<Transaction, 'id' | 'created_at'>) {
  const result = db.runSync(
    'INSERT INTO transactions (type, amount, category, date, receipt_id, note) VALUES (?, ?, ?, ?, ?, ?)',
    t.type,
    t.amount,
    t.category ?? null,
    t.date,
    t.receipt_id ?? null,
    t.note ?? null
  );
  return result.lastInsertRowId;
}

export function deleteTransaction(id: number) {
  db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
}

export function getReceipts(): Receipt[] {
  return db.getAllSync<Receipt>('SELECT * FROM receipts ORDER BY date DESC');
}

export function addReceipt(r: Omit<Receipt, 'id' | 'created_at'>) {
  const result = db.runSync(
    'INSERT INTO receipts (image_uri, store, amount, date, extracted_text) VALUES (?, ?, ?, ?, ?)',
    r.image_uri,
    r.store ?? null,
    r.amount,
    r.date,
    r.extracted_text ?? null
  );
  return result.lastInsertRowId;
}

export function getReceipt(id: number): Receipt | null {
  return db.getFirstSync<Receipt>('SELECT * FROM receipts WHERE id = ?', [id]) ?? null;
}

export function deleteReceipt(id: number) {
  db.runSync('DELETE FROM transactions WHERE receipt_id = ?', [id]);
  db.runSync('DELETE FROM receipts WHERE id = ?', [id]);
}

export function getSetting(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export function getCategoryTotals(): { category: string; total: number }[] {
  return db.getAllSync<{ category: string; total: number }>(
    `SELECT COALESCE(category, 'Other Expenses') as category, SUM(amount) as total FROM transactions WHERE type = 'expense' GROUP BY COALESCE(category, 'Other Expenses')`
  );
}

export function getSpendingByPeriod(): { today: number; week: number; month: number } {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStr = weekStart.toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStr = monthStart.toISOString().slice(0, 10);

  const todayRow = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?",
    [today]
  );
  const weekRow = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?",
    [weekStr]
  );
  const monthRow = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?",
    [monthStr]
  );

  return {
    today: todayRow?.total ?? 0,
    week: weekRow?.total ?? 0,
    month: monthRow?.total ?? 0,
  };
}

export function getTotalIncome(): number {
  const row = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'"
  );
  return row?.total ?? 0;
}

export function getTotalExpenses(): number {
  const row = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'"
  );
  return row?.total ?? 0;
}

export function clearAllData() {
  db.execSync(`
    DELETE FROM transactions;
    DELETE FROM receipts;
    UPDATE goals SET saved = 0;
  `);
}

export function exportDataAsJson(): string {
  const goals = db.getAllSync<Goal>('SELECT * FROM goals');
  const transactions = db.getAllSync<Transaction>('SELECT * FROM transactions');
  const receipts = db.getAllSync<Receipt>('SELECT * FROM receipts');
  const settings = db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return JSON.stringify({ goals, transactions, receipts, settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) }, null, 2);
}

export function exportDataAsCsv(): string {
  const transactions = db.getAllSync<Transaction>('SELECT * FROM transactions');
  const headers = ['id', 'type', 'amount', 'category', 'date', 'note', 'created_at'];
  const rows = transactions.map((t) => [t.id, t.type, t.amount, t.category ?? '', t.date, t.note ?? '', t.created_at ?? ''].join(','));
  return [headers.join(','), ...rows].join('\n');
}

export { db };
