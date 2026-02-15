import * as SQLite from 'expo-sqlite';
import { Goal, Transaction, Receipt } from '../../types';

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

export const getGoal = async (): Promise<Goal | null> => {
  const result = await getDb().getFirstAsync<Goal>('SELECT * FROM goals ORDER BY id DESC LIMIT 1');
  return result || null;
};

export const saveGoal = async (goal: Omit<Goal, 'id' | 'createdAt'>): Promise<number> => {
  const createdAt = new Date().toISOString();
  const result = await getDb().runAsync(
    'INSERT INTO goals (name, targetAmount, monthlySavingsTarget, deadline, createdAt) VALUES (?, ?, ?, ?, ?)',
    [goal.name, goal.targetAmount, goal.monthlySavingsTarget, goal.deadline || null, createdAt]
  );
  return result.lastInsertRowId;
};

export const updateGoal = async (id: number, goal: Partial<Goal>): Promise<void> => {
  const fields = Object.keys(goal).filter(k => k !== 'id' && k !== 'createdAt');
  const values = fields.map(f => (goal as any)[f]);
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  await getDb().runAsync(`UPDATE goals SET ${setClause} WHERE id = ?`, [...values, id]);
};

export const getTransactions = async (): Promise<Transaction[]> => {
  return await getDb().getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC, id DESC');
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<number> => {
  const createdAt = new Date().toISOString();
  const result = await getDb().runAsync(
    'INSERT INTO transactions (type, amount, category, source, notes, date, receiptId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [transaction.type, transaction.amount, transaction.category || null, transaction.source || null, transaction.notes || null, transaction.date, transaction.receiptId || null, createdAt]
  );
  return result.lastInsertRowId;
};

export const deleteTransaction = async (id: number): Promise<void> => {
  await getDb().runAsync('DELETE FROM transactions WHERE id = ?', [id]);
};

export const getReceipts = async (): Promise<Receipt[]> => {
  return await getDb().getAllAsync<Receipt>('SELECT * FROM receipts ORDER BY date DESC, id DESC');
};

export const addReceipt = async (receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<number> => {
  const createdAt = new Date().toISOString();
  const result = await getDb().runAsync(
    'INSERT INTO receipts (imageUri, storeName, totalAmount, date, items, category, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [receipt.imageUri, receipt.storeName || null, receipt.totalAmount, receipt.date, receipt.items || null, receipt.category || null, createdAt]
  );
  return result.lastInsertRowId;
};

export const deleteReceipt = async (id: number): Promise<void> => {
  await getDb().runAsync('DELETE FROM receipts WHERE id = ?', [id]);
};

export const getTotalIncome = async (): Promise<number> => {
  const result = await getDb().getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'`);
  return result?.total || 0;
};

export const getTotalExpenses = async (): Promise<number> => {
  const result = await getDb().getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'`);
  return result?.total || 0;
};

export const getTodaySpending = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const result = await getDb().getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date LIKE ?`, [`${today}%`]);
  return result?.total || 0;
};

export const getWeekSpending = async (): Promise<number> => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await getDb().getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?`, [weekAgo]);
  return result?.total || 0;
};

export const getMonthSpending = async (): Promise<number> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const result = await getDb().getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?`, [monthStart]);
  return result?.total || 0;
};

export const getCategoryTotals = async (): Promise<{ category: string; total: number }[]> => {
  return await getDb().getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM transactions WHERE type = 'expense' AND category IS NOT NULL GROUP BY category ORDER BY total DESC`
  );
};

export const getSetting = async (key: string): Promise<string | null> => {
  const result = await getDb().getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return result?.value || null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  await getDb().runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
};
