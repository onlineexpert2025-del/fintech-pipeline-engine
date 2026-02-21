import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp, useColors } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, formatMoney, CATEGORIES, ColorPalette } from '../utils/theme';
import { getDifficultyLabel, getDifficultyColor } from '../utils/dailyTargetsGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grid Configuration - 200 boxes, 50 per page
const TOTAL_BOXES = 200;
const BOXES_PER_PAGE = 50;
const GRID_COLS = 10;
const GRID_ROWS = 5;
const BOX_MARGIN = 3;
// FIXED: Ensure minimum box size for readability
const CALCULATED_BOX_SIZE = (SCREEN_WIDTH - 32 - (GRID_COLS - 1) * BOX_MARGIN) / GRID_COLS;
const BOX_SIZE = Math.max(CALCULATED_BOX_SIZE, 26); // Minimum 26px

// Grid box type
interface GridBox {
  id: number;
  amount: number;
  status: 'completed' | 'active' | 'future';
  date?: string;
}

type RootStackParamList = {
  Home: undefined;
  AddExpense: undefined;
  AddIncome: undefined;
  Scanner: undefined;
  Categories: undefined;
  GoalDetail: undefined;
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { goal, stats, currency, todayTarget, refreshData } = useApp();
  const COLORS = useColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // Grid state
  const [gridBoxes, setGridBoxes] = useState<GridBox[]>([]);
  const [showGridModal, setShowGridModal] = useState(false);
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Configuration State
  const [targetAmount, setTargetAmount] = useState(10000); // 5000 | 10000
  const [daysConfig, setDaysConfig] = useState(365); // 365 (Easy) | 300 (Med) | 250 (Hard)

  const totalPages = Math.ceil(gridBoxes.length / BOXES_PER_PAGE);
  const progress = goal ? Math.min((stats.totalSaved / goal.targetAmount) * 100, 100) : 0;
  const remaining = goal ? Math.max(goal.targetAmount - stats.totalSaved, 0) : 0;

  // Priority C: Calculate Months + Days to goal
  const timeToGoal = useMemo(() => {
    if (!goal || goal.monthlySavingsTarget <= 0 || remaining <= 0) {
      return { months: 0, days: 0 };
    }
    const dailySavingsRate = goal.monthlySavingsTarget / 30;
    const totalDaysRemaining = Math.ceil(remaining / dailySavingsRate);
    const months = Math.floor(totalDaysRemaining / 30);
    const days = totalDaysRemaining % 30;
    return { months, days };
  }, [goal, remaining]);

  // Helper to generate unique storage key for current config
  const getStorageKey = (target: number, days: number) => `savings_grid_state_v3_${target}_${days}`;

  // Initialize Grid when config changes
  useEffect(() => {
    loadGridState(targetAmount, daysConfig);
  }, [targetAmount, daysConfig]);

  // Load saved state (if matches config) or init new
  useEffect(() => {
    // Initial load
    loadGridState(targetAmount, daysConfig);
  }, []);

  const loadGridState = async (target: number, days: number) => {
    try {
      const key = getStorageKey(target, days);
      const saved = await AsyncStorage.getItem(key);

      if (saved) {
        const parsed = JSON.parse(saved);
        // Double check config matches (redundant with key, but safe)
        if (parsed.target === target && parsed.days === days && parsed.boxes?.length === days) {
          setGridBoxes(parsed.boxes);
          const activeIdx = parsed.boxes.findIndex((b: any) => b.status === 'active');
          setActiveBoxIndex(activeIdx >= 0 ? activeIdx : 0);
          if (activeIdx >= 0) setCurrentPage(Math.floor(activeIdx / BOXES_PER_PAGE));
          return;
        }
      }

      // If no saved state found for this config, initialize new
      initializeNewGrid(target, days);
    } catch (error) {
      console.error('Error loading grid state:', error);
      initializeNewGrid(target, days);
    }
  };

  const initializeNewGrid = (target: number, duration: number) => {
    // Exact Sum Algorithm
    const base = Math.floor(target / duration);
    const remainder = target % duration;

    // Fill array
    const amounts = new Array(duration).fill(base);
    for (let i = 0; i < remainder; i++) {
      amounts[i]++;
    }

    // Add variance (shuffle amounts slightly)
    const variance = Math.floor(base * 0.4);
    for (let i = 0; i < duration * 2; i++) {
      const idx1 = Math.floor(Math.random() * duration);
      const idx2 = Math.floor(Math.random() * duration);
      if (idx1 === idx2) continue;

      const change = Math.floor(Math.random() * variance) + 1;

      // Safety checks: min 1, prevent excessively large spikes
      if (amounts[idx1] - change >= 1 && amounts[idx2] + change <= base * 2.5) {
        amounts[idx1] -= change;
        amounts[idx2] += change;
      }
    }

    // Shuffle
    for (let i = duration - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
    }

    const boxes: GridBox[] = amounts.map((amt, i) => ({
      id: i,
      amount: amt,
      status: i === 0 ? 'active' : 'future',
    }));

    setGridBoxes(boxes);
    setActiveBoxIndex(0);
    setCurrentPage(0);
    saveGridState(boxes, target, duration);
  };

  const saveGridState = async (boxes: GridBox[], t = targetAmount, d = daysConfig) => {
    try {
      const key = getStorageKey(t, d);
      const state = { target: t, days: d, boxes };
      await AsyncStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
  };

  // Handle Box Completion / Skipping (Similar Logic, updated state save)
  const handleCompleteBox = async () => {
    if (activeBoxIndex >= gridBoxes.length) return;
    const updated = [...gridBoxes];
    updated[activeBoxIndex] = { ...updated[activeBoxIndex], status: 'completed', date: new Date().toISOString() };

    let nextIdx = activeBoxIndex + 1;
    if (nextIdx < gridBoxes.length) {
      updated[nextIdx] = { ...updated[nextIdx], status: 'active' };
      setActiveBoxIndex(nextIdx);
      setCurrentPage(Math.floor(nextIdx / BOXES_PER_PAGE));
    }
    setGridBoxes(updated);
    saveGridState(updated);
  };

  const handleSkipBox = async () => {
    if (activeBoxIndex >= gridBoxes.length) return;
    const updated = [...gridBoxes];
    const skippedAmount = updated[activeBoxIndex].amount;
    const futureCount = updated.filter(b => b.status === 'future').length;

    if (futureCount > 0) {
      const added = skippedAmount / futureCount;
      updated.forEach((box, i) => {
        if (box.status === 'future') {
          updated[i] = { ...box, amount: box.amount + added };
        }
      });
    }

    updated[activeBoxIndex] = { ...updated[activeBoxIndex], status: 'completed', amount: 0, date: new Date().toISOString() };

    let nextIdx = activeBoxIndex + 1;
    if (nextIdx < gridBoxes.length) {
      updated[nextIdx] = { ...updated[nextIdx], status: 'active' };
      setActiveBoxIndex(nextIdx);
      setCurrentPage(Math.floor(nextIdx / BOXES_PER_PAGE));
    }
    setGridBoxes(updated);
    saveGridState(updated);
  };

  const completedCount = gridBoxes.filter(b => b.status === 'completed').length;
  const totalSavedFromGrid = gridBoxes
    .filter(b => b.status === 'completed' && b.amount > 0)
    .reduce((sum, b) => sum + b.amount, 0);
  const activeBox = gridBoxes[activeBoxIndex];

  // Helper for rendering grid pages
  const renderGridPage = ({ item: pageIndex }: { item: number }) => {
    const start = pageIndex * BOXES_PER_PAGE;
    const end = Math.min(start + BOXES_PER_PAGE, gridBoxes.length);
    const pageBoxes = gridBoxes.slice(start, end);

    return (
      <View style={{ width: SCREEN_WIDTH - 32, marginRight: 0 }}>
        <View style={styles.gridContainer}>
          {pageBoxes.map((box) => {
            const isActive = box.status === 'active';
            const isCompleted = box.status === 'completed';
            return (
              <Pressable
                key={box.id}
                style={[
                  styles.gridBox,
                  isCompleted && styles.gridBoxCompleted,
                  isActive && styles.gridBoxActive,
                  !isCompleted && !isActive && styles.gridBoxFuture,
                ]}
                onPress={() => isActive && setShowGridModal(true)}
              >
                {isCompleted && (
                  <View style={styles.checkmarkBadge}>
                    <MaterialIcons name="check" size={10} color="#FFF" />
                  </View>
                )}
                <Text
                  style={[
                    styles.boxAmountText,
                    { color: getAmountColor(box.amount, isCompleted, isActive) },
                    isActive && styles.boxAmountActive,
                  ]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {formatBoxAmount(box.amount)}
                </Text>
                {isActive && <Text style={styles.todayLabel}>Today</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  // Re-use existing helpers...
  const formatBoxAmount = (amount: number) => `$${Math.round(amount)}`;
  const getAmountColor = (amount: number, isCompleted: boolean, isActive: boolean) => {
    if (isCompleted || isActive) return '#FFFFFF';
    // For pending/future tiles: use theme-aware text color so it reads well in both modes
    return COLORS.text;
  };
  const formatExactAmount = (amount: number) => amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;

  return (
    <LinearGradient colors={[COLORS.background, COLORS.backgroundEnd]} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* OPTIMIZED HEADER: Row Layout */}
          <View style={styles.headerRow}>
            <Text style={styles.greetingSmall}>GoalPulse</Text>
            <Text style={styles.dateSmall}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          </View>

          {/* SAVINGS CHALLENGE CARD */}
          {goal && gridBoxes.length > 0 && (
            <View style={styles.gridSection}>
              {/* CONFIGURATION SELECTORS */}
              <View style={styles.configContainer}>
                {/* Amount Selector */}
                <View style={styles.selectorRow}>
                  {[5000, 10000].map(amt => (
                    <Pressable
                      key={amt}
                      style={[styles.configChip, targetAmount === amt && styles.configChipActive]}
                      onPress={() => setTargetAmount(amt)}
                    >
                      <Text style={[styles.configChipText, targetAmount === amt && styles.configChipTextActive]}>
                        ${amt / 1000}k
                      </Text>
                    </Pressable>
                  ))}
                  <View style={styles.verticalDivider} />
                  {/* Days Selector */}
                  {[365, 300, 250].map(d => (
                    <Pressable
                      key={d}
                      style={[styles.configChip, daysConfig === d && styles.configChipActive]}
                      onPress={() => setDaysConfig(d)}
                    >
                      <Text style={[styles.configChipText, daysConfig === d && styles.configChipTextActive]}>
                        {d === 365 ? 'Easy' : d === 300 ? 'Med' : 'Hard'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Text style={styles.gridTitle}>{targetAmount / 1000}k Savings Challenge</Text>
              <Text style={styles.gridTotalText}>
                <Text style={styles.gridTotalSaved}>${Math.round(totalSavedFromGrid).toLocaleString()}</Text>
                <Text style={styles.gridTotalGoal}> / ${targetAmount.toLocaleString()}</Text>
              </Text>

              <View style={styles.gridProgressBar}>
                <View style={[styles.gridProgressFill, { width: `${Math.min((totalSavedFromGrid / targetAmount) * 100, 100)}%` }]} />
              </View>

              {/* HORIZONTAL SWIPE GRID */}
              <FlatList
                data={Array.from({ length: totalPages }, (_, i) => i)}
                horizontal
                snapToInterval={SCREEN_WIDTH - 32}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum
                showsHorizontalScrollIndicator={false}
                renderItem={renderGridPage}
                keyExtractor={item => item.toString()}
                onMomentumScrollEnd={(ev) => {
                  const idx = Math.round(ev.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
                  setCurrentPage(idx);
                }}
                style={{ marginBottom: 8 }}
              />

              {/* Dots Indicator (No Arrows) */}
              <View style={styles.paginationDots}>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.paginationDot,
                      idx === currentPage && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.buttonRow}>
                <Pressable style={styles.saveButton} onPress={handleCompleteBox}>
                  <Text style={styles.saveButtonText}>I Saved This</Text>
                </Pressable>

                <Pressable style={styles.skipButton} onPress={handleSkipBox}>
                  <Text style={styles.skipButtonText}>Skip Today</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Goal Progress Card... (Rest of UI) */}
          <Pressable style={styles.goalCard} onPress={() => navigation.navigate('GoalDetail')}>
            <View style={styles.goalHeader}>
              <View>
                <Text style={styles.goalLabel}>Current Goal</Text>
                <Text style={styles.goalName}>{goal?.name || 'No Goal Set'}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={COLORS.white} />
            </View>
            {/* ... progress logic same ... */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress.toFixed(1)}%</Text>
            </View>
            <View style={styles.goalStats}>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Saved</Text>
                <Text style={styles.goalStatValue}>{formatMoney(stats.totalSaved, currency)}</Text>
              </View>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Target</Text>
                <Text style={styles.goalStatValue}>{formatMoney(goal?.targetAmount || 0, currency)}</Text>
              </View>
              <View style={styles.goalStat}>
                <Text style={styles.goalStatLabel}>Remaining</Text>
                <Text style={styles.goalStatValue}>{formatMoney(remaining, currency)}</Text>
              </View>
            </View>
            {/* ... Time to goal ... */}
          </Pressable>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <Pressable style={[styles.actionButton, { backgroundColor: COLORS.error }]} onPress={() => navigation.navigate('AddExpense')}>
              <MaterialIcons name="remove-circle" size={28} color={COLORS.white} />
              <Text style={styles.actionText}>Add Expense</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('AddIncome')}>
              <MaterialIcons name="add-circle" size={28} color={COLORS.white} />
              <Text style={styles.actionText}>Add Income</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, { backgroundColor: COLORS.secondary }]} onPress={() => navigation.navigate('Scanner')}>
              <MaterialIcons name="document-scanner" size={28} color={COLORS.white} />
              <Text style={styles.actionText}>Scan Receipt</Text>
            </Pressable>
          </View>

          {/* Spending Summary */}
          <Text style={styles.sectionTitle}>Spending Summary</Text>
          <View style={styles.spendingCards}>
            <View style={styles.spendingCard}>
              <Text style={styles.spendingLabel}>Today</Text>
              <Text style={styles.spendingAmount}>{formatMoney(stats.todaySpending, currency)}</Text>
            </View>
            <View style={styles.spendingCard}>
              <Text style={styles.spendingLabel}>This Week</Text>
              <Text style={styles.spendingAmount}>{formatMoney(stats.weekSpending, currency)}</Text>
            </View>
            <View style={styles.spendingCard}>
              <Text style={styles.spendingLabel}>This Month</Text>
              <Text style={styles.spendingAmount}>{formatMoney(stats.monthSpending, currency)}</Text>
            </View>
          </View>

          {/* Expense Breakdown Pie Chart - ALL categories with distinct colors */}
          {stats.topCategories.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Expense Breakdown</Text>
              <View style={styles.chartContainer}>
                <PieChart
                  data={stats.topCategories.map((cat) => ({
                    value: cat.total,
                    color: cat.color,
                    text: cat.percentage >= 5 ? cat.percentage.toFixed(0) + '%' : '',
                    label: cat.category,
                  }))}
                  donut
                  radius={100}
                  innerRadius={60}
                  centerLabelComponent={() => (
                    <View style={styles.chartCenter}>
                      <Text style={styles.chartCenterLabel}>Expenses</Text>
                      <Text style={styles.chartCenterValue}>
                        {formatMoney(stats.totalExpenses, currency)}
                      </Text>
                    </View>
                  )}
                  showText
                  textColor={COLORS.white}
                  textSize={11}
                  fontWeight="bold"
                />
                {/* Legend - show top 5 categories */}
                <View style={styles.chartLegend}>
                  {stats.topCategories.slice(0, 5).map((cat, index) => {
                    const category = CATEGORIES.find((c) => c.id === cat.category);
                    return (
                      <View key={index} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                        <MaterialIcons
                          name={cat.icon as any}
                          size={16}
                          color={cat.color}
                          style={styles.legendIcon}
                        />
                        <Text style={styles.legendText} numberOfLines={1}>
                          {category?.name?.split('/')[0] || cat.category}
                        </Text>
                        <Text style={styles.legendValue}>
                          {formatMoney(cat.total, currency)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* Top Categories - show top 3 only */}
          {stats.topCategories.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top Spending Categories</Text>
                <Pressable onPress={() => navigation.navigate('Categories')}>
                  <Text style={styles.seeAll}>See All</Text>
                </Pressable>
              </View>
              <View style={styles.categoriesContainer}>
                {stats.topCategories.slice(0, 3).map((cat, index) => {
                  const category = CATEGORIES.find(c => c.id === cat.category);
                  return (
                    <View key={index} style={styles.categoryItem}>
                      <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                        <MaterialIcons name={cat.icon as any} size={24} color={cat.color} />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{category?.name || cat.category}</Text>
                        <View style={styles.categoryProgress}>
                          <View style={[styles.categoryBar, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                        </View>
                      </View>
                      <View style={styles.categoryAmount}>
                        <Text style={styles.categoryValue}>{formatMoney(cat.total, currency)}</Text>
                        <Text style={styles.categoryPercent}>{cat.percentage.toFixed(1)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Income vs Expenses Overview */}
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.overviewContainer}>
            <View style={styles.overviewItem}>
              <MaterialIcons name="arrow-upward" size={24} color={COLORS.primary} />
              <Text style={styles.overviewLabel}>Total Income</Text>
              <Text style={[styles.overviewValue, { color: COLORS.primary }]}>{formatMoney(stats.totalIncome, currency)}</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <MaterialIcons name="arrow-downward" size={24} color={COLORS.error} />
              <Text style={styles.overviewLabel}>Total Expenses</Text>
              <Text style={[styles.overviewValue, { color: COLORS.error }]}>{formatMoney(stats.totalExpenses, currency)}</Text>
            </View>
          </View>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>

        {/* Grid Action Modal - Shows EXACT amount with cents */}
        <Modal
          visible={showGridModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowGridModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowGridModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Today's Target</Text>

              {activeBox && (
                <View style={styles.modalAmount}>
                  <Text style={styles.modalAmountValue}>{formatExactAmount(activeBox.amount)}</Text>
                  <Text style={styles.modalAmountLabel}>Box #{activeBoxIndex + 1} of {TOTAL_BOXES}</Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={() => { handleCompleteBox(); setShowGridModal(false); }}
                >
                  <MaterialIcons name="check-circle" size={24} color="#FFF" />
                  <Text style={styles.modalButtonText}>I Saved This</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalButton, styles.modalButtonSkip]}
                  onPress={() => { handleSkipBox(); setShowGridModal(false); }}
                >
                  <MaterialIcons name="skip-next" size={22} color="#888" />
                  <Text style={[styles.modalButtonText, { color: COLORS.textSecondary }]}>Skip Today</Text>
                </Pressable>

                <Text style={styles.skipInfo}>
                  Skip will spread {activeBox ? formatMoney(activeBox.amount, currency) : '$0'} across {gridBoxes.filter(b => b.status === 'future').length} remaining boxes
                </Text>
              </View>

              <Pressable style={styles.modalClose} onPress={() => setShowGridModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const createStyles = (COLORS: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // NEW HEADER STYLES
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greetingSmall: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dateSmall: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Existing Goal Card
  goalCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryLight,
  },
  goalName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  goalStat: {
    alignItems: 'center',
  },
  goalStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primaryLight,
  },
  goalStatValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 2,
  },
  timeToGoal: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primaryLight,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    minHeight: 80,
  },
  actionText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  spendingCards: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  spendingCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  spendingLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  spendingAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  categoriesContainer: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  categoryName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  categoryProgress: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: SPACING.xs,
  },
  categoryBar: {
    height: '100%',
    borderRadius: 2,
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  categoryValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryPercent: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  overviewContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  overviewLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  overviewValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  // Pie Chart Styles
  chartContainer: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  chartCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  chartCenterValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#E74C3C',
    marginTop: SPACING.xs / 2,
  },
  chartLegend: {
    width: '100%',
    marginTop: SPACING.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.xs,
  },
  legendIcon: {
    marginRight: SPACING.xs,
  },
  legendText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  legendValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },

  // ======== 10K GRID STYLES - FLAT SQUARICLE DESIGN ========
  gridSection: {
    backgroundColor: COLORS.surface,
    margin: 10,
    marginTop: 0,
    padding: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  // CONFIG SELECTORS
  configContainer: {
    marginBottom: 4,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background, // Darker background for pill
    padding: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  configChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  configChipActive: {
    backgroundColor: COLORS.primary,
  },
  configChipText: {
    fontSize: FONT_SIZES.sm, // Slightly smaller
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  configChipTextActive: {
    color: COLORS.white,
  },

  gridTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  gridTotalText: {
    textAlign: 'center',
    marginBottom: 4,
  },
  gridTotalSaved: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.primary,
  },
  gridTotalGoal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  gridProgressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  gridProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // gap: 4, // React Native gap support might differ, margin works safely
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  // SQUARICLE - Rounded Square with 6px radius
  gridBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    marginRight: BOX_MARGIN,
    marginBottom: BOX_MARGIN,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // position: 'relative',
    overflow: 'hidden',
  },
  // SAVED - Vibrant Mint Green
  gridBoxCompleted: {
    backgroundColor: COLORS.primary,
  },
  // TODAY - Hot Coral/Red
  gridBoxActive: {
    backgroundColor: COLORS.error,
  },
  // FUTURE - Dark Tile
  gridBoxFuture: {
    backgroundColor: COLORS.border, // #1E293B
    borderWidth: 1,
    borderColor: COLORS.background, // Subtle contrast
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Text styling - BOLD and readable
  boxAmountText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  boxAmountActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  todayLabel: {
    fontSize: 6,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    position: 'absolute',
    bottom: 2,
  },
  pageIndicator: {
    fontSize: FONT_SIZES.sm,
    color: '#888',
    textAlign: 'center',
    marginTop: SPACING.xs,
    display: 'none', // Hidden as requested "Remove Page Numbers"
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
  },
  paginationDotActive: {
    backgroundColor: COLORS.primary,
    width: 20, // Elongated active dot
  },
  // SIDE BY SIDE COMPACT BUTTONS
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 6,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minWidth: 130,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  skipButton: {
    backgroundColor: COLORS.background,
    borderRadius: 25,
    paddingVertical: 6,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // ======== GRID MODAL STYLES ========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  modalAmount: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalAmountValue: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.error,
  },
  modalAmountLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  modalButtons: {
    gap: SPACING.sm,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.xs,
  },
  modalButtonSave: {
    backgroundColor: COLORS.success,
  },
  modalButtonSkip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFF',
  },
  skipInfo: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
  modalClose: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  modalCloseText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
});
