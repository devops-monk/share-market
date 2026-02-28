import { classifyHeadlines } from './finbert.js';
import { CONFIG } from '../config.js';
import pLimit from 'p-limit';

export interface RedditPost {
  title: string;
  score: number;
  numComments: number;
  url: string;
  created: number;
}

export interface SocialSentiment {
  mentions: number;
  avgSentiment: number;
  topPosts: { title: string; score: number; url: string }[];
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const SUBREDDITS = ['wallstreetbets', 'stocks', 'investing'];
const USER_AGENT = 'StockDashboard/1.0';

async function fetchSubredditPosts(subreddit: string, ticker: string): Promise<RedditPost[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(ticker)}&sort=new&limit=10&t=week&restrict_sr=on`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const children = data?.data?.children;
    if (!Array.isArray(children)) return [];
    return children.map((c: any) => ({
      title: c.data?.title ?? '',
      score: c.data?.score ?? 0,
      numComments: c.data?.num_comments ?? 0,
      url: `https://reddit.com${c.data?.permalink ?? ''}`,
      created: c.data?.created_utc ?? 0,
    }));
  } catch {
    return [];
  }
}

async function fetchRedditPostsForTicker(ticker: string): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];
  for (const sub of SUBREDDITS) {
    const posts = await fetchSubredditPosts(sub, ticker);
    allPosts.push(...posts);
    await delay(CONFIG.redditDelayMs);
  }
  // Deduplicate by title
  const seen = new Set<string>();
  return allPosts.filter(p => {
    if (seen.has(p.title)) return false;
    seen.add(p.title);
    return true;
  });
}

/**
 * Fetch Reddit sentiment for the given tickers.
 * Scores post titles with FinBERT if apiKey is provided.
 * Gracefully handles Reddit blocking/rate-limiting per ticker.
 */
export async function fetchRedditSentiment(
  tickers: string[],
  apiKey?: string,
): Promise<Map<string, SocialSentiment>> {
  console.log(`Fetching Reddit sentiment for ${tickers.length} tickers...`);
  const limit = pLimit(CONFIG.redditConcurrency);
  const results = new Map<string, SocialSentiment>();

  await Promise.all(
    tickers.map(ticker =>
      limit(async () => {
        try {
          const posts = await fetchRedditPostsForTicker(ticker);
          if (posts.length === 0) return;

          // Score titles with FinBERT if available
          let avgSentiment = 0;
          if (apiKey && posts.length > 0) {
            try {
              const scores = await classifyHeadlines(
                posts.map(p => p.title),
                apiKey,
              );
              const valid = scores.filter((s): s is number => s != null);
              avgSentiment = valid.length > 0
                ? valid.reduce((a, b) => a + b, 0) / valid.length
                : 0;
            } catch {
              // FinBERT scoring failed, use 0
            }
          }

          const topPosts = [...posts]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(p => ({ title: p.title, score: p.score, url: p.url }));

          results.set(ticker, {
            mentions: posts.length,
            avgSentiment: +avgSentiment.toFixed(3),
            topPosts,
          });
        } catch {
          // Graceful failure for this ticker
        }
      })
    ),
  );

  console.log(`Reddit sentiment: found data for ${results.size}/${tickers.length} tickers`);
  return results;
}
