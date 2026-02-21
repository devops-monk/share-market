import { useState, useMemo } from 'react';
import type { NewsItem } from '../types';
import SentimentBar from '../components/charts/SentimentBar';

export default function NewsSentiment({ news }: { news: NewsItem[] }) {
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return news.filter(n => {
      if (filter !== 'all' && n.sentimentLabel !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.ticker.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [news, filter, search]);

  const posCount = news.filter(n => n.sentimentLabel === 'positive').length;
  const negCount = news.filter(n => n.sentimentLabel === 'negative').length;
  const neutCount = news.filter(n => n.sentimentLabel === 'neutral').length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">News & Sentiment</h1>

      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">{news.length} articles</span>
        <span className="text-bullish">{posCount} positive</span>
        <span className="text-bearish">{negCount} negative</span>
        <span className="text-neutral">{neutCount} neutral</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search headline or ticker..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-surface-secondary border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 w-56"
        />
        {(['all', 'positive', 'negative', 'neutral'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-sm ${
              filter === f ? 'bg-surface-tertiary text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* News list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-center py-8">No news articles found.</p>
        )}
        {filtered.map((item, i) => (
          <div key={i} className="bg-surface-secondary rounded-lg p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 line-clamp-2"
              >
                {item.title}
              </a>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="font-medium text-gray-300">{item.ticker}</span>
                <span>{item.source}</span>
                <span>{new Date(item.pubDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <SentimentBar score={item.sentimentScore} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
