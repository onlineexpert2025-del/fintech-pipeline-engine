import * as SQLite from 'expo-sqlite';
import { Goal, Transaction, Receipt, DailyTarget } from '../types';

/**
 * Returns an ISO-8601 timestamp in the device's LOCAL timezone.
 * e.g.  "2025-02-20T23:45:00-08:00"
 * Unlike new Date().toISOString() which is always UTC.
 */
const localISOString = (): string => {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000; // offset in ms (negative = ahead of UTC)
  const localTime = new Date(now.getTime() - tzOffsetMs);
  const isoLocal = localTime.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
  const sign = now.getTimezoneOffset() <= 0 ? '+' : '-';
  const absOffset = Math.abs(now.getTimezoneOffset());
  const hh = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const mm = String(absOffset % 60).padStart(2, '0');
  return `${isoLocal}${sign}${hh}:${mm}`;
};

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync('goalpulse.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      targetAmount REAL NOT NULL,
      monthlySavingsTarget REAL NOT NULL,
      deadline TEXT,
      createdAt TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      source TEXT,
      notes TEXT,
      date TEXT NOT NULL,
      receiptId INTEGER,
      createdAt TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imageUri TEXT NOT NULL,
      storeName TEXT,
      totalAmount REAL NOT NULL,
      date TEXT NOT NULL,
      items TEXT,
      category TEXT,
      createdAt TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS daily_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      targetAmount REAL NOT NULL,
      achieved INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
};

const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) throw new Error('Database not initialized');
  return db;
};

// Goal operations
export const getGoal = async (): Promise<Goal | null> => {
  const result = await getDb().getFirstAsync<Goal>('SELECT * FROM goals ORDER BY id DESC LIMIT 1');
  return result || null;
};

export const saveGoal = async (goal: Omit<Goal, 'id' | 'createdAt'>): Promise<number> => {
  const result = await getDb().runAsync(
    'INSERT INTO goals (name, targetAmount, monthlySavingsTarget, deadline, createdAt) VALUES (?, ?, ?, ?, ?)',
    [goal.name, goal.targetAmount, goal.monthlySavingsTarget, goal.deadline || null, localISOString()]
  );
  return result.lastInsertRowId;
};

