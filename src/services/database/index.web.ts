import { Goal, Transaction, Receipt } from '../../types';

// Web: localStorage-based storage
let webStorage = {
  goals: [] as Goal[],
  transactions: [] as Transaction[],
  receipts: [] as Receipt[],
  settings: {} as Record<string, string>,
  nextGoalId: 1,
  nextTransactionId: 1,
  nextReceiptId: 1,
};

const loadWebStorage = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('goalpulse_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        webStorage = { ...webStorage, ...parsed };
      } catch (e) {
        console.error('Failed to load storage:', e);
      }
    }
  }
};

const saveWebStorage = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem('goalpulse_data', JSON.stringify(webStorage));
  }
};

export const initDatabase = async (): Promise<void> => {
  loadWebStorage();
};

export const getGoal = async (): Promise<Goal | null> => {
  return webStorage.goals.length > 0 ? webStorage.goals[webStorage.goals.length - 1] : null;
};

export const saveGoal = async (goal: Omit<Goal, 'id' | 'createdAt'>): Promise<number> => {
  const id = webStorage.nextGoalId++;
  const createdAt = new Date().toISOString();
  webStorage.goals.push({ ...goal, id, createdAt });
  saveWebStorage();
  return id;
};

export const updateGoal = async (id: number, goal: Partial<Goal>): Promise<void> => {
  const index = webStorage.goals.findIndex(g => g.id === id);
  if (index !== -1) {
    webStorage.goals[index] = { ...webStorage.goals[index], ...goal };
    saveWebStorage();
  }
};

export const getTransactions = async (): Promise<Transaction[]> => {
  return [...webStorage.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<number> => {
  const id = webStorage.nextTransactionId++;
  const createdAt = new Date().toISOString();
  webStorage.transactions.push({ ...transaction, id, createdAt });
  saveWebStorage();
  return id;
};

export const deleteTransaction = async (id: number): Promise<void> => {
  webStorage.transactions = webStorage.transactions.filter(t => t.id !== id);
  saveWebStorage();
};

export const getReceipts = async (): Promise<Receipt[]> => {
  return [...webStorage.receipts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addReceipt = async (receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<number> => {
  const id = webStorage.nextReceiptId++;
  const createdAt = new Date().toISOString();
  webStorage.receipts.push({ ...receipt, id, createdAt });
  saveWebStorage();
  return id;
};

export const deleteReceipt = async (id: number): Promise<void> => {
  webStorage.receipts = webStorage.receipts.filter(r => r.id !== id);
  saveWebStorage();
};

export const getTotalIncome = async (): Promise<number> => {
  return webStorage.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
};

export const getTotalExpenses = async (): Promise<number> => {
  return webStorage.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
};

export const getTodaySpending = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  return webStorage.transactions.filter(t => t.type === 'expense' && t.date.startsWith(today)).reduce((sum, t) => sum + t.amount, 0);
};

export const getWeekSpending = async (): Promise<number> => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return webStorage.transactions.filter(t => t.type === 'expense' && t.date >= weekAgo).reduce((sum, t) => sum + t.amount, 0);
};

export const getMonthSpending = async (): Promise<number> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return webStorage.transactions.filter(t => t.type === 'expense' && t.date >= monthStart).reduce((sum, t) => sum + t.amount, 0);
};

export const getCategoryTotals = async (): Promise<{ category: string; total: number }[]> => {
  const totals: Record<string, number> = {};
  webStorage.transactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
    totals[t.category!] = (totals[t.category!] || 0) + t.amount;
  });
  return Object.entries(totals).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
};

export const getSetting = async (key: string): Promise<string | null> => {
  return webStorage.settings[key] || null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  webStorage.settings[key] = value;
  saveWebStorage();
};
