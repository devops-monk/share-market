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

  // === MOVING AVERAGE SIGNALS ===

  // Death Cross / Golden Cross: SMA50 vs SMA200
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

  // Price vs SMA alignment
  if (tech.sma50 != null && tech.sma200 != null) {
    if (quote.price > tech.sma50 && tech.sma50 > tech.sma200) {
      signals.push({
        type: 'MA Alignment Bullish',
        direction: 'bullish',
        severity: 1,
        description: 'Price > SMA50 > SMA200 — strong uptrend alignment',
      });
    } else if (quote.price < tech.sma50 && tech.sma50 < tech.sma200) {
      signals.push({
        type: 'MA Alignment Bearish',
        direction: 'bearish',
        severity: 1,
        description: 'Price < SMA50 < SMA200 — strong downtrend alignment',
      });
    }
  }

  // === RSI SIGNALS ===

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

  // === MACD SIGNALS ===

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

  // === BOLLINGER BAND SIGNALS ===

  if (tech.bollinger) {
    const bb = tech.bollinger;

    // Squeeze detection — volatility about to expand
    if (bb.squeeze) {
      signals.push({
        type: 'BB Squeeze',
        direction: 'bullish', // Squeeze is neutral but often resolves upward
        severity: 2,
        description: `Bollinger Band squeeze (bandwidth ${(bb.bandwidth * 100).toFixed(1)}%) — breakout imminent`,
      });
    }

    // Price touching upper band + RSI overbought = bearish reversal
    if (bb.percentB > 0.95 && tech.rsi != null && tech.rsi > 70) {
      signals.push({
        type: 'BB Upper + RSI High',
        direction: 'bearish',
        severity: 2,
        description: `Price at upper Bollinger Band with RSI ${tech.rsi.toFixed(1)} — overextended`,
      });
    }

    // Price touching lower band + RSI oversold = bullish bounce
    if (bb.percentB < 0.05 && tech.rsi != null && tech.rsi < 30) {
      signals.push({
        type: 'BB Lower + RSI Low',
        direction: 'bullish',
        severity: 2,
        description: `Price at lower Bollinger Band with RSI ${tech.rsi.toFixed(1)} — potential bounce`,
      });
    }
  }

  // === STOCHASTIC SIGNALS ===

  if (tech.stochastic) {
    const { k, d } = tech.stochastic;

    // Bearish: %K crosses below %D above 80
    if (k < d && k > 75) {
      signals.push({
        type: 'Stochastic Bearish',
        direction: 'bearish',
        severity: 2,
        description: `Stochastic %K (${k.toFixed(1)}) crossed below %D (${d.toFixed(1)}) in overbought zone`,
      });
    }

    // Bullish: %K crosses above %D below 20
    if (k > d && k < 25) {
      signals.push({
        type: 'Stochastic Bullish',
        direction: 'bullish',
        severity: 2,
        description: `Stochastic %K (${k.toFixed(1)}) crossed above %D (${d.toFixed(1)}) in oversold zone`,
      });
    }

    // Double confirmation: RSI + Stochastic agree
    if (tech.rsi != null) {
      if (tech.rsi > 70 && k > 80) {
        signals.push({
          type: 'RSI + Stochastic Overbought',
          direction: 'bearish',
          severity: 3,
          description: `Both RSI (${tech.rsi.toFixed(1)}) and Stochastic (${k.toFixed(1)}) confirm overbought`,
        });
      } else if (tech.rsi < 30 && k < 20) {
        signals.push({
          type: 'RSI + Stochastic Oversold',
          direction: 'bullish',
          severity: 3,
          description: `Both RSI (${tech.rsi.toFixed(1)}) and Stochastic (${k.toFixed(1)}) confirm oversold`,
        });
      }
    }
  }

  // === OBV SIGNALS ===

  if (tech.obvDivergence === 'bearish') {
    signals.push({
      type: 'OBV Bearish Divergence',
      direction: 'bearish',
      severity: 3,
      description: 'Price rising but OBV falling — distribution detected (smart money selling)',
    });
  } else if (tech.obvDivergence === 'bullish') {
    signals.push({
      type: 'OBV Bullish Divergence',
      direction: 'bullish',
      severity: 3,
      description: 'Price falling but OBV rising — accumulation detected (smart money buying)',
    });
  }

  if (tech.obvTrend === 'rising' && quote.changePercent > 0) {
    signals.push({
      type: 'Volume Confirms Uptrend',
      direction: 'bullish',
      severity: 1,
      description: 'OBV trend rising with price — volume confirms the move',
    });
  }

  // === VOLUME SIGNALS ===

  // Volume spike on price decline
  if (tech.volumeRatio > 2 && quote.changePercent < -2) {
    signals.push({
      type: 'Volume Spike Decline',
      direction: 'bearish',
      severity: 2,
      description: `Volume ${tech.volumeRatio.toFixed(1)}x average with ${quote.changePercent.toFixed(1)}% decline`,
    });
  }

  // Accumulation day: price up >1% on above-average volume
  if (tech.volumeRatio > 1.3 && quote.changePercent > 1) {
    signals.push({
      type: 'Accumulation Day',
      direction: 'bullish',
      severity: 1,
      description: `Price up ${quote.changePercent.toFixed(1)}% on ${tech.volumeRatio.toFixed(1)}x volume — institutional buying`,
    });
  }

  // === MOMENTUM SIGNALS ===

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

  // === 52-WEEK PROXIMITY ===

  if (quote.price <= quote.fiftyTwoWeekLow * 1.05) {
    signals.push({
      type: 'Near 52W Low',
      direction: 'bearish',
      severity: 1,
      description: `Price near 52-week low of ${quote.fiftyTwoWeekLow.toFixed(2)}`,
    });
  }

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
