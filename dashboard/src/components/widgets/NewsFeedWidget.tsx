import type { NewsItem } from '../../types';

interface Props {
  news: NewsItem[];
}

export default function NewsFeedWidget({ news }: Props) {
  const latest = news.slice(0, 10);

  if (latest.length === 0) {
    return <p className="text-xs t-muted p-2">No news available.</p>;
  }

  return (
    <div className="overflow-auto h-full space-y-1.5 p-1">
      {latest.map((n, i) => (
        <a
          key={i}
          href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-2 rounded-lg hover:bg-surface-hover/50 transition-colors"
        >
          <div className="flex items-start gap-2">
            <span
              className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                n.sentimentLabel === 'positive' ? 'bg-bullish'
                  : n.sentimentLabel === 'negative' ? 'bg-bearish'
                    : 'bg-yellow-500'
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs t-secondary line-clamp-2">{n.title}</p>
              <p className="text-[10px] t-muted mt-0.5">{n.ticker} · {n.source}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
