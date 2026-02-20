export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  monthlySavingsTarget: number;
  deadline: string | null;
  createdAt: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  source?: string;
  notes?: string;
  date: string;
  receiptId?: number;
  createdAt: string;
}

export interface Receipt {
  id: number;
  imageUri: string;
  storeName: string;
  totalAmount: number;
  date: string;
  items?: string;
  category: string;
  ocrText?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface DailyFolder {
  date: string;
  receipts: Receipt[];
  count: number;
}

export interface DailyTarget {
  id: number;
  date: string;
  targetAmount: number;
  achieved: boolean;
  createdAt: string;
}

export interface CategorySummary {
  category: string;
  total: number;
  percentage: number;
  icon: string;
  color: string;
}

export interface AppStats {
  totalIncome: number;
  totalExpenses: number;
  totalSaved: number;
  todaySpending: number;
  weekSpending: number;
  monthSpending: number;
  topCategories: CategorySummary[];
}
