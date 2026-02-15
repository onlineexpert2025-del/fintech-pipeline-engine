/**
 * Savings Challenge Generator
 * Duration-based system: 365/265/200 days for $5k or $10k goals
 */

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface ChallengeConfig {
  total: number; // 5000 or 10000
  difficulty: ChallengeDifficulty;
  days: number; // 365, 265, or 200
  startDate: string; // YYYY-MM-DD local date
  averagePerDay: number;
}

export interface ChallengeDay {
  dayNumber: number; // 1 to total days
  amount: number;
  date: string; // YYYY-MM-DD
  status: 'saved' | 'skipped' | 'pending';
}

const DIFFICULTY_DAYS_MAP: Record<ChallengeDifficulty, number> = {
  easy: 365,
  medium: 265,
  hard: 200,
};

/**
 * Generate challenge amounts for all days
 * First 30 days: $5-$25 (habit builder)
 * Remaining days: Distribute remainder evenly
 */
export const generateChallengeAmounts = (config: ChallengeConfig): number[] => {
  const { total, days } = config;
  const amounts: number[] = [];

  // ============================================
  // PHASE 1: First 30 days = $5-$25 (Habit Builder)
  // ============================================
  const habitDays = Math.min(30, days);
  const habitAmounts = [
    // Week 1: Very easy ($5-$10)
    5, 7, 6, 8, 5, 9, 7,
    // Week 2: Slightly higher ($8-$15)
    10, 12, 9, 11, 13, 10, 14,
    // Week 3: Build up ($12-$18)
    15, 13, 16, 14, 17, 15, 18,
    // Week 4+: Moderate ($15-$25)
    20, 18, 22, 19, 23, 21, 25, 24, 20,
  ];

  // Use fixed habit amounts for first 30 days (or all days if < 30)
  for (let i = 0; i < habitDays; i++) {
    amounts.push(habitAmounts[i % habitAmounts.length]);
  }

  const habitTotal = amounts.reduce((sum, amt) => sum + amt, 0);

  // ============================================
  // PHASE 2: Remaining days = Distribute remainder
  // ============================================
  const remainingDays = days - habitDays;
  const remainingTotal = total - habitTotal;

  if (remainingDays > 0 && remainingTotal > 0) {
    // Calculate base amount per day
    const baseAmount = Math.floor(remainingTotal / remainingDays);
    const leftover = remainingTotal - (baseAmount * remainingDays);

    // Distribute base amount
    for (let i = 0; i < remainingDays; i++) {
      amounts.push(baseAmount);
    }

    // Add leftover pennies to random days to reach exact total
    for (let i = 0; i < leftover; i++) {
      const randomIndex = habitDays + Math.floor(Math.random() * remainingDays);
      amounts[randomIndex] += 1;
    }
  }

  // Verify total (should equal config.total)
  const actualTotal = amounts.reduce((sum, amt) => sum + amt, 0);
  console.log('[Challenge] Generated amounts:', {
    days,
    habitTotal,
    remainingTotal,
    actualTotal,
    expectedTotal: total,
    match: actualTotal === total,
  });

  return amounts;
};

/**
 * Initialize full challenge data
 */
export const initializeChallenge = (config: ChallengeConfig): ChallengeDay[] => {
  const amounts = generateChallengeAmounts(config);
  const startDate = new Date(config.startDate);
  const days: ChallengeDay[] = [];

  for (let i = 0; i < config.days; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);

    days.push({
      dayNumber: i + 1,
      amount: amounts[i],
      date: dayDate.toLocaleDateString('en-CA'), // YYYY-MM-DD local
      status: 'pending',
    });
  }

  return days;
};

/**
 * Redistribute skipped amount across future days
 * This is called when user taps "Skip Today"
 */
export const redistributeSkippedAmount = (
  days: ChallengeDay[],
  currentDayIndex: number
): ChallengeDay[] => {
  const skippedAmount = days[currentDayIndex].amount;
  const futureDays = days.filter((d, idx) => idx > currentDayIndex && d.status === 'pending');

  if (futureDays.length === 0) {
    // No future days - can't redistribute
    console.log('[Challenge] No future days to redistribute to');
    return days;
  }

  const amountPerDay = skippedAmount / futureDays.length;

  const updatedDays = [...days];
  
  // Mark current day as skipped with $0
  updatedDays[currentDayIndex] = {
    ...updatedDays[currentDayIndex],
    status: 'skipped',
    amount: 0,
  };

  // Add distributed amount to each future day
  updatedDays.forEach((day, idx) => {
    if (idx > currentDayIndex && day.status === 'pending') {
      updatedDays[idx] = {
        ...day,
        amount: Math.round((day.amount + amountPerDay) * 100) / 100, // Round to cents
      };
    }
  });

  console.log('[Challenge] Redistributed $' + skippedAmount + ' across ' + futureDays.length + ' days');

  return updatedDays;
};

/**
 * Get today's challenge day (or null if no active challenge)
 */
export const getTodaysChallengeDay = (days: ChallengeDay[]): ChallengeDay | null => {
  const today = new Date().toLocaleDateString('en-CA');
  return days.find(d => d.date === today) || null;
};

/**
 * Calculate challenge progress
 */
export const getChallengeProgress = (days: ChallengeDay[]): {
  saved: number;
  skipped: number;
  pending: number;
  totalSaved: number;
  totalGoal: number;
  percentComplete: number;
} => {
  const saved = days.filter(d => d.status === 'saved').length;
  const skipped = days.filter(d => d.status === 'skipped').length;
  const pending = days.filter(d => d.status === 'pending').length;
  
  const totalSaved = days
    .filter(d => d.status === 'saved')
    .reduce((sum, d) => sum + d.amount, 0);
  
  const totalGoal = days.reduce((sum, d) => sum + d.amount, 0);
  
  const percentComplete = (totalSaved / totalGoal) * 100;

  return {
    saved,
    skipped,
    pending,
    totalSaved,
    totalGoal,
    percentComplete,
  };
};
