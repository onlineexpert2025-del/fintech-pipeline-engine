import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getGoal } from '../lib/db';

export function GoalCard() {
  const goal = getGoal();

  if (!goal) return null;

  const remaining = Math.max(0, goal.target - goal.saved);
  const progress = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
  const months = goal.monthly_contribution > 0
    ? Math.ceil(remaining / goal.monthly_contribution)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {}}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <Text style={styles.label}>Current Goal</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
      <Text style={styles.name}>{goal.name}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
      </View>
      <Text style={styles.percent}>{progress.toFixed(1)}%</Text>
      <View style={styles.row}>
        <Text style={styles.metric}>Saved</Text>
        <Text style={styles.metric}>Target</Text>
        <Text style={styles.metric}>Remaining</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.value}>${goal.saved.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.value}>${goal.target.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.value}>${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
      </View>
      <Text style={styles.footer}>{months} months to reach goal</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  chevron: { color: '#fff', fontSize: 24, fontWeight: '300' },
  name: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 3 },
  percent: { color: '#fff', fontSize: 14, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metric: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  value: { color: '#fff', fontSize: 14, fontWeight: '700' },
  footer: { color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center', marginTop: 12 },
});
