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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">News & Sentiment</h1>
        <p className="text-sm t-muted mt-1">Latest headlines with AFINN sentiment scoring</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="card-flat p-3 text-center">
          <div className="text-lg font-bold font-mono t-primary">{news.length}</div>
          <div className="text-xs t-muted">Total</div>
        </div>
        <div className="card-flat p-3 text-center">
          <div className="text-lg font-bold font-mono text-bullish">{posCount}</div>
          <div className="text-xs t-muted">Positive</div>
        </div>
        <div className="card-flat p-3 text-center">
          <div className="text-lg font-bold font-mono text-bearish">{negCount}</div>
          <div className="text-xs t-muted">Negative</div>
        </div>
        <div className="card-flat p-3 text-center">
          <div className="text-lg font-bold font-mono text-neutral">{neutCount}</div>
          <div className="text-xs t-muted">Neutral</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search headline or ticker..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field w-56"
          />
          <div className="flex gap-1 bg-surface-tertiary rounded-lg p-1">
            {(['all', 'positive', 'negative', 'neutral'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === f ? 'bg-accent/20 text-accent-light' : 't-muted hover:t-secondary'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* News list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <p className="t-muted">No news articles found.</p>
          </div>
        )}
        {filtered.map((item, i) => (
          <div key={i} className="card-flat px-4 py-3 flex items-start gap-4 hover:bg-surface-hover/30 transition-colors">
            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
              item.sentimentLabel === 'positive' ? 'bg-bullish' :
              item.sentimentLabel === 'negative' ? 'bg-bearish' : 'bg-neutral'
            }`} />
            <div className="flex-1 min-w-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm t-secondary hover:text-accent-light transition-colors line-clamp-2 leading-relaxed"
              >
                {item.title}
              </a>
              <div className="flex items-center gap-3 mt-1.5 text-xs t-muted">
                <span className="font-semibold text-accent-light font-mono">{item.ticker}</span>
                <span>{item.source}</span>
                <span>{new Date(item.pubDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex-shrink-0 pt-1">
              <SentimentBar score={item.sentimentScore} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
