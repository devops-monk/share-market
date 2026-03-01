import { CONFIG } from '../config.js';

interface FinBERTResult {
  label: string;   // "positive" | "negative" | "neutral"
  score: number;   // 0-1 confidence
}

const FINBERT_URL = 'https://router.huggingface.co/hf-inference/models/ProsusAI/finbert';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Circuit breaker: once consecutive failures hit threshold, skip all remaining calls */
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 2;

function isCircuitOpen(): boolean {
  return consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD;
}

/**
 * Classify headlines using HuggingFace FinBERT Inference API.
 * Returns a score from -1 to 1 for each headline.
 * Uses a circuit breaker — if first 2 batches fail, skips the rest.
 */
export async function classifyHeadlines(
  headlines: string[],
  apiKey: string,
): Promise<(number | null)[]> {
  // Reset circuit breaker for each top-level call
  consecutiveFailures = 0;

  const results: (number | null)[] = new Array(headlines.length).fill(null);
  const batchSize = CONFIG.finbertBatchSize;

  // Probe with first batch — if it fails, bail immediately
  const probeBatch = headlines.slice(0, batchSize);
  const probeScores = await classifyBatch(probeBatch, apiKey);

  const probeSucceeded = probeScores.some(s => s != null);
  if (!probeSucceeded) {
    console.log('  FinBERT probe failed — skipping all batches (using lexicon fallback)');
    return results;
  }

  // Probe succeeded — store results and continue
  for (let j = 0; j < probeScores.length; j++) {
    results[j] = probeScores[j];
  }

  for (let i = batchSize; i < headlines.length; i += batchSize) {
    if (isCircuitOpen()) {
      console.log(`  FinBERT circuit breaker open — skipping remaining ${headlines.length - i} headlines`);
      break;
    }

    const batch = headlines.slice(i, i + batchSize);
    const batchScores = await classifyBatch(batch, apiKey);
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
  // Single attempt with a short timeout — no retries to avoid wasting time
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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

    if (res.status === 503) {
      // Model loading — not worth waiting, use lexicon
      console.log('  FinBERT model is cold (503) — skipping');
      consecutiveFailures++;
      return texts.map(() => null);
    }

    if (res.status === 429 || res.status === 504 || res.status === 502) {
      console.warn(`  FinBERT error ${res.status} — skipping batch`);
      consecutiveFailures++;
      return texts.map(() => null);
    }

    if (!res.ok) {
      console.warn(`  FinBERT API error: ${res.status}`);
      consecutiveFailures++;
      return texts.map(() => null);
    }

    const data = await res.json() as FinBERTResult[][];

    // Success — reset circuit breaker
    consecutiveFailures = 0;

    return data.map(predictions => {
      if (!Array.isArray(predictions) || predictions.length === 0) return null;
      return finbertToScore(predictions);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Only log once, not full stack trace
    console.warn(`  FinBERT batch failed: ${msg.includes('abort') ? 'timeout (10s)' : msg}`);
    consecutiveFailures++;
    return texts.map(() => null);
  }
}

/**
 * Convert FinBERT label probabilities to a single -1..1 score.
 * FinBERT returns: [{label: "positive", score: 0.8}, {label: "negative", score: 0.1}, {label: "neutral", score: 0.1}]
 */
function finbertToScore(predictions: FinBERTResult[]): number {
  let positive = 0;
  let negative = 0;
  for (const p of predictions) {
    if (p.label === 'positive') positive = p.score;
    else if (p.label === 'negative') negative = p.score;
  }
  return +(positive - negative).toFixed(3);
}