export const updateGoal = async (id: number, goal: Partial<Goal>): Promise<void> => {
  const fields: string[] = [];
  const values: any[] = [];

  if (goal.name !== undefined) { fields.push('name = ?'); values.push(goal.name); }
  if (goal.targetAmount !== undefined) { fields.push('targetAmount = ?'); values.push(goal.targetAmount); }
  if (goal.monthlySavingsTarget !== undefined) { fields.push('monthlySavingsTarget = ?'); values.push(goal.monthlySavingsTarget); }
  if (goal.deadline !== undefined) { fields.push('deadline = ?'); values.push(goal.deadline); }

  if (fields.length > 0) {
    values.push(id);
    await getDb().runAsync(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`, values);
  }
};

// Transaction operations
export const getTransactions = async (): Promise<Transaction[]> => {
  return await getDb().getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC, id DESC');
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<number> => {
  const result = await getDb().runAsync(
    'INSERT INTO transactions (type, amount, category, source, notes, date, receiptId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [transaction.type, transaction.amount, transaction.category || null, transaction.source || null, transaction.notes || null, transaction.date, transaction.receiptId || null, localISOString()]
  );
  return result.lastInsertRowId;
};

export const deleteTransaction = async (id: number): Promise<void> => {
  await getDb().runAsync('DELETE FROM transactions WHERE id = ?', [id]);
};

export const updateTransaction = async (id: number, transaction: Partial<Transaction>): Promise<void> => {
  const fields: string[] = [];
  const values: any[] = [];

  if (transaction.type !== undefined) { fields.push('type = ?'); values.push(transaction.type); }
  if (transaction.amount !== undefined) { fields.push('amount = ?'); values.push(transaction.amount); }
  if (transaction.category !== undefined) { fields.push('category = ?'); values.push(transaction.category); }
  if (transaction.source !== undefined) { fields.push('source = ?'); values.push(transaction.source); }
  if (transaction.notes !== undefined) { fields.push('notes = ?'); values.push(transaction.notes); }
  if (transaction.date !== undefined) { fields.push('date = ?'); values.push(transaction.date); }
  if (transaction.receiptId !== undefined) { fields.push('receiptId = ?'); values.push(transaction.receiptId); }

  if (fields.length > 0) {
    values.push(id);
    await getDb().runAsync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
  }
};

export const getTransactionsByReceiptId = async (receiptId: number): Promise<Transaction[]> => {
  return await getDb().getAllAsync<Transaction>(
    'SELECT * FROM transactions WHERE receiptId = ?',
    [receiptId]
  );
};

// Receipt operations
export const getReceipts = async (): Promise<Receipt[]> => {
  return await getDb().getAllAsync<Receipt>('SELECT * FROM receipts ORDER BY date DESC, id DESC');
};

export const addReceipt = async (receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<number> => {
  const result = await getDb().runAsync(
    'INSERT INTO receipts (imageUri, storeName, totalAmount, date, items, category, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [receipt.imageUri, receipt.storeName || '', receipt.totalAmount, receipt.date, receipt.items || '', receipt.category || 'other', localISOString()]
  );
  return result.lastInsertRowId;
};

export const getReceiptsByDate = async (date: string): Promise<Receipt[]> => {
  return await getDb().getAllAsync<Receipt>(
    'SELECT * FROM receipts WHERE date LIKE ? ORDER BY id DESC',
    [`${date}%`]
  );
};

export const deleteReceipt = async (id: number): Promise<void> => {
  await getDb().runAsync('DELETE FROM receipts WHERE id = ?', [id]);
};

export const updateReceipt = async (id: number, receipt: Partial<Receipt>): Promise<void> => {
  const fields: string[] = [];
  const values: any[] = [];

  if (receipt.imageUri !== undefined) { fields.push('imageUri = ?'); values.push(receipt.imageUri); }
  if (receipt.storeName !== undefined) { fields.push('storeName = ?'); values.push(receipt.storeName); }
  if (receipt.totalAmount !== undefined) { fields.push('totalAmount = ?'); values.push(receipt.totalAmount); }
  if (receipt.date !== undefined) { fields.push('date = ?'); values.push(receipt.date); }
  if (receipt.items !== undefined) { fields.push('items = ?'); values.push(receipt.items); }
  if (receipt.category !== undefined) { fields.push('category = ?'); values.push(receipt.category); }

  if (fields.length > 0) {
    values.push(id);
    await getDb().runAsync(`UPDATE receipts SET ${fields.join(', ')} WHERE id = ?`, values);
  }
};

// Stats operations
export const getTotalIncome = async (): Promise<number> => {
  const result = await getDb().getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'"
  );
  return result?.total || 0;
};

export const getTotalExpenses = async (): Promise<number> => {
  const result = await getDb().getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'"
  );
  return result?.total || 0;
};

export const getTodaySpending = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const result = await getDb().getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date LIKE ?",
    [`${today}%`]
  );
  return result?.total || 0;
};

export const getWeekSpending = async (): Promise<number> => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await getDb().getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?",
    [weekAgo]
  );
  return result?.total || 0;
};

export const getMonthSpending = async (): Promise<number> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const result = await getDb().getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?",
    [monthStart]
  );
  return result?.total || 0;
};

export const getCategoryTotals = async (): Promise<{ category: string; total: number }[]> => {
  return await getDb().getAllAsync<{ category: string; total: number }>(
    "SELECT category, COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND category IS NOT NULL GROUP BY category ORDER BY total DESC"
  );
};

// Settings operations
export const getSetting = async (key: string): Promise<string | null> => {
  const result = await getDb().getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return result?.value || null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  await getDb().runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
};

// Daily Targets operations
export const getDailyTarget = async (date: string): Promise<DailyTarget | null> => {
  const result = await getDb().getFirstAsync<DailyTarget>(
    'SELECT * FROM daily_targets WHERE date = ?',
    [date]
  );
  return result ? { ...result, achieved: (result.achieved as any) === 1 } : null;
};

export const saveDailyTarget = async (target: Omit<DailyTarget, 'id' | 'createdAt'>): Promise<number> => {
  const result = await getDb().runAsync(
    'INSERT OR REPLACE INTO daily_targets (date, targetAmount, achieved, createdAt) VALUES (?, ?, ?, ?)',
    [target.date, target.targetAmount, target.achieved ? 1 : 0, localISOString()]
  );
  return result.lastInsertRowId;
};

export const getMonthlyTargets = async (year: number, month: number): Promise<DailyTarget[]> => {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const results = await getDb().getAllAsync<DailyTarget>(
    'SELECT * FROM daily_targets WHERE date LIKE ? ORDER BY date ASC',
    [`${monthStr}%`]
  );
  return results.map(r => ({ ...r, achieved: (r.achieved as any) === 1 }));
};

export const markDailyTargetAchieved = async (date: string, achieved: boolean): Promise<void> => {
  await getDb().runAsync(
    'UPDATE daily_targets SET achieved = ? WHERE date = ?',
    [achieved ? 1 : 0, date]
  );
};
