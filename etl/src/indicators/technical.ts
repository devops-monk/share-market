import { RSI, MACD, SMA, BollingerBands, Stochastic, OBV } from 'technicalindicators';
import type { QuoteData } from '../stocks/fetcher.js';

export interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;  // (upper - lower) / middle
  percentB: number;   // (price - lower) / (upper - lower)
  squeeze: boolean;   // bandwidth below threshold
}

export interface StochasticData {
  k: number;
  d: number;
}

export interface TechnicalData {
  rsi: number | null;
  macd: { MACD: number; signal: number; histogram: number } | null;
  sma50: number | null;
  sma150: number | null;
  sma200: number | null;
  sma20: number | null;
  sma200Slope: number | null;  // slope of SMA200 over last 20 days
  volumeRatio: number;
  priceReturn3m: number;
  priceReturn6m: number;
  priceReturn1y: number;
  volatility: number;
  bollinger: BollingerData | null;
  stochastic: StochasticData | null;
  obv: number | null;
  obvTrend: 'rising' | 'falling' | 'flat' | null;
  obvDivergence: 'bullish' | 'bearish' | null;
  weeklyHighLowRange: number | null;  // consolidation detection: 6-week range %
  accumulationDistribution: number | null; // 13-week up-volume vs down-volume ratio
}

