import { useParams, Link } from 'react-router-dom';
import type { StockRecord, NewsItem } from '../types';
import ScoreGauge from '../components/charts/ScoreGauge';
import PriceChart from '../components/charts/PriceChart';
import SentimentBar from '../components/charts/SentimentBar';
import { MarketTag, CapTag, Trading212Badge, SignalBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';

interface Props {
  stocks: StockRecord[];
  news: NewsItem[];
}

export default function StockDetail({ stocks, news }: Props) {
  const { ticker } = useParams<{ ticker: string }>();
  const stock = stocks.find(s => s.ticker === ticker);

  if (!stock) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-gray-400 mb-4">Stock not found: <span className="font-mono text-white">{ticker}</span></p>
        <Link to="/" className="text-accent-light hover:text-white transition-colors">Back to Overview</Link>
      </div>
    );
  }

  const stockNews = news.filter(n => n.ticker === stock.ticker);

  const scoreItems = [
    { label: 'Momentum', value: stock.score.priceMomentum, icon: '📈' },
    { label: 'Technical', value: stock.score.technicalSignals, icon: '📊' },
    { label: 'Sentiment', value: stock.score.newsSentiment, icon: '📰' },
    { label: 'Fundamentals', value: stock.score.fundamentals, icon: '💰' },
    { label: 'Volume', value: stock.score.volumeTrend, icon: '📶' },
    { label: 'Risk (inv.)', value: stock.score.riskInverse, icon: '🛡️' },
  ];

  const formatMcap = (v: number) => {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent-light transition-colors">
        ← Back
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{stock.ticker}</h1>
            <MarketTag market={stock.market} />
            <CapTag cap={stock.capCategory} />
            {stock.trading212 && <Trading212Badge />}
          </div>
          <p className="text-gray-400 mb-3">{stock.name} — {stock.sector}</p>
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold text-white font-mono tabular-nums">${stock.price.toFixed(2)}</span>
            <ChangePercent value={stock.changePercent} />
          </div>
        </div>
        <ScoreGauge score={stock.score.composite} size={140} />
      </div>

      {/* Price levels chart */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Price Levels</h2>
        <PriceChart stock={stock} />
      </div>

      {/* Score breakdown */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Score Breakdown</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {scoreItems.map(item => (
            <div key={item.label} className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-400">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-surface-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: item.value >= 65 ? '#10b981' : item.value >= 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-sm font-bold font-mono tabular-nums w-8 text-right text-white">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <Metric label="Market Cap" value={formatMcap(stock.marketCap)} />
          <Metric label="P/E" value={stock.pe?.toFixed(1) ?? 'N/A'} />
          <Metric label="Forward P/E" value={stock.forwardPe?.toFixed(1) ?? 'N/A'} />
          <Metric label="Beta" value={stock.beta?.toFixed(2) ?? 'N/A'} />
          <Metric label="RSI" value={stock.rsi?.toFixed(1) ?? 'N/A'} highlight={stock.rsi != null && (stock.rsi > 70 || stock.rsi < 30)} />
          <Metric label="SMA 50" value={stock.sma50?.toFixed(2) ?? 'N/A'} />
          <Metric label="SMA 200" value={stock.sma200?.toFixed(2) ?? 'N/A'} />
          <Metric label="SMA 20" value={stock.sma20?.toFixed(2) ?? 'N/A'} />
          <Metric label="Vol Ratio" value={stock.volumeRatio.toFixed(2) + 'x'} />
          <Metric label="52W High" value={`$${stock.fiftyTwoWeekHigh.toFixed(2)}`} />
          <Metric label="52W Low" value={`$${stock.fiftyTwoWeekLow.toFixed(2)}`} />
          <Metric label="3M Return" value={`${(stock.priceReturn3m * 100).toFixed(1)}%`} positive={stock.priceReturn3m >= 0} />
          <Metric label="6M Return" value={`${(stock.priceReturn6m * 100).toFixed(1)}%`} positive={stock.priceReturn6m >= 0} />
        </div>
      </div>

      {/* Bollinger Bands & Stochastic */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Advanced Indicators</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <Metric label="Bollinger Upper" value={stock.bollingerUpper?.toFixed(2) ?? 'N/A'} />
          <Metric label="Bollinger Lower" value={stock.bollingerLower?.toFixed(2) ?? 'N/A'} />
          <Metric label="BB Bandwidth" value={stock.bollingerBandwidth != null ? `${(stock.bollingerBandwidth * 100).toFixed(1)}%` : 'N/A'} />
          <Metric label="BB %B" value={stock.bollingerPercentB?.toFixed(2) ?? 'N/A'} highlight={stock.bollingerPercentB != null && (stock.bollingerPercentB > 0.95 || stock.bollingerPercentB < 0.05)} />
          <Metric label="BB Squeeze" value={stock.bollingerSqueeze ? 'YES' : 'No'} highlight={stock.bollingerSqueeze} />
          <Metric label="Stochastic %K" value={stock.stochasticK?.toFixed(1) ?? 'N/A'} highlight={stock.stochasticK != null && (stock.stochasticK > 80 || stock.stochasticK < 20)} />
          <Metric label="Stochastic %D" value={stock.stochasticD?.toFixed(1) ?? 'N/A'} />
          <Metric label="OBV Trend" value={stock.obvTrend ?? 'N/A'} positive={stock.obvTrend === 'rising' ? true : stock.obvTrend === 'falling' ? false : undefined} />
          {stock.obvDivergence && (
            <Metric label="OBV Divergence" value={stock.obvDivergence} positive={stock.obvDivergence === 'bullish'} />
          )}
        </div>
      </div>

      {/* Signals */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Active Signals</h2>
        {stock.signals.length === 0 ? (
          <p className="text-gray-500 text-sm">No signals detected</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stock.signals.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <SignalBadge direction={s.direction} type={s.type} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* News */}
      {stockNews.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recent News</h2>
          <div className="space-y-3">
            {stockNews.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-300 hover:text-accent-light transition-colors line-clamp-1 leading-relaxed"
                >
                  {item.title}
                </a>
                <SentimentBar score={item.sentimentScore} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, highlight, positive }: {
  label: string; value: string; highlight?: boolean; positive?: boolean;
}) {
  let valueColor = 'text-white';
  if (highlight) valueColor = 'text-neutral';
  if (positive !== undefined) valueColor = positive ? 'text-bullish' : 'text-bearish';

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-semibold font-mono tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}
