import type { StockRecord } from '../types';

/**
 * Dividend ranking.
 *
 * Four components, each scored 0-100 and then blended by the chosen preset:
 *   yield       — how much income the stock pays today
 *   safety      — whether the company can keep paying it (payout ratio, cash
 *                 cover, debt, Altman Z)
 *   growth      — whether the payment keeps rising (streak, 5-yr CAGR)
 *   consistency — whether it has been paid reliably, for long enough to trust
 *
 * Everything is derived from data already in latest.json, so the page works
 * before the extended ETL fields land and gets sharper once they do.
 */

export type DividendPreset = 'income' | 'growth' | 'balanced';

export interface PresetDefinition {
  key: DividendPreset;
  label: string;
  blurb: string;
  weights: { yield: number; safety: number; growth: number; consistency: number };
}

export const PRESETS: PresetDefinition[] = [
  {
    key: 'income',
    label: 'Income',
    blurb: 'Biggest yield you can safely collect today — payout cover weighted heavily to screen out traps',
    weights: { yield: 0.45, safety: 0.30, growth: 0.10, consistency: 0.15 },
  },
  {
    key: 'growth',
    label: 'Dividend Growth',
    blurb: 'Compounders — a rising payment with room to keep rising, yield second',
    weights: { yield: 0.20, safety: 0.25, growth: 0.40, consistency: 0.15 },
  },
  {
    key: 'balanced',
    label: 'Balanced',
    blurb: 'A fair yield today from a company that can keep paying and raising it',
    weights: { yield: 0.30, safety: 0.25, growth: 0.25, consistency: 0.20 },
  },
];

