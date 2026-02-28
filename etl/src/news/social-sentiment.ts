import { CONFIG } from '../config.js';

export interface SocialSentiment {
  mentions: number;
  upvotes: number;
  rank: number | null;
  mentionChange: number | null;  // mentions vs 24h ago (ratio)
  topPosts: { title: string; score: number; url: string }[];
  avgSentiment: number;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

interface ApeWisdomResult {
  rank: number;
  ticker: string;
  name: string;
  mentions: number;
  upvotes: number;
  rank_24h_ago: number;
  mentions_24h_ago: number;
}

/**
 * Fetch social sentiment from ApeWisdom API.
 * ApeWisdom aggregates Reddit mentions from r/wallstreetbets, r/stocks,
 * r/investing, r/options, etc. Free, no auth required.
 */
export async function fetchSocialSentiment(
  tickers: string[],
  _apiKey?: string,
): Promise<Map<string, SocialSentiment>> {
  console.log('Fetching social sentiment from ApeWisdom...');
  const results = new Map<string, SocialSentiment>();
  const tickerSet = new Set(tickers);

  try {
    // Fetch all pages (100 results per page, typically ~10 pages)
    const allResults: ApeWisdomResult[] = [];
    for (let page = 1; page <= 12; page++) {
      const res = await fetch(`https://apewisdom.io/api/v1.0/filter/all-stocks/page/${page}`, {
        headers: { 'User-Agent': 'StockDashboard/1.0' },
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.results || data.results.length === 0) break;
      allResults.push(...data.results);
      if (page >= data.pages) break;
      await delay(CONFIG.socialDelayMs);
    }

    console.log(`ApeWisdom: fetched ${allResults.length} trending tickers`);

    for (const item of allResults) {
      if (!tickerSet.has(item.ticker)) continue;

      // Compute mention change ratio
      const mentionChange = item.mentions_24h_ago > 0
        ? +((item.mentions / item.mentions_24h_ago)).toFixed(2)
        : null;

      // Simple sentiment heuristic based on upvote ratio and mention momentum
      // More upvotes per mention = more positive engagement
      const upvoteRatio = item.mentions > 0 ? item.upvotes / item.mentions : 0;
      const avgSentiment = upvoteRatio > 10 ? 0.3 : upvoteRatio > 5 ? 0.1 : upvoteRatio > 2 ? 0 : -0.1;

      results.set(item.ticker, {
        mentions: item.mentions,
        upvotes: item.upvotes,
        rank: item.rank,
        mentionChange,
        topPosts: [],  // ApeWisdom doesn't provide individual posts
        avgSentiment: +avgSentiment.toFixed(3),
      });
    }
  } catch (err) {
    console.warn('ApeWisdom fetch failed:', (err as Error).message);
  }

  console.log(`Social sentiment: matched ${results.size}/${tickers.length} tickers`);
  return results;
}
