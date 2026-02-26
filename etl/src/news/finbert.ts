import { CONFIG } from '../config.js';

interface FinBERTResult {
  label: string;   // "positive" | "negative" | "neutral"
  score: number;   // 0-1 confidence
}

const FINBERT_URL = 'https://api-inference.huggingface.co/models/ProsusAI/finbert';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Classify headlines using HuggingFace FinBERT Inference API.
 * Returns a score from -1 to 1 for each headline.
 */
export async function classifyHeadlines(
  headlines: string[],
  apiKey: string,
): Promise<(number | null)[]> {
  const results: (number | null)[] = new Array(headlines.length).fill(null);
  const batchSize = CONFIG.finbertBatchSize;

  for (let i = 0; i < headlines.length; i += batchSize) {
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
  retries = 3,
): Promise<(number | null)[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(FINBERT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: texts }),
      });

      if (res.status === 503) {
        // Model loading — wait and retry
        console.log('  FinBERT model loading, waiting 20s...');
        await delay(20000);
        continue;
      }

      if (res.status === 429) {
        // Rate limited — exponential backoff
        const waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
        console.log(`  FinBERT rate limited, waiting ${waitMs}ms...`);
        await delay(waitMs);
        continue;
      }

      if (!res.ok) {
        console.warn(`  FinBERT API error: ${res.status}`);
        return texts.map(() => null);
      }

      const data = await res.json() as FinBERTResult[][];

      return data.map(predictions => {
        if (!Array.isArray(predictions) || predictions.length === 0) return null;
        return finbertToScore(predictions);
      });
    } catch (err) {
      if (attempt < retries - 1) {
        await delay(1000 * (attempt + 1));
        continue;
      }
      console.warn('  FinBERT batch failed:', err);
      return texts.map(() => null);
    }
  }

  return texts.map(() => null);
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
