export interface DividendMetrics {
  annualDividends: { year: number; totalDPS: number }[];
  currentAnnualDPS: number | null;
  fiveYearCAGR: number | null;
  growthStreak: number;        // consecutive years of growth
  payoutConsistency: number;   // years with dividends / total years
}

export function computeDividendMetrics(
  dividendHistory: { date: number; amount: number }[],
): DividendMetrics | null {
  if (!dividendHistory || dividendHistory.length === 0) return null;

  // Group dividends by calendar year
  const byYear = new Map<number, number>();
  for (const d of dividendHistory) {
    const year = new Date(d.date * 1000).getFullYear();
    byYear.set(year, (byYear.get(year) ?? 0) + d.amount);
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length === 0) return null;

  const annualDividends = years.map(y => ({
    year: y,
    totalDPS: +byYear.get(y)!.toFixed(4),
  }));

  // Current annual DPS = most recent full year (or partial if only current year exists)
  const currentAnnualDPS = annualDividends[annualDividends.length - 1].totalDPS;

  // 5-year CAGR
  let fiveYearCAGR: number | null = null;
  if (annualDividends.length >= 2) {
    const earliest = annualDividends[0];
    const latest = annualDividends[annualDividends.length - 1];
    const numYears = latest.year - earliest.year;
    if (numYears > 0 && earliest.totalDPS > 0 && latest.totalDPS > 0) {
      fiveYearCAGR = +((Math.pow(latest.totalDPS / earliest.totalDPS, 1 / numYears) - 1) * 100).toFixed(2);
    }
  }

  // Growth streak: consecutive years of dividend growth (from most recent going back)
  let growthStreak = 0;
  for (let i = annualDividends.length - 1; i >= 1; i--) {
    if (annualDividends[i].totalDPS > annualDividends[i - 1].totalDPS) {
      growthStreak++;
    } else {
      break;
    }
  }

  // Payout consistency: proportion of years in range that had dividends
  const firstYear = years[0];
  const lastYear = years[years.length - 1];
  const totalYearsSpan = lastYear - firstYear + 1;
  const payoutConsistency = totalYearsSpan > 0 ? +(years.length / totalYearsSpan).toFixed(2) : 1;

  return {
    annualDividends,
    currentAnnualDPS: +currentAnnualDPS.toFixed(4),
    fiveYearCAGR,
    growthStreak,
    payoutConsistency,
  };
}
