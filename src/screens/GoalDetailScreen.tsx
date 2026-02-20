import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, formatMoney } from '../utils/theme';

export const GoalDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const { goal, stats, updateGoal, setGoal, currency = 'USD' } = useApp();

  const [isEditing, setIsEditing] = useState(!goal);
  const [name, setName] = useState(goal?.name || '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() || '');
  const [monthlySavings, setMonthlySavings] = useState(goal?.monthlySavingsTarget?.toString() || '');
  const [loading, setLoading] = useState(false);

  const progress = goal ? Math.min((stats.totalSaved / goal.targetAmount) * 100, 100) : 0;
  const remaining = goal ? Math.max(goal.targetAmount - stats.totalSaved, 0) : 0;
  const monthsToGoal = goal && goal.monthlySavingsTarget > 0
    ? Math.ceil(remaining / goal.monthlySavingsTarget)
    : 0;

  const isAhead = goal && stats.totalSaved >= (goal.monthlySavingsTarget * getMonthsElapsed());

  function getMonthsElapsed(): number {
    if (!goal) return 0;
    const start = new Date(goal.createdAt);
    const now = new Date();
    return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
  }

  const handleSave = async () => {
    if (!name.trim() || !targetAmount || !monthlySavings) return;

    setLoading(true);
    try {
      if (goal) {
        await updateGoal(goal.id, {
          name: name.trim(),
          targetAmount: parseFloat(targetAmount),
          monthlySavingsTarget: parseFloat(monthlySavings),
        });
      } else {
        await setGoal({
          name: name.trim(),
          targetAmount: parseFloat(targetAmount),
          monthlySavingsTarget: parseFloat(monthlySavings),
          deadline: null,
        });
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.label}>Goal Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Emergency Fund"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Target Amount</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="numeric"
                  placeholder="10,000"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Monthly Savings Target</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={monthlySavings}
                  onChangeText={setMonthlySavings}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            {goal && (
              <Button
                mode="outlined"
                onPress={() => setIsEditing(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            )}
            <Button
              mode="contained"
              onPress={handleSave}
              loading={loading}
              disabled={!name.trim() || !targetAmount || !monthlySavings || loading}
              style={[styles.saveButton, !goal && { flex: 1 }]}
            >
              Save Goal
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Goal Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.goalName}>{goal?.name}</Text>

          <View style={styles.progressCircleContainer}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons name="savings" size={24} color={COLORS.primary} />
            <Text style={styles.statLabel}>Total Saved</Text>
            <Text style={styles.statValue}>{formatMoney(stats.totalSaved, currency)}</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialIcons name="flag" size={24} color={COLORS.secondary} />
            <Text style={styles.statLabel}>Target</Text>
            <Text style={styles.statValue}>{formatMoney(goal?.targetAmount || 0, currency)}</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialIcons name="trending-up" size={24} color={COLORS.warning} />
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={styles.statValue}>{formatMoney(remaining, currency)}</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialIcons name="calendar-today" size={24} color={COLORS.error} />
            <Text style={styles.statLabel}>Monthly Target</Text>
            <Text style={styles.statValue}>{formatMoney(goal?.monthlySavingsTarget || 0, currency)}</Text>
          </View>
        </View>

        {/* Time to Goal */}
        <View style={styles.timeCard}>
          <MaterialIcons name="schedule" size={32} color={COLORS.secondary} />
          <View style={styles.timeInfo}>
            <Text style={styles.timeLabel}>Time to reach goal</Text>
            <Text style={styles.timeValue}>
              {monthsToGoal > 0 ? `${monthsToGoal} month${monthsToGoal !== 1 ? 's' : ''}` : 'Goal reached!'}
            </Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, isAhead ? styles.aheadCard : styles.behindCard]}>
          <MaterialIcons
            name={isAhead ? 'trending-up' : 'trending-down'}
            size={24}
            color={isAhead ? COLORS.primary : COLORS.error}
          />
          <Text style={[styles.statusText, isAhead ? styles.aheadText : styles.behindText]}>
            {isAhead ? "You're ahead of schedule! 🎉" : "You're behind schedule. Keep going! 💪"}
          </Text>
        </View>

        <Button
          mode="outlined"
          onPress={() => setIsEditing(true)}
          style={styles.editButton}
          icon="pencil"
        >
          Edit Goal
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  section: {
    padding: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
  },
  amountInput: {
    flex: 1,
    padding: SPACING.md,
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
  },
  progressCard: {
    backgroundColor: COLORS.primary,
    margin: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  goalName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  progressCircleContainer: {
    marginVertical: SPACING.lg,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryLight,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  timeInfo: {
    marginLeft: SPACING.md,
  },
  timeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  timeValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.md,
  },
  aheadCard: {
    backgroundColor: COLORS.primary + '25',
  },
  behindCard: {
    backgroundColor: COLORS.error + '25',
  },
  statusText: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  aheadText: {
    color: COLORS.primary,
  },
  behindText: {
    color: COLORS.error,
  },
  editButton: {
    margin: SPACING.lg,
    borderColor: COLORS.primary,
  },
});
