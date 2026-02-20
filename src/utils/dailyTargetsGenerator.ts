/**
 * Variable Daily Targets Generator
 * Creates gamified savings targets by randomly distributing monthly target across days
 */

import { DailyTarget } from '../types';
import { saveDailyTarget, getMonthlyTargets, getDailyTarget } from '../services/database';

/**
 * Generate variable daily targets for a month
 * Algorithm: Randomly distribute monthly target across days with variation
 * Constraint: Sum of all daily targets MUST equal monthly target
 */
export const generateMonthlyTargets = async (
  monthlyTarget: number,
  year: number,
  month: number
): Promise<DailyTarget[]> => {
  // Check if targets already exist for this month
  const existing = await getMonthlyTargets(year, month);
  if (existing.length > 0) {
    console.log('[DailyTargets] Targets already exist for', year, month);
    return existing;
  }

  // Get number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calculate average per day
  const avgPerDay = monthlyTarget / daysInMonth;

  // Generate random distribution with 3 difficulty levels
  const dailyAmounts: number[] = [];
  let remaining = monthlyTarget;

  // Define difficulty multipliers
  const EASY_MIN = 0.1; // 10% of average
  const EASY_MAX = 0.5; // 50% of average
  const MEDIUM_MIN = 0.6;
  const MEDIUM_MAX = 1.2;
  const HARD_MIN = 1.3;
  const HARD_MAX = 2.5; // 250% of average

  // Generate targets for all days except last
  for (let day = 1; day < daysInMonth; day++) {
    const random = Math.random();
    let multiplier: number;

    // 30% easy, 50% medium, 20% hard
    if (random < 0.3) {
      // Easy day
      multiplier = EASY_MIN + Math.random() * (EASY_MAX - EASY_MIN);
    } else if (random < 0.8) {
      // Medium day
      multiplier = MEDIUM_MIN + Math.random() * (MEDIUM_MAX - MEDIUM_MIN);
    } else {
      // Hard day
      multiplier = HARD_MIN + Math.random() * (HARD_MAX - HARD_MIN);
    }

    let amount = Math.round(avgPerDay * multiplier * 100) / 100; // Round to 2 decimals

    // Ensure we don't exceed remaining
    if (amount > remaining - (daysInMonth - day)) {
      amount = Math.max(remaining / 2, remaining / (daysInMonth - day + 1));
    }

    dailyAmounts.push(amount);
    remaining -= amount;
  }

  // Last day gets the remaining amount (ensures perfect sum)
  dailyAmounts.push(Math.round(remaining * 100) / 100);

  // Verify sum equals monthly target (allow 0.01 tolerance for rounding)
  const sum = dailyAmounts.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - monthlyTarget) > 0.01) {
    console.error('[DailyTargets] Sum mismatch:', sum, 'vs', monthlyTarget);
    // Adjust last day to fix rounding errors
    dailyAmounts[daysInMonth - 1] += (monthlyTarget - sum);
  }

  // Save targets to database
  const targets: DailyTarget[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const targetAmount = dailyAmounts[day - 1];

    await saveDailyTarget({
      date,
      targetAmount,
      achieved: false
    });

    targets.push({
      id: day,
      date,
      targetAmount,
      achieved: false,
      createdAt: new Date().toISOString()
    });
  }

  console.log('[DailyTargets] Generated', daysInMonth, 'targets for', year, month);
  console.log('[DailyTargets] Total:', targets.reduce((a, b) => a + b.targetAmount, 0));

  return targets;
};

/**
 * Get or generate today's target
 */
export const getTodayTarget = async (monthlyTarget: number): Promise<DailyTarget | null> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dateStr = today.toISOString().split('T')[0];

  // Ensure monthly targets are generated
  await generateMonthlyTargets(monthlyTarget, year, month);

  // Get today's target from database
  return await getDailyTarget(dateStr);
};

/**
 * Check if today's target is achieved based on savings
 */
export const checkTodayTargetAchieved = async (todaySavings: number, todayTarget: number): Promise<boolean> => {
  return todaySavings >= todayTarget;
};

/**
 * Get difficulty label for a target amount
 */
export const getDifficultyLabel = (amount: number, avgAmount: number): string => {
  const ratio = amount / avgAmount;

  if (ratio < 0.6) return 'Easy';
  if (ratio < 1.3) return 'Medium';
  return 'Hard';
};

/**
 * Get difficulty color for UI
 */
export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'Easy': return '#10B981'; // Green
    case 'Medium': return '#F59E0B'; // Orange
    case 'Hard': return '#EF4444'; // Red
    default: return '#6366F1'; // Purple
  }
};
