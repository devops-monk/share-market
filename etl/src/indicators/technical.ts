import { RSI, MACD, SMA } from 'technicalindicators';
import type { QuoteData } from '../stocks/fetcher.js';

export interface TechnicalData {
  rsi: number | null;
  macd: { MACD: number; signal: number; histogram: number } | null;
  sma50: number | null;
  sma200: number | null;
  volumeRatio: number;
  priceReturn3m: number;
  priceReturn6m: number;
  volatility: number;
}

export function computeTechnicals(quote: QuoteData): TechnicalData {
  const closes = quote.historicalClose;
  const volumes = quote.historicalVolume;

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

  // SMA 50 and 200
  let sma50: number | null = null;
  let sma200: number | null = null;
  if (closes.length >= 50) {
    const sma50Values = SMA.calculate({ values: closes, period: 50 });
    sma50 = sma50Values[sma50Values.length - 1] ?? null;
  }
  if (closes.length >= 200) {
    const sma200Values = SMA.calculate({ values: closes, period: 200 });
    sma200 = sma200Values[sma200Values.length - 1] ?? null;
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
    volatility = Math.sqrt(variance) * Math.sqrt(252); // annualized
  }

  return { rsi, macd, sma50, sma200, volumeRatio, priceReturn3m, priceReturn6m, volatility };
}
