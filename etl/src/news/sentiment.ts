import Sentiment from 'sentiment';
import type { NewsItem } from './google-news.js';
import type { FinvizNews } from './finviz-scraper.js';

const analyzer = new Sentiment();

export interface ScoredNews {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  ticker: string;
  sentimentScore: number; // -1 to 1
  sentimentLabel: 'positive' | 'negative' | 'neutral';
}

function scoreHeadline(title: string): { score: number; label: 'positive' | 'negative' | 'neutral' } {
  const result = analyzer.analyze(title);
  // Normalize to -1..1 range (comparative is already normalized by word count)
  const normalized = Math.max(-1, Math.min(1, result.comparative * 2));
  const label = normalized > 0.1 ? 'positive' : normalized < -0.1 ? 'negative' : 'neutral';
  return { score: normalized, label };
}

export function scoreNewsItems(items: (NewsItem | FinvizNews)[]): ScoredNews[] {
  return items.map(item => {
    const { score, label } = scoreHeadline(item.title);
    return {
      title: item.title,
      link: item.link,
      source: item.source,
      pubDate: item.pubDate,
      ticker: item.ticker,
      sentimentScore: Math.round(score * 1000) / 1000,
      sentimentLabel: label,
    };
  });
}

export function averageSentiment(scored: ScoredNews[]): number {
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, s) => acc + s.sentimentScore, 0);
  return sum / scored.length;
}
