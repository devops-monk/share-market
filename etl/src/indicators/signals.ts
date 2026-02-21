import { CONFIG } from '../config.js';
import type { TechnicalData } from './technical.js';
import type { QuoteData } from '../stocks/fetcher.js';

export interface Signal {
  type: string;
  direction: 'bullish' | 'bearish';
  severity: number; // 1-3
  description: string;
}

export function detectSignals(tech: TechnicalData, quote: QuoteData): Signal[] {
  const signals: Signal[] = [];

  // Death Cross: SMA50 < SMA200
  if (tech.sma50 != null && tech.sma200 != null) {
    if (tech.sma50 < tech.sma200) {
      signals.push({
        type: 'Death Cross',
        direction: 'bearish',
        severity: 3,
        description: `SMA50 (${tech.sma50.toFixed(2)}) below SMA200 (${tech.sma200.toFixed(2)})`,
      });
    } else {
      signals.push({
        type: 'Golden Cross',
        direction: 'bullish',
        severity: 2,
        description: `SMA50 (${tech.sma50.toFixed(2)}) above SMA200 (${tech.sma200.toFixed(2)})`,
      });
    }
  }

  // RSI overbought/oversold
  if (tech.rsi != null) {
    if (tech.rsi > CONFIG.rsiOverbought) {
      signals.push({
        type: 'RSI Overbought',
        direction: 'bearish',
        severity: 2,
        description: `RSI at ${tech.rsi.toFixed(1)} (above ${CONFIG.rsiOverbought})`,
      });
    } else if (tech.rsi < CONFIG.rsiOversold) {
      signals.push({
        type: 'RSI Oversold',
        direction: 'bullish',
        severity: 2,
        description: `RSI at ${tech.rsi.toFixed(1)} (below ${CONFIG.rsiOversold})`,
      });
    }
  }

  // MACD crossover
  if (tech.macd) {
    if (tech.macd.histogram < 0) {
      signals.push({
        type: 'MACD Bearish',
        direction: 'bearish',
        severity: 2,
        description: `MACD histogram negative (${tech.macd.histogram.toFixed(3)})`,
      });
    } else {
      signals.push({
        type: 'MACD Bullish',
        direction: 'bullish',
        severity: 2,
        description: `MACD histogram positive (${tech.macd.histogram.toFixed(3)})`,
      });
    }
  }

  // Volume spike on price decline
  if (tech.volumeRatio > 2 && quote.changePercent < -2) {
    signals.push({
      type: 'Volume Spike Decline',
      direction: 'bearish',
      severity: 2,
      description: `Volume ${tech.volumeRatio.toFixed(1)}x average with ${quote.changePercent.toFixed(1)}% decline`,
    });
  }

  // Strong momentum
  if (tech.priceReturn3m > 0.15) {
    signals.push({
      type: 'Strong Momentum',
      direction: 'bullish',
      severity: 1,
      description: `3-month return +${(tech.priceReturn3m * 100).toFixed(1)}%`,
    });
  } else if (tech.priceReturn3m < -0.15) {
    signals.push({
      type: 'Weak Momentum',
      direction: 'bearish',
      severity: 1,
      description: `3-month return ${(tech.priceReturn3m * 100).toFixed(1)}%`,
    });
  }

  // Near 52-week low
  if (quote.price <= quote.fiftyTwoWeekLow * 1.05) {
    signals.push({
      type: 'Near 52W Low',
      direction: 'bearish',
      severity: 1,
      description: `Price near 52-week low of ${quote.fiftyTwoWeekLow.toFixed(2)}`,
    });
  }

  // Near 52-week high
  if (quote.price >= quote.fiftyTwoWeekHigh * 0.95) {
    signals.push({
      type: 'Near 52W High',
      direction: 'bullish',
      severity: 1,
      description: `Price near 52-week high of ${quote.fiftyTwoWeekHigh.toFixed(2)}`,
    });
  }

  return signals;
}

export function computeBearishScore(signals: Signal[]): number {
  return signals
    .filter(s => s.direction === 'bearish')
    .reduce((sum, s) => sum + s.severity, 0);
}

export function computeBullishScore(signals: Signal[]): number {
  return signals
    .filter(s => s.direction === 'bullish')
    .reduce((sum, s) => sum + s.severity, 0);
}
