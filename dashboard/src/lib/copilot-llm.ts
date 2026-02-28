import type { StockRecord } from '../types';

const API_URL = 'https://router.huggingface.co/v1/chat/completions';
const MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';
const API_KEY_STORAGE = 'sm-hf-api-key';

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

function buildContext(stock?: StockRecord | null): string {
  if (!stock) return 'No specific stock context. Answer general market questions.';

  const fmt = (v: number | null | undefined, suffix = '') =>
    v != null ? `${v.toFixed(1)}${suffix}` : 'N/A';

  const bullish = stock.signals.filter(s => s.direction === 'bullish');
  const bearish = stock.signals.filter(s => s.direction === 'bearish');
  const topSignals = [...stock.signals]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5)
    .map(s => `${s.direction}: ${s.description}`)
    .join('; ');

  return `Stock: ${stock.ticker} (${stock.name}), ${stock.sector}, ${stock.capCategory} Cap, ${stock.market} market.
Price: $${stock.price.toFixed(2)} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(1)}%)
Score: ${stock.score.composite}/100 (Momentum: ${stock.score.priceMomentum}, Technical: ${stock.score.technicalSignals}, Sentiment: ${stock.score.newsSentiment}, Fundamentals: ${stock.score.fundamentals})
P/E: ${fmt(stock.pe)}, Forward P/E: ${fmt(stock.forwardPe)}, PEG: ${fmt(stock.pegRatio)}, P/B: ${fmt(stock.priceToBook)}
RSI: ${fmt(stock.rsi)}, MACD Hist: ${fmt(stock.macdHistogram)}, Beta: ${fmt(stock.beta)}
52W: $${stock.fiftyTwoWeekLow.toFixed(2)}-$${stock.fiftyTwoWeekHigh.toFixed(2)} (at ${stock.fiftyTwoWeekRangePercent}%)
Revenue Growth: ${fmt(stock.revenueGrowth != null ? stock.revenueGrowth * 100 : null, '%')}, Earnings Growth: ${fmt(stock.earningsGrowth != null ? stock.earningsGrowth * 100 : null, '%')}
ROE: ${fmt(stock.returnOnEquity != null ? stock.returnOnEquity * 100 : null, '%')}, D/E: ${fmt(stock.debtToEquity)}
Signals: ${bullish.length} bullish, ${bearish.length} bearish. Key: ${topSignals || 'none'}.
Sector Rank: #${stock.sectorRank}/${stock.sectorCount}`;
}

export interface LLMResponse {
  text: string;
  source: 'llm';
}

export async function queryLLM(
  question: string,
  stock?: StockRecord | null,
  apiKey?: string | null,
): Promise<LLMResponse> {
  const key = apiKey ?? getApiKey();
  if (!key) {
    return {
      text: 'Please set your HuggingFace API key to use AI-powered responses. Click the key icon above the chat.',
      source: 'llm',
    };
  }

  const context = buildContext(stock);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a helpful stock market analysis assistant. Answer concisely and use data when available. Be specific with numbers. Do not give investment advice — present analysis and let the user decide.\n\nContext:\n${context}`,
        },
        { role: 'user', content: question },
      ],
      max_tokens: 500,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      return { text: 'Invalid API key. Please check your HuggingFace API key.', source: 'llm' };
    }
    return { text: `API error (${res.status}): ${body.slice(0, 200)}`, source: 'llm' };
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { text: 'No response from AI model. Please try again.', source: 'llm' };
  }

  return { text: content.trim(), source: 'llm' };
}
