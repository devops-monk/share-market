/**
 * N30: AI-Powered Indicator Builder
 * Generates JavaScript filter functions from natural language descriptions
 */
import type { StockRecord } from '../types';
import { getApiKey, getProvider } from './copilot-llm';

/** Reference of all StockRecord fields for the system prompt */
export const STOCK_FIELDS_REFERENCE = `Available fields on each stock object "s" (StockRecord):

BASIC:
  s.ticker: string — Ticker symbol (e.g. "AAPL")
  s.name: string — Company name
  s.sector: string — Sector (e.g. "Technology", "Healthcare")
  s.market: "US" | "UK"
  s.capCategory: "Small" | "Mid" | "Large"

PRICE & VALUATION:
  s.price: number — Current price
  s.changePercent: number — Daily change %
  s.marketCap: number — Market cap in dollars
  s.pe: number | null — Trailing P/E ratio
  s.forwardPe: number | null — Forward P/E ratio
  s.pegRatio: number | null — PEG ratio
  s.priceToBook: number | null — Price to book
  s.dcfValue: number | null — DCF intrinsic value estimate

GROWTH:
  s.earningsGrowth: number | null — Earnings growth (decimal, e.g. 0.25 = 25%)
  s.revenueGrowth: number | null — Revenue growth (decimal)

TECHNICAL:
  s.rsi: number | null — RSI (14-period), 0-100
  s.macdHistogram: number | null — MACD histogram value
  s.sma20: number | null — 20-day SMA
  s.sma50: number | null — 50-day SMA
  s.sma150: number | null — 150-day SMA
  s.sma200: number | null — 200-day SMA
  s.bollingerUpper: number | null — Upper Bollinger Band
  s.bollingerLower: number | null — Lower Bollinger Band
  s.bollingerSqueeze: boolean — Bollinger squeeze active
  s.stochasticK: number | null — Stochastic %K (0-100)
  s.stochasticD: number | null — Stochastic %D (0-100)
  s.adx: number | null — ADX trend strength (0-100)
  s.williamsR: number | null — Williams %R (-100 to 0)
  s.chaikinMoneyFlow: number | null — CMF (-1 to 1)
  s.weightedAlpha: number | null — Weighted alpha %

RETURNS:
  s.priceReturn3m: number — 3-month return %
  s.priceReturn6m: number — 6-month return %
  s.priceReturn1y: number — 1-year return %
  s.yearlyUptrendYears: number — Years of positive annual returns (0-4)

RISK:
  s.beta: number | null — Beta vs market
  s.volatility: number — Annualized volatility
  s.sharpeRatio: number | null — Sharpe ratio
  s.sortinoRatio: number | null — Sortino ratio
  s.maxDrawdown: number | null — Max drawdown (negative %)

FUNDAMENTALS:
  s.grossMargins: number | null — Gross margin (decimal)
  s.operatingMargins: number | null — Operating margin (decimal)
  s.profitMargins: number | null — Profit margin (decimal)
  s.returnOnEquity: number | null — ROE (decimal)
  s.returnOnAssets: number | null — ROA (decimal)
  s.debtToEquity: number | null — Debt-to-equity ratio
  s.currentRatio: number | null — Current ratio
  s.dividendYield: number | null — Dividend yield (decimal)
  s.freeCashflow: number | null — Free cash flow ($)

SCORES & SCREENS:
  s.score.composite: number — Overall score 0-100
  s.score.priceMomentum: number — Momentum score 0-100
  s.score.technicalSignals: number — Technical score 0-100
  s.score.fundamentals: number — Fundamental score 0-100
  s.piotroskiScore: number | null — Piotroski F-Score (0-9)
  s.altmanZScore: number | null — Altman Z-Score
  s.minerviniChecks.passed: number — Minervini checks passed (0-8)
  s.rsPercentile: number — Relative strength percentile (0-100)

52-WEEK:
  s.fiftyTwoWeekHigh: number — 52-week high
  s.fiftyTwoWeekLow: number — 52-week low
  s.fiftyTwoWeekRangePercent: number — Position in 52-week range (0-100)

VOLUME:
  s.volume: number — Current volume
  s.avgVolume: number — Average volume
  s.volumeRatio: number — Volume / avg volume ratio`;

