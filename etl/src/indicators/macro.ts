import { CONFIG } from '../config.js';

export interface MacroData {
  vix: number | null;
  treasury10y: number | null;
  treasury2y: number | null;
  yieldSpread: number | null;
  dxy: number | null;
  fedFundsRate: number | null;
  lastUpdated: string;
}

const FRED_SERIES: Record<string, string> = {
  vix: 'VIXCLS',
  treasury10y: 'DGS10',
  treasury2y: 'DGS2',
  dxy: 'DTWEXBGS',
  fedFundsRate: 'FEDFUNDS',
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchFredSeries(seriesId: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const observations = data.observations;
    if (!observations || observations.length === 0) return null;
    // Find the first non-"." value (FRED uses "." for missing)
    for (const obs of observations) {
      if (obs.value && obs.value !== '.') {
        return parseFloat(obs.value);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch macro indicators from FRED API.
 * Gracefully returns null if FRED_API_KEY is not set.
 */
export async function fetchMacroData(): Promise<MacroData | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.log('Skipping macro data (no FRED_API_KEY)');
    return null;
  }

  console.log('Fetching macro data from FRED...');
  const results: Record<string, number | null> = {};

  for (const [key, seriesId] of Object.entries(FRED_SERIES)) {
    results[key] = await fetchFredSeries(seriesId, apiKey);
    await delay(CONFIG.fredRateDelayMs);
  }

  const yieldSpread = (results.treasury10y != null && results.treasury2y != null)
    ? +(results.treasury10y - results.treasury2y).toFixed(2)
    : null;

  const macroData: MacroData = {
    vix: results.vix,
    treasury10y: results.treasury10y,
    treasury2y: results.treasury2y,
    yieldSpread,
    dxy: results.dxy,
    fedFundsRate: results.fedFundsRate,
    lastUpdated: new Date().toISOString(),
  };

  console.log(`Macro data: VIX=${macroData.vix}, 10Y=${macroData.treasury10y}, Spread=${yieldSpread}`);
  return macroData;
}