export function computeTechnicals(quote: QuoteData): TechnicalData {
  const closes = quote.historicalClose;
  const volumes = quote.historicalVolume;
  const highs = closes.map((c, i) => c * 1.005); // Approximate highs from close
  const lows = closes.map((c, i) => c * 0.995);  // Approximate lows from close

  // RSI (14-period)
  let rsi: number | null = null;
  if (closes.length >= 15) {
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    rsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  }

  // MACD (12, 26, 9)
  let macd: TechnicalData['macd'] = null;
  if (closes.length >= 27) {
    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const last = macdValues[macdValues.length - 1];
    if (last && last.MACD != null && last.signal != null && last.histogram != null) {
      macd = { MACD: last.MACD, signal: last.signal, histogram: last.histogram };
    }
  }

  // SMA 20, 50, 150, 200
  let sma20: number | null = null;
  let sma50: number | null = null;
  let sma150: number | null = null;
  let sma200: number | null = null;
  let sma200Slope: number | null = null;
  if (closes.length >= 20) {
    const sma20Values = SMA.calculate({ values: closes, period: 20 });
    sma20 = sma20Values[sma20Values.length - 1] ?? null;
  }
  if (closes.length >= 50) {
    const sma50Values = SMA.calculate({ values: closes, period: 50 });
    sma50 = sma50Values[sma50Values.length - 1] ?? null;
  }
  if (closes.length >= 150) {
    const sma150Values = SMA.calculate({ values: closes, period: 150 });
    sma150 = sma150Values[sma150Values.length - 1] ?? null;
  }
  if (closes.length >= 200) {
    const sma200Values = SMA.calculate({ values: closes, period: 200 });
    sma200 = sma200Values[sma200Values.length - 1] ?? null;
    // SMA200 slope: compare current SMA200 vs 20 days ago
    if (sma200Values.length >= 21) {
      const current = sma200Values[sma200Values.length - 1];
      const past = sma200Values[sma200Values.length - 21];
      sma200Slope = (current - past) / past;
    }
  }

  // Bollinger Bands (20-period, 2 std dev)
  let bollinger: BollingerData | null = null;
  if (closes.length >= 20) {
    const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
    const last = bbValues[bbValues.length - 1];
    if (last) {
      const bandwidth = (last.upper - last.lower) / last.middle;
      const percentB = last.upper !== last.lower
        ? (quote.price - last.lower) / (last.upper - last.lower)
        : 0.5;
      // Squeeze: bandwidth below 10th percentile of recent readings
      const recentBW = bbValues.slice(-60).map(b => (b.upper - b.lower) / b.middle);
      const sortedBW = [...recentBW].sort((a, b) => a - b);
      const threshold = sortedBW[Math.floor(sortedBW.length * 0.15)] ?? bandwidth;
      bollinger = {
        upper: last.upper,
        middle: last.middle,
        lower: last.lower,
        bandwidth,
        percentB,
        squeeze: bandwidth <= threshold,
      };
    }
  }

  // Stochastic Oscillator (14, 3, 3)
  let stochastic: StochasticData | null = null;
  if (closes.length >= 17) {
    const stochValues = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3,
    });
    const last = stochValues[stochValues.length - 1];
    if (last && last.k != null && last.d != null) {
      stochastic = { k: last.k, d: last.d };
    }
  }

  // On-Balance Volume
  let obv: number | null = null;
  let obvTrend: TechnicalData['obvTrend'] = null;
  let obvDivergence: TechnicalData['obvDivergence'] = null;
  if (closes.length >= 20 && volumes.length >= 20) {
    const minLen = Math.min(closes.length, volumes.length);
    const c = closes.slice(-minLen);
    const v = volumes.slice(-minLen);
    const obvValues = OBV.calculate({ close: c, volume: v });

    if (obvValues.length >= 20) {
      obv = obvValues[obvValues.length - 1];

      // OBV trend: compare last 20-day SMA of OBV vs 20 days ago
      const obvRecent = obvValues.slice(-20);
      const obvAvgRecent = obvRecent.reduce((a, b) => a + b, 0) / obvRecent.length;
      const obvOlder = obvValues.slice(-40, -20);
      if (obvOlder.length >= 10) {
        const obvAvgOlder = obvOlder.reduce((a, b) => a + b, 0) / obvOlder.length;
        const change = (obvAvgRecent - obvAvgOlder) / Math.abs(obvAvgOlder || 1);
        obvTrend = change > 0.05 ? 'rising' : change < -0.05 ? 'falling' : 'flat';
      }

      // OBV divergence detection
      // Price rising but OBV falling = bearish divergence
      // Price falling but OBV rising = bullish divergence
      if (closes.length >= 20) {
        const priceChange20d = (closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20];
        const obvChange20d = obvValues.length >= 20
          ? (obvValues[obvValues.length - 1] - obvValues[obvValues.length - 20]) / Math.abs(obvValues[obvValues.length - 20] || 1)
          : 0;
        if (priceChange20d > 0.03 && obvChange20d < -0.05) {
          obvDivergence = 'bearish';
        } else if (priceChange20d < -0.03 && obvChange20d > 0.05) {
          obvDivergence = 'bullish';
        }
      }
    }
  }

  // Volume ratio (current vs 20-day average)
  let volumeRatio = 1;
  if (volumes.length >= 20) {
    const recent20 = volumes.slice(-20);
    const avgVol = recent20.reduce((a, b) => a + b, 0) / recent20.length;
    volumeRatio = avgVol > 0 ? quote.volume / avgVol : 1;
  }

  // Price returns
  const priceReturn3m = closes.length >= 63
    ? (closes[closes.length - 1] - closes[closes.length - 63]) / closes[closes.length - 63]
    : 0;
  const priceReturn6m = closes.length >= 126
    ? (closes[closes.length - 1] - closes[closes.length - 126]) / closes[closes.length - 126]
    : closes.length >= 2
      ? (closes[closes.length - 1] - closes[0]) / closes[0]
      : 0;
  const priceReturn1y = closes.length >= 252
    ? (closes[closes.length - 1] - closes[closes.length - 252]) / closes[closes.length - 252]
    : priceReturn6m;

  // Volatility (std dev of daily returns over last 30 days)
  let volatility = 0;
  if (closes.length >= 31) {
    const returns: number[] = [];
    const slice = closes.slice(-31);
    for (let i = 1; i < slice.length; i++) {
      returns.push((slice[i] - slice[i - 1]) / slice[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    volatility = Math.sqrt(variance) * Math.sqrt(252);
  }

  // Consolidation detection: 6-week (30 trading day) high-low range as %
  let weeklyHighLowRange: number | null = null;
  if (closes.length >= 30) {
    const recent30 = closes.slice(-30);
    const high30 = Math.max(...recent30);
    const low30 = Math.min(...recent30);
    weeklyHighLowRange = low30 > 0 ? (high30 - low30) / low30 : null;
  }

  // Accumulation/Distribution: 13-week (65 trading day) up-volume vs down-volume
  let accumulationDistribution: number | null = null;
  if (closes.length >= 66 && volumes.length >= 66) {
    const len = Math.min(closes.length, volumes.length);
    let upVol = 0, downVol = 0;
    const start = Math.max(1, len - 65);
    for (let i = start; i < len; i++) {
      if (closes[i] > closes[i - 1]) upVol += volumes[i];
      else if (closes[i] < closes[i - 1]) downVol += volumes[i];
    }
    const totalVol = upVol + downVol;
    accumulationDistribution = totalVol > 0 ? (upVol - downVol) / totalVol : 0;
  }

  return {
    rsi, macd, sma20, sma50, sma150, sma200, sma200Slope, volumeRatio,
    priceReturn3m, priceReturn6m, priceReturn1y, volatility,
    bollinger, stochastic, obv, obvTrend, obvDivergence,
    weeklyHighLowRange, accumulationDistribution,
  };
}
