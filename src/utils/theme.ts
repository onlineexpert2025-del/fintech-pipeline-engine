export const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#3B82F6',
  secondaryLight: '#DBEAFE',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  white: '#FFFFFF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const CATEGORIES = [
  { id: 'food', name: 'Food & Drinks', icon: 'restaurant', color: '#F97316' },
  { id: 'smoking', name: 'Smoking / Alcohol', icon: 'smoking-rooms', color: '#8B5CF6' },
  { id: 'fuel', name: 'Fuel / Gas', icon: 'local-gas-station', color: '#EF4444' },
  { id: 'groceries', name: 'Groceries', icon: 'shopping-cart', color: '#10B981' },
  { id: 'shopping', name: 'Shopping / Clothes', icon: 'shopping-bag', color: '#EC4899' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'receipt', color: '#6366F1' },
  { id: 'transport', name: 'Transport / Uber / Taxi', icon: 'directions-car', color: '#14B8A6' },
  { id: 'health', name: 'Health', icon: 'medical-services', color: '#EF4444' },
  { id: 'entertainment', name: 'Entertainment', icon: 'movie', color: '#F59E0B' },
  { id: 'other', name: 'Other Expenses', icon: 'more-horiz', color: '#64748B' },
];

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
];

export const getCurrencyByCode = (code: string): Currency => {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

export const formatMoney = (amount: number, currencyCode: string = 'USD'): string => {
  const currency = getCurrencyByCode(currencyCode);
  const formatted = Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return amount < 0 ? `-${currency.symbol}${formatted}` : `${currency.symbol}${formatted}`;
};

// Legacy function for backward compatibility
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getCurrencySymbol = (currency?: string): string => {
  const c = (currency || 'USD').toUpperCase();
  const map: Record<string, string> = {
    USD: '$',
    PKR: '₨',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    SAR: '﷼',
    CNY: '¥',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'A$',
    BDT: '৳',
  };
  return map[c] || '$';
};
