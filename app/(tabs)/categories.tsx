import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  getCategoryTotals,
  getTransactions,
  deleteTransaction,
  type Transaction,
} from '../../lib/db';
import { colors, categoryColors, categoryIcons, CATEGORIES } from '../../lib/theme';

export default function CategoriesScreen() {
  const categoryTotals = getCategoryTotals();
  const allCategories = [...new Set([...CATEGORIES, ...categoryTotals.map((c) => c.category).filter(Boolean)])];
  const totalExpenses = categoryTotals.reduce((s, c) => s + c.total, 0);
  const transactions = getTransactions(20);

  const handleDeleteTransaction = (t: Transaction) => {
    Alert.alert('Delete Transaction', `Remove ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(t.id) },
    ]);
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m || '1', 10) - 1]} ${parseInt(day || '1', 10)}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Categories</Text>

      <View style={styles.categories}>
        {allCategories.map((cat) => {
          const ct = categoryTotals.find((c) => c.category === cat);
          const total = ct?.total ?? 0;
          const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
          return (
            <View key={cat} style={styles.categoryRow}>
              <View style={[styles.categoryIcon, { backgroundColor: (categoryColors[cat] || colors.textMuted) + '33' }]}>
                <Text style={styles.categoryIconText}>{categoryIcons[cat] || '⋯'}</Text>
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{cat}</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, pct)}%`, backgroundColor: categoryColors[cat] || colors.textMuted },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>${total.toFixed(2)}</Text>
                <Text style={styles.categoryPct}>{pct.toFixed(1)}%</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {transactions.map((t) => (
        <View key={t.id} style={styles.transactionRow}>
          <View style={styles.transactionLeft}>
            <Text style={styles.transactionDesc}>
              {t.category || t.type}
              {t.receipt_id ? ' (From receipt)' : ''}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(t.date)}</Text>
          </View>
          <Text style={[styles.transactionAmount, t.type === 'income' ? styles.income : styles.expense]}>
            {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
          </Text>
          <TouchableOpacity onPress={() => handleDeleteTransaction(t)} style={styles.deleteBtn}>
            <Text style={styles.deleteIcon}>🗑</Text>
          </TouchableOpacity>
        </View>
      ))}
      {transactions.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  categories: { paddingHorizontal: 20 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  categoryIconText: { fontSize: 20 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 15, fontWeight: '600', color: colors.text },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  categoryRight: { alignItems: 'flex-end' },
  categoryAmount: { fontSize: 15, fontWeight: '700', color: colors.text },
  categoryPct: { fontSize: 12, color: colors.textSecondary },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  transactionLeft: { flex: 1 },
  transactionDesc: { fontSize: 15, fontWeight: '500', color: colors.text },
  transactionDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: '700', marginRight: 12 },
  income: { color: colors.income },
  expense: { color: colors.expense },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 18 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textSecondary },
});
