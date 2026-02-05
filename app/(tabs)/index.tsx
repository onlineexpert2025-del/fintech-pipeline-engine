import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { GoalCard } from '../../components/GoalCard';
import {
  getGoal,
  getSpendingByPeriod,
  getCategoryTotals,
  getTotalIncome,
  getTotalExpenses,
  getTransactions,
} from '../../lib/db';
import { colors, categoryColors, categoryIcons, CATEGORIES } from '../../lib/theme';
import { getTodaysChallenge } from '../../lib/dailyChallenge';

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const spending = getSpendingByPeriod();
  const categoryTotals = getCategoryTotals();
  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const total = expenses;
  const topCategories = categoryTotals
    .filter((c) => c.category && c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
  const topTotal = topCategories.reduce((s, c) => s + c.total, 0);
  const now = new Date();
  const todaysChallenge = getGoal()
    ? getTodaysChallenge(getGoal()!.monthly_contribution, now.getFullYear(), now.getMonth() + 1)
    : 0;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>GoalPulse</Text>
      <Text style={styles.date}>{formatDate()}</Text>

      <GoalCard />

      {todaysChallenge > 0 && (
        <View style={styles.challengeCard}>
          <Text style={styles.challengeTitle}>Today's Challenge</Text>
          <Text style={styles.challengeAmount}>${todaysChallenge.toFixed(2)}</Text>
          <Text style={styles.challengeSub}>Save this much today to stay on track</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.expense }]}
          onPress={() => router.push('/add-expense')}
        >
          <Text style={styles.actionIcon}>−</Text>
          <Text style={styles.actionLabel}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/add-income')}
        >
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionLabel}>Add Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
          onPress={() => router.push('/scan')}
        >
          <Text style={styles.actionIcon}>📄</Text>
          <Text style={styles.actionLabel}>Scan Receipt</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Spending Summary</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Today</Text>
          <Text style={styles.summaryAmount}>${spending.today.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Week</Text>
          <Text style={styles.summaryAmount}>${spending.week.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Month</Text>
          <Text style={styles.summaryAmount}>${spending.month.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Expense Breakdown</Text>
      <View style={styles.chartContainer}>
        <View style={styles.donut}>
          <Text style={styles.donutLabel}>Expenses</Text>
          <Text style={styles.donutAmount}>${total.toFixed(2)}</Text>
        </View>
        {topCategories.length > 0 && (
          <View style={styles.legend}>
            {topCategories.map((c) => (
              <View key={c.category} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: categoryColors[c.category] || colors.accent }]} />
                <Text style={styles.legendText}>{c.category}</Text>
                <Text style={styles.legendAmount}>${c.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.topHeader}>
        <Text style={styles.sectionTitle}>Top Spending Categories</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/categories')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      {topCategories.length > 0 ? (
        topCategories.map((c) => {
          const pct = topTotal > 0 ? (c.total / topTotal) * 100 : 0;
          return (
            <View key={c.category} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: (categoryColors[c.category] || colors.accent) + '33' }]}>
                <Text style={styles.categoryIconText}>{categoryIcons[c.category] || '•'}</Text>
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{c.category}</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${pct}%`, backgroundColor: categoryColors[c.category] || colors.accent },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>${c.total.toFixed(2)}</Text>
                <Text style={styles.categoryPct}>{pct.toFixed(1)}%</Text>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No expenses yet</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>↑</Text>
          <Text style={styles.overviewLabel}>Total Income</Text>
          <Text style={[styles.overviewAmount, { color: colors.income }]}>${income.toFixed(2)}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewIcon, { color: colors.expense }]}>↓</Text>
          <Text style={styles.overviewLabel}>Total Expenses</Text>
          <Text style={[styles.overviewAmount, { color: colors.expense }]}>${expenses.toFixed(2)}</Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginHorizontal: 20 },
  date: { fontSize: 14, color: colors.textSecondary, marginHorizontal: 20, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginHorizontal: 20, marginTop: 20, marginBottom: 12 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: { color: '#fff', fontSize: 24, marginBottom: 4 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, color: colors.textSecondary },
  summaryAmount: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  chartContainer: { alignItems: 'center', marginVertical: 12 },
  donut: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 20,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  donutLabel: { fontSize: 12, color: colors.textSecondary },
  donutAmount: { fontSize: 20, fontWeight: '700', color: colors.text },
  legend: { width: '100%', paddingHorizontal: 40 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { flex: 1, fontSize: 14, color: colors.text },
  legendAmount: { fontSize: 14, color: colors.textSecondary },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 8 },
  seeAll: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    marginHorizontal: 20,
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
  emptyCard: { marginHorizontal: 20, padding: 24, backgroundColor: colors.cardBg, borderRadius: 12, alignItems: 'center' },
    emptyText: { color: colors.textSecondary },
  challengeCard: {
    backgroundColor: colors.cardBg,
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  challengeTitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  challengeAmount: { fontSize: 22, fontWeight: '700', color: colors.text },
  challengeSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  overviewRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  overviewCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  overviewIcon: { fontSize: 24, color: colors.income, marginBottom: 4 },
  overviewLabel: { fontSize: 12, color: colors.textSecondary },
  overviewAmount: { fontSize: 18, fontWeight: '700', marginTop: 4 },
});
