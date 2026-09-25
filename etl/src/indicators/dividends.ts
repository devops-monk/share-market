export interface DividendPayment {
  date: string;   // ex-dividend date, YYYY-MM-DD
  amount: number; // dividend per share
}

export interface DividendMetrics {
  annualDividends: { year: number; totalDPS: number; payments?: number }[];
  currentAnnualDPS: number | null;
  fiveYearCAGR: number | null;
  growthStreak: number;        // consecutive years of growth
  payoutConsistency: number;   // years with dividends / total years
  // Payment schedule — what tells you when you must own the stock to get paid
  ttmDPS: number | null;       // trailing 12 months, unlike the part-year calendar total
  paymentsPerYear: number;     // 12 monthly, 4 quarterly, 2 semi-annual, 1 annual, 0 unknown
  frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'irregular' | 'unknown';
  recentPayments: DividendPayment[];   // most recent first, up to 8
  lastExDate: string | null;
  nextExDateEstimate: string | null;   // last ex-date + one interval; refined by Yahoo where known
}

const FREQUENCY_BY_COUNT: Record<number, DividendMetrics['frequency']> = {
  12: 'monthly', 4: 'quarterly', 2: 'semi-annual', 1: 'annual',
};

function toIsoDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

/** Payments per year, judged on the last two complete years of history. */
function inferSchedule(history: { date: number; amount: number }[]): {
  paymentsPerYear: number;
  frequency: DividendMetrics['frequency'];
} {
  const cutoff = Date.now() / 1000 - 2 * 365 * 24 * 60 * 60;
  const recent = history.filter(d => d.date >= cutoff);
  if (recent.length === 0) return { paymentsPerYear: 0, frequency: 'unknown' };

  const perYear = Math.round(recent.length / 2);
  const snapped = [12, 4, 2, 1].find(n => Math.abs(perYear - n) <= (n === 12 ? 2 : 0));
  if (!snapped) return { paymentsPerYear: perYear, frequency: 'irregular' };
  return { paymentsPerYear: snapped, frequency: FREQUENCY_BY_COUNT[snapped] };
}

export function computeDividendMetrics(
  dividendHistory: { date: number; amount: number }[],
): DividendMetrics | null {
  if (!dividendHistory || dividendHistory.length === 0) return null;

  // Group dividends by calendar year, keeping the payment count so we can tell
  // a genuinely small year from one the history window simply cut in half.
  const byYear = new Map<number, number>();
  const countByYear = new Map<number, number>();
  for (const d of dividendHistory) {
    const year = new Date(d.date * 1000).getFullYear();
    byYear.set(year, (byYear.get(year) ?? 0) + d.amount);
    countByYear.set(year, (countByYear.get(year) ?? 0) + 1);
  }

  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length === 0) return null;

  const annualDividends = years.map(y => ({
    year: y,
    totalDPS: +byYear.get(y)!.toFixed(4),
    payments: countByYear.get(y) ?? 0,
  }));

  // Current annual DPS = most recent full year (or partial if only current year exists)
  const currentAnnualDPS = annualDividends[annualDividends.length - 1].totalDPS;

  // Growth is judged on complete years only. The current year is usually part
  // paid, so including it makes almost every payer look like it cut.
  const currentYear = new Date().getFullYear();
  const completeYears = annualDividends.filter(a => a.year < currentYear);

  // The first year in the window is often clipped by the 5-year history itself,
  // which would otherwise show as explosive dividend growth. Keep only years
  // that received the usual number of payments.
  const expectedPayments = Math.max(...completeYears.map(a => a.payments ?? 0), 0);
  const fullYears = expectedPayments > 0
    ? completeYears.filter(a => (a.payments ?? 0) >= expectedPayments)
    : completeYears;

  // 5-year CAGR
  let fiveYearCAGR: number | null = null;
  if (fullYears.length >= 2) {
    const earliest = fullYears[0];
    const latest = fullYears[fullYears.length - 1];
    const numYears = latest.year - earliest.year;
    if (numYears > 0 && earliest.totalDPS > 0 && latest.totalDPS > 0) {
      fiveYearCAGR = +((Math.pow(latest.totalDPS / earliest.totalDPS, 1 / numYears) - 1) * 100).toFixed(2);
    }
  }

  // Growth streak: consecutive complete years of growth, most recent backwards
  let growthStreak = 0;
  for (let i = completeYears.length - 1; i >= 1; i--) {
    if (completeYears[i].totalDPS > completeYears[i - 1].totalDPS) {
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

  // Trailing twelve months — the honest "what it pays now" figure, since the
  // current calendar year is usually only part paid.
  const nowSec = Date.now() / 1000;
  const ttmPayments = dividendHistory.filter(d => d.date >= nowSec - 365 * 24 * 60 * 60);
  const ttmDPS = ttmPayments.length > 0
    ? +ttmPayments.reduce((a, d) => a + d.amount, 0).toFixed(4)
    : null;

  const sortedDesc = [...dividendHistory].sort((a, b) => b.date - a.date);
  const recentPayments: DividendPayment[] = sortedDesc.slice(0, 8).map(d => ({
    date: toIsoDate(d.date),
    amount: +d.amount.toFixed(4),
  }));

  const { paymentsPerYear, frequency } = inferSchedule(dividendHistory);
  const lastExDate = sortedDesc[0] ? toIsoDate(sortedDesc[0].date) : null;

  let nextExDateEstimate: string | null = null;
  if (sortedDesc[0] && paymentsPerYear > 0) {
    const intervalDays = Math.round(365 / paymentsPerYear);
    let next = sortedDesc[0].date + intervalDays * 24 * 60 * 60;
    // Roll forward if the estimate has already passed without a payment landing
    while (next < nowSec) next += intervalDays * 24 * 60 * 60;
    nextExDateEstimate = toIsoDate(next);
  }

  return {
    annualDividends,
    currentAnnualDPS: +currentAnnualDPS.toFixed(4),
    fiveYearCAGR,
    growthStreak,
    payoutConsistency,
    ttmDPS,
    paymentsPerYear,
    frequency,
    recentPayments,
    lastExDate,
    nextExDateEstimate,
  };
}
