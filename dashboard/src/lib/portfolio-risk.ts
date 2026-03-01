/**
 * N31: Portfolio Risk Analytics — Pure computation functions
 * VaR, Monte Carlo, sector concentration, drawdown, beta, Sharpe
 */
import type { StockRecord } from '../types';

interface Holding {
  ticker: string;
  shares: number;
  buyPrice: number;
  addedAt: string;
}

interface PortfolioPosition {
  ticker: string;
  stock: StockRecord | undefined;
  totalShares: number;
  currentValue: number;
}

/* ─── RETURNS ─── */

/** Extract daily simple returns from OHLCV close prices */
function extractReturns(candles: number[][]): { dates: number[]; returns: number[] } {
  const dates: number[] = [];
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1][4];
    const currClose = candles[i][4];
    if (prevClose > 0 && currClose > 0) {
      dates.push(candles[i][0]);
      returns.push((currClose - prevClose) / prevClose);
    }
  }
  return { dates, returns };
}

/** Compute weighted daily portfolio returns */
export function computePortfolioReturns(
  ohlcvMap: Map<string, number[][]>,
  positions: PortfolioPosition[],
): { dates: number[]; returns: number[] } {
  const totalValue = positions.reduce((a, p) => a + p.currentValue, 0);
  if (totalValue === 0) return { dates: [], returns: [] };

  // Extract per-stock returns keyed by date
  const stockReturnsMap = new Map<string, Map<number, number>>();
  const weights = new Map<string, number>();

  for (const pos of positions) {
    const candles = ohlcvMap.get(pos.ticker);
    if (!candles || candles.length < 2) continue;
    const { dates, returns } = extractReturns(candles);
    const dateMap = new Map<number, number>();
    for (let i = 0; i < dates.length; i++) dateMap.set(dates[i], returns[i]);
    stockReturnsMap.set(pos.ticker, dateMap);
    weights.set(pos.ticker, pos.currentValue / totalValue);
  }

  if (stockReturnsMap.size === 0) return { dates: [], returns: [] };

  // Find common dates
  const allDateSets = [...stockReturnsMap.values()];
  const commonDates = [...allDateSets[0].keys()]
    .filter(d => allDateSets.every(m => m.has(d)))
    .sort((a, b) => a - b);

  const tickers = [...stockReturnsMap.keys()];
  const portfolioReturns = commonDates.map(date => {
    let r = 0;
    for (const t of tickers) {
      r += (weights.get(t) ?? 0) * (stockReturnsMap.get(t)?.get(date) ?? 0);
    }
    return r;
  });

  return { dates: commonDates, returns: portfolioReturns };
}

/* ─── VaR & CVaR ─── */

export interface VaRResult {
  var95: number;   // dollar amount
  var99: number;
  cvar95: number;  // conditional VaR (expected shortfall)
  cvar99: number;
  var95Pct: number;
  var99Pct: number;
}

export function computeVaR(returns: number[], portfolioValue: number): VaRResult {
  if (returns.length < 20) {
    return { var95: 0, var99: 0, cvar95: 0, cvar99: 0, var95Pct: 0, var99Pct: 0 };
  }
  const sorted = [...returns].sort((a, b) => a - b);
  const n = sorted.length;

  const idx95 = Math.floor(n * 0.05);
  const idx99 = Math.floor(n * 0.01);

  const var95Pct = -sorted[idx95];
  const var99Pct = -sorted[idx99];

  // CVaR: average of returns below VaR threshold
  const tail95 = sorted.slice(0, idx95 + 1);
  const tail99 = sorted.slice(0, idx99 + 1);
  const cvar95Pct = tail95.length > 0 ? -(tail95.reduce((a, b) => a + b, 0) / tail95.length) : var95Pct;
  const cvar99Pct = tail99.length > 0 ? -(tail99.reduce((a, b) => a + b, 0) / tail99.length) : var99Pct;

  return {
    var95: var95Pct * portfolioValue,
    var99: var99Pct * portfolioValue,
    cvar95: cvar95Pct * portfolioValue,
    cvar99: cvar99Pct * portfolioValue,
    var95Pct,
    var99Pct,
  };
}

/* ─── MONTE CARLO ─── */

export interface MonteCarloResult {
  /** Projected portfolio value at each day for percentile bands */
  bands: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  days: number;
}

export function monteCarloSimulation(
  returns: number[],
  portfolioValue: number,
  days = 252,
  sims = 1000,
): MonteCarloResult {
  if (returns.length < 20) {
    const empty = new Array(days).fill(portfolioValue);
    return { bands: { p5: empty, p25: empty, p50: empty, p75: empty, p95: empty }, days };
  }

  const n = returns.length;
  // Each sim: track portfolio value over `days` days
  const simResults: number[][] = []; // sims x days

  for (let s = 0; s < sims; s++) {
    const path: number[] = [];
    let value = portfolioValue;
    for (let d = 0; d < days; d++) {
      const randIdx = Math.floor(Math.random() * n);
      value *= (1 + returns[randIdx]);
      path.push(value);
    }
    simResults.push(path);
  }

  // Compute percentile bands per day
  const p5: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p95: number[] = [];

  for (let d = 0; d < days; d++) {
    const dayValues = simResults.map(sim => sim[d]).sort((a, b) => a - b);
    p5.push(dayValues[Math.floor(sims * 0.05)]);
    p25.push(dayValues[Math.floor(sims * 0.25)]);
    p50.push(dayValues[Math.floor(sims * 0.50)]);
    p75.push(dayValues[Math.floor(sims * 0.75)]);
    p95.push(dayValues[Math.floor(sims * 0.95)]);
  }

  return { bands: { p5, p25, p50, p75, p95 }, days };
}