export interface DividendView {
  stock: StockRecord;
  /** Yield as a percentage, e.g. 3.4 */
  yieldPct: number;
  /** Dividend per share over the trailing twelve months, in trading currency */
  dps: number | null;
  payoutRatioPct: number | null;
  fcfCover: number | null;          // free cash flow ÷ total dividends paid
  growthStreak: number;
  cagr: number | null;              // % per year
  consistencyPct: number;
  yearsPaying: number;
  frequency: string;
  nextExDate: string | null;
  nextExDateIsEstimate: boolean;
  daysToExDate: number | null;
  payDate: string | null;
  /** Today's yield versus its own 5-year average, in percentage points */
  yieldVsHistory: number | null;
  dropFromHigh: number;             // % below the 52-week high
  scores: { yield: number; safety: number; growth: number; consistency: number };
  total: number;                    // 0-100 for the active preset
  warnings: string[];
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/**
 * Growth measured on complete years only. The stored metrics count the current
 * year too, which is normally part paid and so reads as a cut — recomputing
 * here keeps the ranking honest without waiting for the next ETL run.
 */
function growthFromHistory(
  annuals: { year: number; totalDPS: number; payments?: number }[],
): { streak: number; cagr: number | null } {
  const currentYear = new Date().getFullYear();
  const complete = annuals.filter(a => a.year < currentYear);
  if (complete.length < 2) return { streak: 0, cagr: null };

  let streak = 0;
  for (let i = complete.length - 1; i >= 1; i--) {
    if (complete[i].totalDPS > complete[i - 1].totalDPS) streak++;
    else break;
  }

  // The oldest year is often clipped by the 5-year history window, which would
  // read as explosive growth. Prefer the payment count; fall back to dropping a
  // leading year that is less than 60% of the next one.
  const expected = Math.max(...complete.map(a => a.payments ?? 0), 0);
  let full = expected > 0
    ? complete.filter(a => (a.payments ?? 0) >= expected)
    : complete;
  if (expected === 0) {
    while (full.length >= 3 && full[0].totalDPS < full[1].totalDPS * 0.6) full = full.slice(1);
  }
  if (full.length < 2) return { streak, cagr: null };

  const first = full[0];
  const last = full[full.length - 1];
  const years = last.year - first.year;
  const cagr = years > 0 && first.totalDPS > 0 && last.totalDPS > 0
    ? +((Math.pow(last.totalDPS / first.totalDPS, 1 / years) - 1) * 100).toFixed(2)
    : null;

  return { streak, cagr };
}

/** Yield score: rewards income up to ~8%, then backs off — very high yields usually mean trouble. */
function scoreYield(yieldPct: number): number {
  if (yieldPct <= 0) return 0;
  if (yieldPct <= 8) return clamp((yieldPct / 8) * 100);
  // Above 8% the market is pricing in a cut; fade rather than reward
  return clamp(100 - (yieldPct - 8) * 12);
}

/**
 * Safety: can they keep paying? Payout ratio carries the most weight, with
 * cash cover, leverage and Altman Z adjusting around it.
 */
function scoreSafety(s: StockRecord, payoutRatioPct: number | null, fcfCover: number | null): number {
  let score = 55; // neutral when we know nothing

  if (payoutRatioPct != null) {
    if (payoutRatioPct <= 0) score = 45;              // paying with no earnings
    else if (payoutRatioPct <= 40) score = 95;
    else if (payoutRatioPct <= 60) score = 85;
    else if (payoutRatioPct <= 75) score = 70;
    else if (payoutRatioPct <= 90) score = 52;
    else if (payoutRatioPct <= 100) score = 40;
    else score = clamp(30 - (payoutRatioPct - 100) / 5, 5, 30);
  }

  if (fcfCover != null) {
    if (fcfCover >= 2) score += 10;
    else if (fcfCover >= 1.2) score += 5;
    else if (fcfCover >= 1) score -= 2;
    else score -= 18;                                  // dividend exceeds free cash flow
  }

  if (s.debtToEquity != null) {
    if (s.debtToEquity > 250) score -= 12;
    else if (s.debtToEquity > 150) score -= 6;
    else if (s.debtToEquity < 60) score += 4;
  }

  if (s.altmanZone === 'distress') score -= 15;
  else if (s.altmanZone === 'safe') score += 5;

  if (s.piotroskiScore != null) {
    if (s.piotroskiScore >= 7) score += 5;
    else if (s.piotroskiScore <= 3) score -= 8;
  }

  return clamp(score);
}

/** Growth: a streak of raises plus the rate of those raises. */
function scoreGrowth(streak: number, cagr: number | null): number {
  const streakScore = clamp((Math.min(streak, 15) / 15) * 100);
  let cagrScore = 35;                                  // unknown ≈ modest
  if (cagr != null) {
    if (cagr <= 0) cagrScore = 8;
    else cagrScore = clamp((Math.min(cagr, 15) / 15) * 100);
  }
  return clamp(streakScore * 0.55 + cagrScore * 0.45);
}

/** Consistency: paid every year, and for long enough that the record means something. */
function scoreConsistency(consistencyPct: number, yearsPaying: number): number {
  const lengthScore = clamp((Math.min(yearsPaying, 10) / 10) * 100);
  return clamp(consistencyPct * 0.6 + lengthScore * 0.4);
}

function daysUntil(dateStr: string): number {
  return Math.round((new Date(`${dateStr}T00:00:00`).getTime() - Date.now()) / 86_400_000);
}

/** Next ex-date: Yahoo's exact one when it is still ahead, else the cadence estimate. */
function resolveExDate(s: StockRecord): { date: string | null; estimate: boolean } {
  const exact = s.exDividendDate ?? null;
  if (exact && daysUntil(exact) >= 0) return { date: exact, estimate: false };
  const guess = s.dividendMetrics?.nextExDateEstimate ?? null;
  if (guess && daysUntil(guess) >= 0) return { date: guess, estimate: true };
  return { date: exact ?? guess, estimate: !exact };
}

export function buildDividendView(s: StockRecord, preset: DividendPreset): DividendView | null {
  const yieldPct = (s.dividendYield ?? 0) * 100;
  const metrics = s.dividendMetrics ?? null;
  if (yieldPct <= 0 && !metrics) return null;

  const dps = metrics?.ttmDPS ?? s.trailingAnnualDividendRate ?? metrics?.currentAnnualDPS ?? null;

  // Prefer Yahoo's payout ratio; fall back to dividend ÷ trailing EPS
  let payoutRatioPct: number | null = s.payoutRatio != null ? s.payoutRatio * 100 : null;
  if (payoutRatioPct == null && dps != null && s.trailingEps != null && s.trailingEps > 0) {
    payoutRatioPct = (dps / s.trailingEps) * 100;
  }

  let fcfCover: number | null = null;
  if (s.freeCashflow != null && dps != null && s.sharesOutstanding != null && s.sharesOutstanding > 0) {
    const totalDividends = dps * s.sharesOutstanding;
    if (totalDividends > 0) fcfCover = s.freeCashflow / totalDividends;
  }

  const derived = growthFromHistory(metrics?.annualDividends ?? []);
  const growthStreak = Math.max(derived.streak, metrics?.growthStreak ?? 0);
  const cagr = derived.cagr ?? metrics?.fiveYearCAGR ?? null;
  const consistencyPct = (metrics?.payoutConsistency ?? 0) * 100;
  const yearsPaying = metrics?.annualDividends?.length ?? 0;

  const { date: nextExDate, estimate } = resolveExDate(s);
  const dropFromHigh = s.fiftyTwoWeekHigh > 0
    ? ((s.fiftyTwoWeekHigh - s.price) / s.fiftyTwoWeekHigh) * 100
    : 0;

  const scores = {
    yield: scoreYield(yieldPct),
    safety: scoreSafety(s, payoutRatioPct, fcfCover),
    growth: scoreGrowth(growthStreak, cagr),
    consistency: scoreConsistency(consistencyPct, yearsPaying),
  };

  const w = (PRESETS.find(p => p.key === preset) ?? PRESETS[2]).weights;
  const total = Math.round(
    scores.yield * w.yield + scores.safety * w.safety +
    scores.growth * w.growth + scores.consistency * w.consistency
  );

  const warnings: string[] = [];
  if (yieldPct > 8) warnings.push('Yield above 8% — the market often prices in a cut');
  if (payoutRatioPct != null && payoutRatioPct > 100) warnings.push('Paying out more than it earns');
  if (fcfCover != null && fcfCover < 1) warnings.push('Dividend exceeds free cash flow');
  if (metrics && consistencyPct < 80 && yearsPaying >= 3) warnings.push('Has skipped payments in the past');
  if (s.altmanZone === 'distress') warnings.push('Altman Z-Score in the distress zone');
  if (cagr != null && cagr < 0) warnings.push('Dividend has shrunk over time');

  return {
    stock: s,
    yieldPct,
    dps,
    payoutRatioPct,
    fcfCover,
    growthStreak,
    cagr,
    consistencyPct,
    yearsPaying,
    frequency: metrics?.frequency ?? 'unknown',
    nextExDate,
    nextExDateIsEstimate: estimate,
    daysToExDate: nextExDate ? daysUntil(nextExDate) : null,
    payDate: s.dividendPayDate ?? null,
    yieldVsHistory: s.fiveYearAvgDividendYield != null && yieldPct > 0
      ? +(yieldPct - s.fiveYearAvgDividendYield).toFixed(2)
      : null,
    dropFromHigh,
    scores,
    total,
    warnings,
  };
}
