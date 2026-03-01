import type { StockRecord } from '../types';

const PROVIDERS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    label: 'Groq',
    hint: 'gsk_...',
    site: 'console.groq.com — free',
    free: true,
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'OpenRouter',
    hint: 'sk-or-...',
    site: 'openrouter.ai — free tier',
    free: true,
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    label: 'OpenAI',
    hint: 'sk-...',
    site: 'platform.openai.com',
    free: false,
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.0-flash',
    label: 'Gemini',
    hint: 'AI...',
    site: 'aistudio.google.com — free tier',
    free: true,
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    label: 'Claude',
    hint: 'sk-ant-...',
    site: 'console.anthropic.com',
    free: false,
  },
  huggingface: {
    url: 'https://router.huggingface.co/v1/chat/completions',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    label: 'HuggingFace',
    hint: 'hf_...',
    site: 'huggingface.co',
    free: true,
  },
} as const;

export type ProviderName = keyof typeof PROVIDERS;

const API_KEY_STORAGE = 'sm-llm-api-key';
const PROVIDER_STORAGE = 'sm-llm-provider';

export function getProviders() {
  return Object.entries(PROVIDERS).map(([key, val]) => ({
    key: key as ProviderName,
    label: val.label,
    hint: val.hint,
    site: val.site,
    free: val.free,
  }));
}

export function getProvider(): ProviderName {
  return (localStorage.getItem(PROVIDER_STORAGE) as ProviderName) || 'groq';
}

export function setProvider(provider: ProviderName): void {
  localStorage.setItem(PROVIDER_STORAGE, provider);
}

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

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface LLMResponse {
  text: string;
  source: 'llm';
}

/** Keep conversation history to a reasonable size to avoid token limits */
function trimHistory(history: ChatMessage[], maxTurns = 10): ChatMessage[] {
  if (history.length <= maxTurns * 2) return history;
  return history.slice(-(maxTurns * 2));
}

export async function queryLLM(
  question: string,
  stock?: StockRecord | null,
  apiKey?: string | null,
  history?: ChatMessage[],
): Promise<LLMResponse> {
  const key = apiKey ?? getApiKey();
  if (!key) {
    return {
      text: 'Please set your API key to use AI-powered responses. Click the key icon above the chat. Groq offers a free API key at console.groq.com.',
      source: 'llm',
    };
  }

  const providerName = getProvider();
  const provider = PROVIDERS[providerName];
  const context = buildContext(stock);
  const systemPrompt = `You are a helpful stock market analysis assistant. Answer concisely and use data when available. Be specific with numbers. Do not give investment advice — present analysis and let the user decide.\n\nContext:\n${context}`;

  // Build conversation messages from history
  const trimmed = trimHistory(history ?? []);
  const chatMessages = trimmed.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.text,
  }));
  chatMessages.push({ role: 'user', content: question });

  // Anthropic uses a different API format
  const isAnthropic = providerName === 'anthropic';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let body: string;

  if (isAnthropic) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
    body = JSON.stringify({
      model: provider.model,
      system: systemPrompt,
      messages: chatMessages,
      max_tokens: 500,
      temperature: 0.5,
    });
  } else {
    headers['Authorization'] = `Bearer ${key}`;
    body = JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatMessages,
      ],
      max_tokens: 500,
      temperature: 0.5,
    });
  }

  const res = await fetch(provider.url, { method: 'POST', headers, body });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      return { text: `Invalid API key for ${provider.label}. Please check your key.`, source: 'llm' };
    }
    if (res.status === 402) {
      return { text: `${provider.label} credits depleted. Try switching to a free provider (Groq, OpenRouter, Gemini) in the key settings.`, source: 'llm' };
    }
    return { text: `API error (${res.status}): ${errBody.slice(0, 200)}`, source: 'llm' };
  }

  const data = await res.json();
  const content = isAnthropic
    ? data.content?.[0]?.text
    : data.choices?.[0]?.message?.content;
  if (!content) {
    return { text: 'No response from AI model. Please try again.', source: 'llm' };
  }

  return { text: content.trim(), source: 'llm' };
}
