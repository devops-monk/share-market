import { useParams, Link } from 'react-router-dom';
import type { StockRecord, NewsItem } from '../types';
import ScoreGauge from '../components/charts/ScoreGauge';
import PriceChart from '../components/charts/PriceChart';
import SentimentBar from '../components/charts/SentimentBar';
import { MarketTag, CapTag, Trading212Badge, SignalBadge } from '../components/common/Tags';

interface Props {
  stocks: StockRecord[];
  news: NewsItem[];
}

export default function StockDetail({ stocks, news }: Props) {
  const { ticker } = useParams<{ ticker: string }>();
  const stock = stocks.find(s => s.ticker === ticker);

  if (!stock) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">Stock not found: {ticker}</p>
        <Link to="/" className="text-blue-400 hover:text-blue-300">Back to Overview</Link>
      </div>
    );
  }

  const stockNews = news.filter(n => n.ticker === stock.ticker);

  const scoreItems = [
    { label: 'Price Momentum', value: stock.score.priceMomentum },
    { label: 'Technical', value: stock.score.technicalSignals },
    { label: 'Sentiment', value: stock.score.newsSentiment },
    { label: 'Fundamentals', value: stock.score.fundamentals },
    { label: 'Volume', value: stock.score.volumeTrend },
    { label: 'Risk (inv.)', value: stock.score.riskInverse },
  ];

  const formatMcap = (v: number) => {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{stock.ticker}</h1>
            <MarketTag market={stock.market} />
            <CapTag cap={stock.capCategory} />
            {stock.trading212 && <Trading212Badge />}
          </div>
          <p className="text-gray-400">{stock.name} — {stock.sector}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-3xl font-bold">${stock.price.toFixed(2)}</span>
            <span className={`text-lg font-medium ${stock.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <ScoreGauge score={stock.score.composite} size={140} />
      </div>

      {/* Price levels chart */}
      <section className="bg-surface-secondary rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Price Levels</h2>
        <PriceChart stock={stock} />
      </section>

      {/* Score breakdown */}
      <section className="bg-surface-secondary rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Score Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {scoreItems.map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: item.value >= 65 ? '#22c55e' : item.value >= 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key metrics */}
      <section className="bg-surface-secondary rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Metric label="Market Cap" value={formatMcap(stock.marketCap)} />
          <Metric label="P/E" value={stock.pe?.toFixed(1) ?? 'N/A'} />
          <Metric label="Forward P/E" value={stock.forwardPe?.toFixed(1) ?? 'N/A'} />
          <Metric label="Beta" value={stock.beta?.toFixed(2) ?? 'N/A'} />
          <Metric label="RSI" value={stock.rsi?.toFixed(1) ?? 'N/A'} />
          <Metric label="SMA 50" value={stock.sma50?.toFixed(2) ?? 'N/A'} />
          <Metric label="SMA 200" value={stock.sma200?.toFixed(2) ?? 'N/A'} />
          <Metric label="Volume Ratio" value={stock.volumeRatio.toFixed(2) + 'x'} />
          <Metric label="52W High" value={`$${stock.fiftyTwoWeekHigh.toFixed(2)}`} />
          <Metric label="52W Low" value={`$${stock.fiftyTwoWeekLow.toFixed(2)}`} />
          <Metric label="3M Return" value={`${(stock.priceReturn3m * 100).toFixed(1)}%`} />
          <Metric label="6M Return" value={`${(stock.priceReturn6m * 100).toFixed(1)}%`} />
        </div>
      </section>

      {/* Signals */}
      <section className="bg-surface-secondary rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Signals</h2>
        {stock.signals.length === 0 ? (
          <p className="text-gray-500 text-sm">No signals detected</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stock.signals.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <SignalBadge direction={s.direction} type={s.type} />
                <span className="text-xs text-gray-500">{s.description}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* News */}
      {stockNews.length > 0 && (
        <section className="bg-surface-secondary rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Recent News</h2>
          <div className="space-y-2">
            {stockNews.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300 line-clamp-1"
                >
                  {item.title}
                </a>
                <SentimentBar score={item.sentimentScore} />
              </div>
            ))}
          </div>
        </section>
      )}

      <Link to="/" className="inline-block text-sm text-gray-400 hover:text-white">
        ← Back to Overview
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