/** Build the system prompt for the LLM */
export function buildIndicatorPrompt(userDescription: string): string {
  return `You are a stock screening code generator. The user describes a filter in plain English. You must output ONLY a JavaScript arrow function that takes a single parameter "s" (a StockRecord object) and returns a boolean (true = stock matches the filter).

RULES:
1. Output ONLY the arrow function, nothing else. No explanation, no markdown.
2. Use the exact field names from the reference below.
3. Always null-check nullable fields before comparing: (s.rsi != null && s.rsi < 30)
4. Use simple JavaScript only — no imports, no external calls.
5. The function must be a single expression or use a block with return.

${STOCK_FIELDS_REFERENCE}

User's filter description: "${userDescription}"

Output the arrow function:`;
}

/** Extract function code from LLM response (strip markdown fences etc.) */
export function parseGeneratedCode(response: string): string {
  let code = response.trim();

  // Strip markdown code fences
  code = code.replace(/^```(?:javascript|js|typescript|ts)?\n?/i, '');
  code = code.replace(/\n?```$/i, '');
  code = code.trim();

  // If wrapped in backticks
  if (code.startsWith('`') && code.endsWith('`')) {
    code = code.slice(1, -1).trim();
  }

  return code;
}

/** Execute the generated filter against all stocks, with safety */
export function executeFilter(
  code: string,
  stocks: StockRecord[],
): { matches: StockRecord[]; error?: string } {
  let filterFn: (s: StockRecord) => boolean;

  try {
    // Create the function safely — only receives 's' parameter
    filterFn = new Function('s', `return (${code})(s)`) as (s: StockRecord) => boolean;
  } catch (e: any) {
    return { matches: [], error: `Invalid function syntax: ${e.message}` };
  }

  const matches: StockRecord[] = [];
  let errorCount = 0;

  for (const stock of stocks) {
    try {
      if (filterFn(stock)) {
        matches.push(stock);
      }
    } catch {
      errorCount++;
      // Skip stocks that cause errors
    }
  }

  const error = errorCount > 0 ? `Filter threw errors on ${errorCount} of ${stocks.length} stocks (skipped)` : undefined;
  return { matches, error };
}

/** Call the LLM to generate a filter function */
export async function generateIndicator(
  description: string,
): Promise<{ code: string; error?: string }> {
  const key = await getApiKey();
  if (!key) {
    return { code: '', error: 'No API key configured. Set one in the Copilot settings.' };
  }

  const providerName = getProvider();

  // Provider config (inline to avoid importing PROVIDERS)
  const providerConfig: Record<string, { url: string; model: string }> = {
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.0-flash' },
    anthropic: { url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514' },
    huggingface: { url: 'https://router.huggingface.co/v1/chat/completions', model: 'Qwen/Qwen2.5-7B-Instruct' },
  };

  const provider = providerConfig[providerName] ?? providerConfig.groq;
  const prompt = buildIndicatorPrompt(description);
  const isAnthropic = providerName === 'anthropic';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let body: string;

  if (isAnthropic) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
    body = JSON.stringify({
      model: provider.model,
      system: 'You are a code generator. Output ONLY valid JavaScript code. No explanations.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.2,
    });
  } else {
    headers['Authorization'] = `Bearer ${key}`;
    body = JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: 'You are a code generator. Output ONLY valid JavaScript code. No explanations.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.2,
    });
  }

  try {
    const res = await fetch(provider.url, { method: 'POST', headers, body });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { code: '', error: `API error (${res.status}): ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    const content = isAnthropic
      ? data.content?.[0]?.text
      : data.choices?.[0]?.message?.content;

    if (!content) {
      return { code: '', error: 'No response from AI model.' };
    }

    return { code: parseGeneratedCode(content) };
  } catch (e: any) {
    return { code: '', error: `Network error: ${e.message}` };
  }
}
