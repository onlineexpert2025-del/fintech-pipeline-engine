export const colors = {
  white: '#FFFFFF',
  background: '#FFFFFF',
  primary: '#22C55E',
  primaryDark: '#16A34A',
  accent: '#F97316',
  accentLight: '#FB923C',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  expense: '#EF4444',
  income: '#22C55E',
  cardBg: '#F9FAFB',
  danger: '#DC2626',
};

export const categoryColors: Record<string, string> = {
  'Food & Drinks': colors.accent,
  'Smoking / Alcohol': '#A78BFA',
  'Fuel / Gas': '#EF4444',
  Groceries: '#14B8A6',
  'Shopping / Clothes': '#EC4899',
  'Bills & Utilities': '#8B5CF6',
  Taxi: '#14B8A6',
  Health: '#EF4444',
  Entertainment: colors.accent,
  'Other Expenses': colors.textMuted,
};

export const categoryIcons: Record<string, string> = {
  'Food & Drinks': '🍴',
  'Smoking / Alcohol': '🚬',
  'Fuel / Gas': '⛽',
  Groceries: '🛒',
  'Shopping / Clothes': '🛍️',
  'Bills & Utilities': '📄',
  Taxi: '🚕',
  Health: '🏥',
  Entertainment: '🎬',
  'Other Expenses': '⋯',
};

export const CATEGORIES = Object.keys(categoryColors);
