import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONT_SIZES, formatMoney, CATEGORIES } from '../utils/theme';
import { getDifficultyLabel, getDifficultyColor } from '../utils/dailyTargetsGenerator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grid Configuration - 200 boxes, 50 per page
const TOTAL_BOXES = 200;
const BOXES_PER_PAGE = 50;
const GRID_COLS = 10;
const GRID_ROWS = 5;
const BOX_MARGIN = 4;
// FIXED: Ensure minimum box size for readability
const CALCULATED_BOX_SIZE = (SCREEN_WIDTH - 32 - (GRID_COLS - 1) * BOX_MARGIN) / GRID_COLS;
const BOX_SIZE = Math.max(CALCULATED_BOX_SIZE, 28); // Minimum 28px

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
  const { goal, stats, currency, todayTarget, refreshData } = useApp();

  // Grid state
  const [gridBoxes, setGridBoxes] = useState<GridBox[]>([]);
  const [showGridModal, setShowGridModal] = useState(false);
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(TOTAL_BOXES / BOXES_PER_PAGE);
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

  // Initialize 10k Grid
  useEffect(() => {
    loadGridState();
  }, [goal]);

  const loadGridState = async () => {
    if (!goal) return;
    
    try {
      const saved = await AsyncStorage.getItem('savings_grid_state_v2');
      if (saved) {
        const parsed = JSON.parse(saved) as GridBox[];
        // Ensure we have 200 boxes
        if (parsed.length === TOTAL_BOXES) {
          setGridBoxes(parsed);
          const activeIdx = parsed.findIndex(b => b.status === 'active');
          setActiveBoxIndex(activeIdx >= 0 ? activeIdx : 0);
          // Jump to page with active box
          if (activeIdx >= 0) {
            setCurrentPage(Math.floor(activeIdx / BOXES_PER_PAGE));
          }
        } else {
          initializeGrid();
        }
      } else {
        initializeGrid();
      }
    } catch (error) {
      initializeGrid();
    }
  };

  const initializeGrid = () => {
    if (!goal) return;
    
    // ============================================
    // "DOUBLE 1-to-100" ALGORITHM
    // ============================================
    // Creates exactly 200 numbers: [1,2,3...100] + [1,2,3...100]
    // Total = $5,050 + $5,050 = $10,100 (covers $10k goal with small bonus)
    //
    // BENEFITS:
    // - MAX = $100 (never higher, no "heartbreak" moments)
    // - MIN = $1 (lots of easy wins to build momentum)
    // - NO DECIMALS (all integers)
    // - BALANCED: For every hard day ($90), there's an easy day ($10)
    // ============================================
    
    const amounts: number[] = [];
    
    // Set A: Numbers 1 to 100
    for (let i = 1; i <= 100; i++) {
      amounts.push(i);
    }
    
    // Set B: Numbers 1 to 100 (again)
    for (let i = 1; i <= 100; i++) {
      amounts.push(i);
    }
    
    // Shuffle using Fisher-Yates algorithm
    for (let i = amounts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
    }
    
    // Create boxes
    const boxes: GridBox[] = [];
    for (let i = 0; i < TOTAL_BOXES; i++) {
      boxes.push({
        id: i,
        amount: amounts[i],
        status: i === 0 ? 'active' : 'future',
      });
    }
    
    setGridBoxes(boxes);
    setActiveBoxIndex(0);
    setCurrentPage(0);
    saveGridState(boxes);
    
    // Log for verification
    const total = amounts.reduce((a, b) => a + b, 0);
    console.log('[Grid] Initialized with Double 1-100 algorithm');
    console.log('[Grid] Total:', total, '(should be ~$10,100)');
    console.log('[Grid] Min:', Math.min(...amounts), 'Max:', Math.max(...amounts));
  };

  const saveGridState = async (boxes: GridBox[]) => {
    try {
      await AsyncStorage.setItem('savings_grid_state_v2', JSON.stringify(boxes));
    } catch (error) {
      console.error('Failed to save grid state');
    }
  };

  // Handle "I Saved This" - complete today's box
  const handleCompleteBox = async () => {
    if (activeBoxIndex >= gridBoxes.length) return;
    
    const updatedBoxes = [...gridBoxes];
    updatedBoxes[activeBoxIndex] = {
      ...updatedBoxes[activeBoxIndex],
      status: 'completed',
      date: new Date().toISOString(),
    };
    
    // Move to next box
    if (activeBoxIndex + 1 < gridBoxes.length) {
      updatedBoxes[activeBoxIndex + 1] = {
        ...updatedBoxes[activeBoxIndex + 1],
        status: 'active',
      };
      setActiveBoxIndex(activeBoxIndex + 1);
      // Jump to page with new active box
      setCurrentPage(Math.floor((activeBoxIndex + 1) / BOXES_PER_PAGE));
    }
    
    setGridBoxes(updatedBoxes);
    saveGridState(updatedBoxes);
  };

  // Handle "Skip Today" - redistribute amount to all future boxes
  const handleSkipBox = async () => {
    if (activeBoxIndex >= gridBoxes.length) return;
    
    const updatedBoxes = [...gridBoxes];
    const skippedAmount = updatedBoxes[activeBoxIndex].amount;
    
    // Count remaining future boxes (excluding the active one being skipped)
    const futureBoxes = updatedBoxes.filter(b => b.status === 'future').length;
    
    if (futureBoxes > 0) {
      const incrementPerBox = skippedAmount / futureBoxes;
      
      // Redistribute to all future boxes
      updatedBoxes.forEach((box, idx) => {
        if (box.status === 'future') {
          updatedBoxes[idx] = {
            ...box,
            amount: Math.round((box.amount + incrementPerBox) * 100) / 100,
          };
        }
      });
    }
    
    // Mark current as completed (skipped)
    updatedBoxes[activeBoxIndex] = {
      ...updatedBoxes[activeBoxIndex],
      status: 'completed',
      amount: 0, // Skipped
      date: new Date().toISOString(),
    };
    
    // Move to next box
    if (activeBoxIndex + 1 < gridBoxes.length) {
      updatedBoxes[activeBoxIndex + 1] = {
        ...updatedBoxes[activeBoxIndex + 1],
        status: 'active',
      };
      setActiveBoxIndex(activeBoxIndex + 1);
      // Jump to page with new active box
      setCurrentPage(Math.floor((activeBoxIndex + 1) / BOXES_PER_PAGE));
    }
    
    setGridBoxes(updatedBoxes);
    saveGridState(updatedBoxes);
  };

  const completedCount = gridBoxes.filter(b => b.status === 'completed').length;
  const totalSavedFromGrid = gridBoxes
    .filter(b => b.status === 'completed' && b.amount > 0)
    .reduce((sum, b) => sum + b.amount, 0);
  const activeBox = gridBoxes[activeBoxIndex];

  // Get boxes for current page
  const currentPageBoxes = gridBoxes.slice(
    currentPage * BOXES_PER_PAGE,
    (currentPage + 1) * BOXES_PER_PAGE
  );

  // Legacy values for compatibility
  const todaySavings = stats.totalSaved - stats.todaySpending;
  const todayProgress = todayTarget ? Math.min((todaySavings / todayTarget.targetAmount) * 100, 100) : 0;

  // Format amount for GRID display - with $ sign
  const formatBoxAmount = (amount: number) => {
    return `$${Math.round(amount)}`;
  };
  
  // Get color based on difficulty
  // $1-$20 (Easy): Green | $21-$60 (Medium): Dark | $61-$100 (Hard): Red
  const getAmountColor = (amount: number, isCompleted: boolean, isActive: boolean) => {
    if (isCompleted || isActive) return '#FFFFFF'; // White on colored backgrounds
    
    const rounded = Math.round(amount);
    if (rounded <= 20) return '#27AE60';      // Easy = Green
    if (rounded <= 60) return '#333333';      // Medium = Dark
    return '#E74C3C';                          // Hard = Red
  };

  // Format amount for MODAL display - show exact cents if needed
  const formatExactAmount = (amount: number) => {
    if (amount === Math.floor(amount)) {
      return `$${Math.round(amount)}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>GoalPulse</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>

        {/* 10K SAVINGS GRID - FLAT SQUARICLE DESIGN */}
        {goal && gridBoxes.length > 0 && (
          <View style={styles.gridSection}>
            {/* Header Stats - LARGE & BLACK */}
            <Text style={styles.gridTitle}>10k Savings Challenge</Text>
            <Text style={styles.gridTotalText}>
              <Text style={styles.gridTotalSaved}>${Math.round(totalSavedFromGrid).toLocaleString()}</Text>
              <Text style={styles.gridTotalGoal}> / $10,100</Text>
            </Text>

            {/* Progress Bar - THICK */}
            <View style={styles.gridProgressBar}>
              <View style={[styles.gridProgressFill, { width: `${Math.min((totalSavedFromGrid / 10100) * 100, 100)}%` }]} />
            </View>

            {/* The Grid - ROUNDED SQUARES (SQUARICLES) */}
            <View style={styles.gridContainer}>
              {currentPageBoxes.map((box) => {
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
                    {/* Checkmark for completed */}
                    {isCompleted && (
                      <View style={styles.checkmarkBadge}>
                        <MaterialIcons name="check" size={10} color="#FFF" />
                      </View>
                    )}
                    
                    {/* Dollar Amount - COLOR CODED */}
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
                    
                    {/* "Today" label */}
                    {isActive && <Text style={styles.todayLabel}>Today</Text>}
                  </Pressable>
                );
              })}
            </View>

            {/* Page Indicator */}
            <Text style={styles.pageIndicator}>Page {currentPage + 1} of {totalPages}</Text>

            {/* Pagination Controls */}
            <View style={styles.paginationContainer}>
              <Pressable 
                style={[styles.paginationArrow, currentPage === 0 && styles.paginationArrowDisabled]}
                onPress={() => currentPage > 0 && setCurrentPage(currentPage - 1)}
              >
                <MaterialIcons name="chevron-left" size={28} color={currentPage === 0 ? '#CCC' : '#666'} />
              </Pressable>
              
              <View style={styles.paginationDots}>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <Pressable
                    key={idx}
                    style={[
                      styles.paginationDot,
                      idx === currentPage && styles.paginationDotActive,
                    ]}
                    onPress={() => setCurrentPage(idx)}
                  />
                ))}
              </View>
              
              <Pressable 
                style={[styles.paginationArrow, currentPage === totalPages - 1 && styles.paginationArrowDisabled]}
                onPress={() => currentPage < totalPages - 1 && setCurrentPage(currentPage + 1)}
              >
                <MaterialIcons name="chevron-right" size={28} color={currentPage === totalPages - 1 ? '#CCC' : '#666'} />
              </Pressable>
            </View>

            {/* Action Buttons - SIDE BY SIDE, COMPACT */}
            <View style={styles.buttonRow}>
              <Pressable 
                style={styles.saveButton}
                onPress={handleCompleteBox}
              >
                <Text style={styles.saveButtonText}>I Saved This</Text>
              </Pressable>
              
              <Pressable 
                style={styles.skipButton}
                onPress={handleSkipBox}
              >
                <Text style={styles.skipButtonText}>Skip Today</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Goal Progress Card */}
        <Pressable style={styles.goalCard} onPress={() => navigation.navigate('GoalDetail')}>
          <View style={styles.goalHeader}>
            <View>
              <Text style={styles.goalLabel}>Current Goal</Text>
              <Text style={styles.goalName}>{goal?.name || 'No Goal Set'}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.white} />
          </View>
          
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

          {/* Priority C: Show Months + Days */}
          {(timeToGoal.months > 0 || timeToGoal.days > 0) && (
            <Text style={styles.timeToGoal}>
              {timeToGoal.months > 0 && `${timeToGoal.months} month${timeToGoal.months !== 1 ? 's' : ''}`}
              {timeToGoal.months > 0 && timeToGoal.days > 0 && ', '}
              {timeToGoal.days > 0 && `${timeToGoal.days} day${timeToGoal.days !== 1 ? 's' : ''}`}
              {' to reach goal'}
            </Text>
          )}
          {timeToGoal.months === 0 && timeToGoal.days === 0 && remaining <= 0 && (
            <Text style={[styles.timeToGoal, { color: COLORS.success }]}>
              🎉 Goal Reached!
            </Text>
          )}
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
                <Text style={[styles.modalButtonText, { color: '#666' }]}>Skip Today</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  date: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
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
    color: COLORS.text,
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
  // Today's Target Card Styles
  todayTargetCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 20,
    padding: SPACING.xl,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  todayTargetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  todayTargetLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 12,
    marginTop: SPACING.xs,
  },
  difficultyText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: SPACING.xs / 2,
  },
  todayTargetAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  todayTargetSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.lg,
  },
  todayProgressContainer: {
    marginBottom: SPACING.md,
  },
  todayProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  todayProgressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
  todayProgressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.9,
  },
  todayStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todayStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayStatText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: SPACING.xs,
  },

  // ======== 10K GRID STYLES - FLAT SQUARICLE DESIGN ========
  gridSection: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    marginTop: 0,
    padding: 12,
    borderRadius: 16,
  },
  gridTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  gridTotalText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  gridTotalSaved: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2ECC71',
  },
  gridTotalGoal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  gridProgressBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gridProgressFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 5,
  },
  gridProgressText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  // SQUARICLE - Rounded Square with 6px radius (NOT circle!)
  gridBox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  // SAVED - Vibrant Mint Green
  gridBoxCompleted: {
    backgroundColor: '#2ECC71',
  },
  // TODAY - Hot Coral/Red
  gridBoxActive: {
    backgroundColor: '#FF5252',
  },
  // FUTURE - Light Grey with border
  gridBoxFuture: {
    backgroundColor: '#F0F2F5',
    borderWidth: 1,
    borderColor: '#D0D0D0',
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
  boxAmountCompleted: {
    color: '#FFFFFF',
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
  },
  pageIndicator: {
    fontSize: FONT_SIZES.sm,
    color: '#888',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xs,
  },
  paginationArrow: {
    padding: SPACING.xs,
  },
  paginationArrowDisabled: {
    opacity: 0.3,
  },
  paginationDots: {
    flexDirection: 'row',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
  },
  paginationDotActive: {
    backgroundColor: '#2ECC71',
  },
  // SIDE BY SIDE COMPACT BUTTONS
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  saveButton: {
    backgroundColor: '#2ECC71', // Mint Green
    borderRadius: 25,
    paddingVertical: SPACING.sm,
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
    backgroundColor: '#F0F2F5',
    borderRadius: 25,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#E4E6EB',
  },
  skipButtonText: {
    color: '#666',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },

  // ======== GRID MODAL STYLES ========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: SPACING.xl,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: '#333',
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
    color: '#FF5252', // Hot Coral - matches Today box
  },
  modalAmountLabel: {
    fontSize: FONT_SIZES.sm,
    color: '#888',
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
    backgroundColor: '#2ECC71', // Mint Green
  },
  modalButtonSkip: {
    backgroundColor: '#F0F2F5',
    borderWidth: 1,
    borderColor: '#E4E6EB',
  },
  modalButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFF',
  },
  skipInfo: {
    fontSize: 11,
    color: '#999',
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
    color: '#AAA',
  },
});
