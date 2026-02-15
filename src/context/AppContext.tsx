import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as db from '../services/database';
import { Goal, Transaction, Receipt, AppStats, CategorySummary, DailyTarget } from '../types';
import { CATEGORIES } from '../utils/theme';
import { getTodayTarget, checkTodayTargetAchieved } from '../utils/dailyTargetsGenerator';

type UndoAction = {
  type: 'transaction' | 'receipt';
  data: Transaction | Receipt;
  relatedData?: Transaction[];
};

interface AppContextType {
  isLoading: boolean;
  isSetupComplete: boolean;
  goal: Goal | null;
  transactions: Transaction[];
  receipts: Receipt[];
  stats: AppStats;
  currency: string;
  undoAction: UndoAction | null;
  todayTarget: DailyTarget | null;
  refreshData: () => Promise<void>;
  setGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: number, goal: Partial<Goal>) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: number, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  addReceipt: (receipt: Omit<Receipt, 'id' | 'createdAt'>) => Promise<number>;
  updateReceipt: (id: number, receipt: Partial<Receipt>) => Promise<void>;
  deleteReceipt: (id: number, deleteLinkedExpenses?: boolean) => Promise<void>;
  performUndo: () => Promise<void>;
  completeSetup: () => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  refreshDailyTarget: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [currency, setCurrencyState] = useState('USD');
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [todayTarget, setTodayTarget] = useState<DailyTarget | null>(null);
  const [stats, setStats] = useState<AppStats>({
    totalIncome: 0,
    totalExpenses: 0,
    totalSaved: 0,
    todaySpending: 0,
    weekSpending: 0,
    monthSpending: 0,
    topCategories: [],
  });

  const calculateStats = useCallback(async () => {
    const [totalIncome, totalExpenses, todaySpending, weekSpending, monthSpending, categoryTotals] = await Promise.all([
      db.getTotalIncome(),
      db.getTotalExpenses(),
      db.getTodaySpending(),
      db.getWeekSpending(),
      db.getMonthSpending(),
      db.getCategoryTotals(),
    ]);

    // ALL categories for pie chart - with distinct colors
    const topCategories: CategorySummary[] = categoryTotals.map((ct, index) => {
      const cat = CATEGORIES.find((c) => c.id === ct.category);
      // Fallback colors for categories without a match
      const fallbackColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
      const color = cat?.color || fallbackColors[index % fallbackColors.length];
      return {
        category: ct.category,
        total: ct.total,
        percentage: totalExpenses > 0 ? (ct.total / totalExpenses) * 100 : 0,
        icon: cat?.icon || 'category',
        color: color,
      };
    }); // No slice - show ALL categories

    setStats({
      totalIncome,
      totalExpenses,
      totalSaved: totalIncome - totalExpenses,
      todaySpending,
      weekSpending,
      monthSpending,
      topCategories,
    });
  }, []);

  const refreshDailyTarget = useCallback(async () => {
    try {
      const goalData = await db.getGoal();
      if (goalData && goalData.monthlySavingsTarget > 0) {
        const target = await getTodayTarget(goalData.monthlySavingsTarget);
        setTodayTarget(target);
        
        // Check if today's target is achieved
        if (target) {
          const todaySavings = stats.totalSaved - stats.todaySpending;
          const achieved = await checkTodayTargetAchieved(todaySavings, target.targetAmount);
          if (achieved && !target.achieved) {
            await db.markDailyTargetAchieved(target.date, true);
            target.achieved = true;
            setTodayTarget({ ...target });
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing daily target:', error);
    }
  }, [stats.totalSaved, stats.todaySpending]);

  const refreshData = useCallback(async () => {
    try {
      const [goalData, transactionsData, receiptsData, savedCurrency] = await Promise.all([
        db.getGoal(),
        db.getTransactions(),
        db.getReceipts(),
        db.getSetting('currency'),
      ]);
      
      setGoalState(goalData);
      setTransactions(transactionsData);
      setReceipts(receiptsData);
      if (savedCurrency) setCurrencyState(savedCurrency);
      await calculateStats();
      await refreshDailyTarget();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [calculateStats, refreshDailyTarget]);

  const initialize = useCallback(async () => {
    try {
      await db.initDatabase();
      const [setupComplete, savedCurrency] = await Promise.all([
        db.getSetting('setupComplete'),
        db.getSetting('currency'),
      ]);
      setIsSetupComplete(setupComplete === 'true');
      if (savedCurrency) setCurrencyState(savedCurrency);
      await refreshData();
    } catch (error) {
      console.error('Error initializing:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const setGoal = async (goalData: Omit<Goal, 'id' | 'createdAt'>) => {
    await db.saveGoal(goalData);
    await refreshData();
  };

  const updateGoal = async (id: number, goalData: Partial<Goal>) => {
    await db.updateGoal(id, goalData);
    await refreshData();
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    await db.addTransaction(transaction);
    await refreshData();
  };

  const updateTransaction = async (id: number, transaction: Partial<Transaction>) => {
    await db.updateTransaction(id, transaction);
    await refreshData();
  };

  const deleteTransaction = async (id: number) => {
    // FIX #5: Ensure database deletion completes first
    try {
      // Store for undo BEFORE deleting
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        setUndoAction({ type: 'transaction', data: transaction });
      }
      
      // Wait for database deletion to complete
      await db.deleteTransaction(id);
      
      // Only refresh UI after DB confirms deletion
      await refreshData();
    } catch (error) {
      console.error('[AppContext] Failed to delete transaction:', error);
      throw error;
    }
  };

  const addReceipt = async (receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<number> => {
    const receiptId = await db.addReceipt(receipt);
    await refreshData();
    return receiptId;
  };

  const updateReceipt = async (id: number, receipt: Partial<Receipt>) => {
    await db.updateReceipt(id, receipt);
    await refreshData();
  };

  const deleteReceipt = async (id: number, deleteLinkedExpenses: boolean = false) => {
    // FIX #5: Ensure all database deletions complete before UI update
    try {
      // Store for undo BEFORE deleting
      const receipt = receipts.find(r => r.id === id);
      let linkedTransactions: Transaction[] = [];
      
      if (receipt) {
        linkedTransactions = await db.getTransactionsByReceiptId(id);
        setUndoAction({ 
          type: 'receipt', 
          data: receipt, 
          relatedData: linkedTransactions 
        });
      }

      // Delete linked expenses if requested - await ALL deletions
      if (deleteLinkedExpenses && linkedTransactions.length > 0) {
        await Promise.all(
          linkedTransactions.map(transaction => db.deleteTransaction(transaction.id))
        );
      }

      // Wait for receipt deletion to complete
      await db.deleteReceipt(id);
      
      // Only refresh UI after DB confirms all deletions
      await refreshData();
    } catch (error) {
      console.error('[AppContext] Failed to delete receipt:', error);
      throw error;
    }
  };

  const performUndo = async () => {
    if (!undoAction) return;

    if (undoAction.type === 'transaction') {
      const transaction = undoAction.data as Transaction;
      await db.addTransaction({
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        source: transaction.source,
        notes: transaction.notes,
        date: transaction.date,
        receiptId: transaction.receiptId,
      });
    } else if (undoAction.type === 'receipt') {
      const receipt = undoAction.data as Receipt;
      const receiptId = await db.addReceipt({
        imageUri: receipt.imageUri,
        storeName: receipt.storeName,
        totalAmount: receipt.totalAmount,
        date: receipt.date,
        items: receipt.items,
        category: receipt.category,
      });

      // Restore linked transactions if they exist
      if (undoAction.relatedData && undoAction.relatedData.length > 0) {
        for (const transaction of undoAction.relatedData) {
          await db.addTransaction({
            type: transaction.type,
            amount: transaction.amount,
            category: transaction.category,
            source: transaction.source,
            notes: transaction.notes,
            date: transaction.date,
            receiptId: receiptId,
          });
        }
      }
    }

    setUndoAction(null);
    await refreshData();
  };

  const completeSetup = async () => {
    await db.setSetting('setupComplete', 'true');
    setIsSetupComplete(true);
  };

  const setCurrency = async (code: string) => {
    await db.setSetting('currency', code);
    setCurrencyState(code);
  };

  const clearAllData = async () => {
    // Delete all transactions
    for (const t of transactions) {
      await db.deleteTransaction(t.id);
    }
    // Delete all receipts
    for (const r of receipts) {
      await db.deleteReceipt(r.id);
    }
    // Reset setup
    await db.setSetting('setupComplete', 'false');
    setIsSetupComplete(false);
    await refreshData();
  };

  return (
    <AppContext.Provider
      value={{
        isLoading,
        isSetupComplete,
        goal,
        transactions,
        receipts,
        stats,
        currency,
        undoAction,
        todayTarget,
        refreshData,
        refreshDailyTarget,
        setGoal,
        updateGoal,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addReceipt,
        updateReceipt,
        deleteReceipt,
        performUndo,
        completeSetup,
        setCurrency,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
