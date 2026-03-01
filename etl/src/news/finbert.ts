import { CONFIG } from '../config.js';

interface FinBERTResult {
  label: string;   // "positive" | "negative" | "neutral"
  score: number;   // 0-1 confidence
}

const FINBERT_URL = 'https://router.huggingface.co/hf-inference/models/ProsusAI/finbert';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Global circuit breaker — shared across ALL calls to classifyHeadlines.
 * Once FinBERT is determined to be down, skip for the entire ETL run.
 */
let finbertAvailable: boolean | null = null; // null = untested

/**
 * Probe FinBERT once at the start of the ETL run.
 * Call this before any classifyHeadlines calls.
 */
export async function probeFinBERT(apiKey: string): Promise<boolean> {
  if (finbertAvailable !== null) return finbertAvailable;

  console.log('  Probing FinBERT availability...');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(FINBERT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: ['Stock market rallied today'] }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      console.log('  FinBERT is available');
      finbertAvailable = true;
    } else {
      console.log(`  FinBERT unavailable (${res.status}) — using lexicon-only for all stocks`);
      finbertAvailable = false;
    }
  } catch {
    console.log('  FinBERT unreachable (timeout) — using lexicon-only for all stocks');
    finbertAvailable = false;
  }

  return finbertAvailable;
}

/**
 * Classify headlines using HuggingFace FinBERT Inference API.
 * Returns a score from -1 to 1 for each headline.
 * Skips immediately if global probe has already failed.
 */
export async function classifyHeadlines(
  headlines: string[],
  apiKey: string,
): Promise<(number | null)[]> {
  const results: (number | null)[] = new Array(headlines.length).fill(null);

  // Skip if FinBERT was already determined to be down
  if (finbertAvailable === false) return results;

  const batchSize = CONFIG.finbertBatchSize;

  for (let i = 0; i < headlines.length; i += batchSize) {
    const batch = headlines.slice(i, i + batchSize);
    const batchScores = await classifyBatch(batch, apiKey);

    // If batch completely failed, mark FinBERT as down globally
    const anySuccess = batchScores.some(s => s != null);
    if (!anySuccess) {
      finbertAvailable = false;
      return results;
    }

    for (let j = 0; j < batchScores.length; j++) {
      results[i + j] = batchScores[j];
    }
    if (i + batchSize < headlines.length) {
      await delay(CONFIG.finbertRateDelayMs);
    }
  }

  return results;
}

async function classifyBatch(
  texts: string[],
  apiKey: string,
): Promise<(number | null)[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(FINBERT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: texts }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return texts.map(() => null);

    const data = await res.json() as FinBERTResult[][];

    return data.map(predictions => {
      if (!Array.isArray(predictions) || predictions.length === 0) return null;
      return finbertToScore(predictions);
    });
  } catch {
    return texts.map(() => null);
  }
}

function finbertToScore(predictions: FinBERTResult[]): number {
  let positive = 0;
  let negative = 0;
  for (const p of predictions) {
    if (p.label === 'positive') positive = p.score;
    else if (p.label === 'negative') negative = p.score;
  }
  return +(positive - negative).toFixed(3);
}
