/**
 * Variable Daily Savings: randomize daily targets that sum to monthly goal.
 * Uses seeded random for consistency within a month.
 */
export function getTodaysChallenge(monthlyGoal: number, year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  const seed = year * 100 + month;
  const rng = seededRandom(seed);

  const dailyTargets: number[] = [];
  let remaining = monthlyGoal;

  for (let d = 0; d < daysInMonth - 1; d++) {
    const max = remaining - (daysInMonth - d - 1);
    const min = Math.max(0, remaining - (daysInMonth - d - 1) * monthlyGoal);
    const range = Math.max(0, max - min);
    const val = min + rng() * range;
    dailyTargets.push(Math.round(val * 100) / 100);
    remaining -= dailyTargets[d];
  }
  dailyTargets.push(Math.round(remaining * 100) / 100);

  const today = new Date().getDate();
  return dailyTargets[today - 1] ?? monthlyGoal / daysInMonth;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
