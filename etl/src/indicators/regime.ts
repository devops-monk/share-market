import { CONFIG } from '../config.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

interface RegimeData {
  index: string;
  price: number;
  sma50: number;
  sma200: number;
  changeFromHigh: number;  // % from 52W high
  distributionDays: number; // days with >0.2% drop on above-avg volume in last 25 trading days
  regime: 'bull' | 'correction' | 'bear';
  signal: string;
}

export interface MarketRegime {
  us: RegimeData;
  uk: RegimeData;
  in: RegimeData;
  eu: RegimeData;
  asia: RegimeData;
  overall: 'bull' | 'correction' | 'bear';
  summary: string;
}

async function fetchIndexData(ticker: string): Promise<RegimeData | null> {
  try {
    const encoded = encodeURIComponent(ticker);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1y&includePrePost=false`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;

    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    if (!quotes?.close) return null;

    const closes: number[] = quotes.close.filter((v: any) => v != null);
    const volumes: number[] = quotes.volume?.filter((v: any) => v != null) ?? [];

    if (closes.length < 50) return null;

    const price = meta.regularMarketPrice ?? closes[closes.length - 1];
    const high52w = Math.max(...closes);
    const changeFromHigh = ((price - high52w) / high52w) * 100;

    // SMA 50 and 200
    const sma50 = closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;
    const sma200 = closes.length >= 200
      ? closes.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200
      : closes.reduce((a: number, b: number) => a + b, 0) / closes.length;

    // Distribution days: last 25 trading days with >0.2% decline on above-average volume
    const avgVol = volumes.length >= 50
      ? volumes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50
      : volumes.reduce((a: number, b: number) => a + b, 0) / Math.max(volumes.length, 1);

    let distributionDays = 0;
    const recentCloses = closes.slice(-26); // need 26 to get 25 daily changes
    const recentVolumes = volumes.slice(-25);
    for (let i = 1; i < recentCloses.length && i <= 25; i++) {
      const dailyChange = (recentCloses[i] - recentCloses[i - 1]) / recentCloses[i - 1];
      const vol = recentVolumes[i - 1] ?? 0;
      if (dailyChange < -0.002 && vol > avgVol) {
        distributionDays++;
      }
    }

    // Determine regime
    let regime: 'bull' | 'correction' | 'bear';
    let signal: string;

    if (changeFromHigh < -20) {
      regime = 'bear';
      signal = `Down ${changeFromHigh.toFixed(1)}% from high — bear market territory`;
    } else if (changeFromHigh < -10 || distributionDays >= 6) {
      regime = 'correction';
      signal = distributionDays >= 6
        ? `${distributionDays} distribution days in 25 sessions — selling pressure`
        : `Down ${changeFromHigh.toFixed(1)}% from high — correction territory`;
    } else if (price > sma50 && sma50 > sma200) {
      regime = 'bull';
      signal = 'Price > SMA50 > SMA200 — confirmed uptrend';
    } else if (price > sma200) {
      regime = 'bull';
      signal = 'Price above SMA200 — uptrend intact';
    } else {
      regime = 'correction';
      signal = 'Price below SMA200 — trend weakening';
    }

    const INDEX_NAMES: Record<string, string> = {
      '^GSPC': 'S&P 500', '^FTSE': 'FTSE 100', '^NSEI': 'Nifty 50',
      '^GDAXI': 'DAX 40', '^N225': 'Nikkei 225',
    };

    return {
      index: INDEX_NAMES[ticker] || ticker,
      price: +price.toFixed(2),
      sma50: +sma50.toFixed(2),
      sma200: +sma200.toFixed(2),
      changeFromHigh: +changeFromHigh.toFixed(2),
      distributionDays,
      regime,
      signal,
    };
  } catch (err) {
    console.error(`Failed to fetch regime data for ${ticker}:`, err);
    return null;
  }
}

export async function computeMarketRegime(): Promise<MarketRegime | null> {
  const [us, uk, india, eu, asia] = await Promise.all([
    fetchIndexData('^GSPC'),   // S&P 500
    fetchIndexData('^FTSE'),   // FTSE 100
    fetchIndexData('^NSEI'),   // Nifty 50
    fetchIndexData('^GDAXI'),  // DAX 40
    fetchIndexData('^N225'),   // Nikkei 225
  ]);

  if (!us && !uk && !india && !eu && !asia) return null;

  const defaultRegime = (name: string): RegimeData => ({ index: name, price: 0, sma50: 0, sma200: 0, changeFromHigh: 0, distributionDays: 0, regime: 'bull' as const, signal: 'Data unavailable' });

  const usData = us ?? defaultRegime('S&P 500');
  const ukData = uk ?? defaultRegime('FTSE 100');
  const inData = india ?? defaultRegime('Nifty 50');
  const euData = eu ?? defaultRegime('DAX 40');
  const asiaData = asia ?? defaultRegime('Nikkei 225');

  // Overall regime = worst of all
  const regimeOrder = { bull: 0, correction: 1, bear: 2 };
  const allRegimes = [usData, ukData, inData, euData, asiaData];
  const worst = allRegimes.reduce((a, b) => regimeOrder[b.regime] > regimeOrder[a.regime] ? b : a);
  const overall = worst.regime;

  const summaryParts: string[] = [];
  if (overall === 'bull') summaryParts.push('Markets are in an uptrend. Favor long positions and momentum strategies.');
  else if (overall === 'correction') summaryParts.push('Markets showing weakness. Be selective, reduce position sizes, and tighten stops.');
  else summaryParts.push('Bear market conditions. Prioritize capital preservation. Avoid new longs, consider defensive positions.');

  return {
    us: usData,
    uk: ukData,
    in: inData,
    eu: euData,
    asia: asiaData,
    overall,
    summary: summaryParts.join(' '),
  };
}