/* ─── SECTOR CONCENTRATION ─── */

export interface SectorConcentration {
  sector: string;
  weight: number;   // 0-1
  count: number;
  value: number;
}

export function computeSectorConcentration(
  positions: PortfolioPosition[],
): SectorConcentration[] {
  const totalValue = positions.reduce((a, p) => a + p.currentValue, 0);
  if (totalValue === 0) return [];

  const sectorMap = new Map<string, { value: number; count: number }>();
  for (const p of positions) {
    const sector = p.stock?.sector ?? 'Unknown';
    const cur = sectorMap.get(sector) ?? { value: 0, count: 0 };
    cur.value += p.currentValue;
    cur.count += 1;
    sectorMap.set(sector, cur);
  }

  return [...sectorMap.entries()]
    .map(([sector, { value, count }]) => ({
      sector,
      weight: value / totalValue,
      count,
      value,
    }))
    .sort((a, b) => b.weight - a.weight);
}

/* ─── DRAWDOWN ─── */

export interface DrawdownResult {
  currentDrawdown: number;  // current dd as fraction (negative)
  maxDrawdown: number;      // worst dd as fraction (negative)
  drawdownSeries: number[]; // dd at each point
  dates: number[];
}

export function computePortfolioDrawdown(
  dates: number[],
  returns: number[],
): DrawdownResult {
  if (returns.length === 0) {
    return { currentDrawdown: 0, maxDrawdown: 0, drawdownSeries: [], dates: [] };
  }

  // Build cumulative equity curve
  const equity: number[] = [1];
  for (let i = 0; i < returns.length; i++) {
    equity.push(equity[i] * (1 + returns[i]));
  }

  // Compute running max and drawdown
  let peak = equity[0];
  const drawdowns: number[] = [];
  for (let i = 0; i < equity.length; i++) {
    if (equity[i] > peak) peak = equity[i];
    drawdowns.push((equity[i] - peak) / peak);
  }

  return {
    currentDrawdown: drawdowns[drawdowns.length - 1],
    maxDrawdown: Math.min(...drawdowns),
    drawdownSeries: drawdowns.slice(1), // skip initial 1
    dates,
  };
}

/* ─── BETA ─── */

export function computePortfolioBeta(
  portfolioReturns: number[],
  marketReturns: number[],
): number {
  const n = Math.min(portfolioReturns.length, marketReturns.length);
  if (n < 20) return 1;

  const pRet = portfolioReturns.slice(-n);
  const mRet = marketReturns.slice(-n);

  let sumP = 0, sumM = 0, sumPM = 0, sumM2 = 0;
  for (let i = 0; i < n; i++) {
    sumP += pRet[i];
    sumM += mRet[i];
    sumPM += pRet[i] * mRet[i];
    sumM2 += mRet[i] * mRet[i];
  }

  const meanP = sumP / n;
  const meanM = sumM / n;
  let cov = 0, varM = 0;
  for (let i = 0; i < n; i++) {
    cov += (pRet[i] - meanP) * (mRet[i] - meanM);
    varM += (mRet[i] - meanM) ** 2;
  }

  return varM > 0 ? cov / varM : 1;
}

/* ─── SHARPE ─── */

export function computePortfolioSharpe(returns: number[], riskFreeRate = 0.05): number {
  if (returns.length < 20) return 0;

  const dailyRf = riskFreeRate / 252;
  const excessReturns = returns.map(r => r - dailyRf);
  const mean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const variance = excessReturns.reduce((a, r) => a + (r - mean) ** 2, 0) / excessReturns.length;
  const std = Math.sqrt(variance);

  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(252); // Annualized
}

/* ─── RISK CONTRIBUTION PER HOLDING ─── */

export interface HoldingRisk {
  ticker: string;
  weight: number;
  volatility: number; // annualized
  beta: number | null;
}

export function computeHoldingRisks(
  positions: PortfolioPosition[],
  ohlcvMap: Map<string, number[][]>,
): HoldingRisk[] {
  const totalValue = positions.reduce((a, p) => a + p.currentValue, 0);
  if (totalValue === 0) return [];

  return positions.map(pos => {
    const candles = ohlcvMap.get(pos.ticker);
    let vol = 0;
    if (candles && candles.length > 20) {
      const { returns } = extractReturns(candles);
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
      vol = Math.sqrt(variance) * Math.sqrt(252);
    }

    return {
      ticker: pos.ticker,
      weight: pos.currentValue / totalValue,
      volatility: vol,
      beta: pos.stock?.beta ?? null,
    };
  });
}
