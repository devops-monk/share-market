import pLimit from 'p-limit';
import { CONFIG } from '../config.js';
import type { StockRecord } from '../output/writer.js';

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

export interface LLMProvider {
  url: string;
  model: string;
  apiKey: string;
  name: string;
}

function buildPrompt(stock: StockRecord): string {
  const bullish = stock.signals.filter(s => s.direction === 'bullish');
  const bearish = stock.signals.filter(s => s.direction === 'bearish');
  const topSignals = [...stock.signals]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
    .map(s => s.description)
    .join('; ');

  const fmt = (v: number | null | undefined, suffix = '') =>
    v != null ? `${v.toFixed(1)}${suffix}` : 'N/A';

  return `You are a financial analyst. Write a concise research note for ${stock.ticker} (${stock.name}, ${stock.sector}).

Data: Price $${stock.price.toFixed(2)} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(1)}%), Score ${stock.score.composite}/100, RSI ${fmt(stock.rsi)}, 52W Range ${stock.fiftyTwoWeekRangePercent}%,
P/E ${fmt(stock.pe)}, Fwd P/E ${fmt(stock.forwardPe)}, EPS Growth ${fmt(stock.earningsGrowth != null ? stock.earningsGrowth * 100 : null, '%')}, Rev Growth ${fmt(stock.revenueGrowth != null ? stock.revenueGrowth * 100 : null, '%')}, ROE ${fmt(stock.returnOnEquity != null ? stock.returnOnEquity * 100 : null, '%')},
D/E ${fmt(stock.debtToEquity)}, Piotroski ${stock.piotroskiScore ?? 'N/A'}/9, Buffett ${stock.buffettScore ?? 'N/A'}/5, RS Percentile ${stock.rsPercentile},
Signals: ${bullish.length} bullish, ${bearish.length} bearish. Key: ${topSignals || 'none'}.
Momentum ${stock.score.priceMomentum}/100, Technical ${stock.score.technicalSignals}/100, Sentiment ${stock.score.newsSentiment}/100, Fundamentals ${stock.score.fundamentals}/100.

Write exactly 5 short paragraphs (no headers, no markdown):
1. Overall assessment  2. Technical setup  3. Fundamentals & valuation
4. Key signals & catalysts  5. Closing verdict
Be specific with numbers. 2-3 sentences each.`;
}

function parseParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.replace(/^\d+\.\s*/, '').trim())
    .filter(p => p.length > 0);

  // If we got fewer than 5 paragraphs, try splitting on single newlines
  if (paragraphs.length < 5) {
    const fallback = text
      .split(/\n/)
      .map(p => p.replace(/^\d+\.\s*/, '').trim())
      .filter(p => p.length > 20);
    if (fallback.length >= 5) return fallback.slice(0, 5);
  }

  return paragraphs.slice(0, 5);
}

async function callLLM(
  messages: ChatMessage[],
  provider: LLMProvider,
): Promise<string | null> {
  const res = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: 400,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn(`${provider.name} API error ${res.status}: ${body.slice(0, 200)}`);
    return null;
  }

  const data = (await res.json()) as ChatResponse;
  return data.choices?.[0]?.message?.content ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Resolve which LLM provider to use based on available API keys.
 * Priority: GROQ_API_KEY > OPENROUTER_API_KEY > HUGGINGFACE_API_KEY
 */
export function resolveLLMProvider(): LLMProvider | null {
  const priority = ['groq', 'openrouter', 'huggingface'];
  for (const name of priority) {
    const cfg = CONFIG.aiProviders[name];
    if (!cfg) continue;
    const apiKey = process.env[cfg.envKey];
    if (apiKey) {
      return { url: cfg.url, model: cfg.model, apiKey, name };
    }
  }
  return null;
}

export async function generateAIResearchNotes(
  stocks: StockRecord[],
  provider: LLMProvider,
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  const limit = pLimit(CONFIG.aiResearchConcurrency);

  // Take top N stocks by market cap
  const topStocks = [...stocks]
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, CONFIG.aiResearchMaxStocks);

  console.log(`Generating AI research notes for ${topStocks.length} stocks via ${provider.name} (${provider.model})...`);
  let completed = 0;
  let failed = 0;

  await Promise.all(
    topStocks.map(stock =>
      limit(async () => {
        try {
          const prompt = buildPrompt(stock);
          const messages: ChatMessage[] = [
            { role: 'system', content: 'You are a concise financial analyst. No markdown formatting.' },
            { role: 'user', content: prompt },
          ];

          const content = await callLLM(messages, provider);
          if (content) {
            const paragraphs = parseParagraphs(content);
            if (paragraphs.length >= 3) {
              results.set(stock.ticker, paragraphs);
            }
          }
        } catch (err) {
          failed++;
          console.warn(`AI note failed for ${stock.ticker}:`, (err as Error).message);
        } finally {
          completed++;
          if (completed % 10 === 0) {
            console.log(`  AI notes: ${completed}/${topStocks.length} (${failed} failed)`);
          }
        }

        // Rate limiting delay
        await delay(CONFIG.aiResearchDelayMs);
      })
    ),
  );

  console.log(`AI research notes: ${results.size} generated, ${failed} failed`);
  return results;
}
