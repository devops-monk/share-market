import { useParams, Link } from 'react-router-dom';
import type { StockRecord, NewsItem } from '../types';
import ScoreGauge from '../components/charts/ScoreGauge';
import PriceChart from '../components/charts/PriceChart';
import SentimentBar from '../components/charts/SentimentBar';
import { MarketTag, CapTag, Trading212Badge, SignalBadge, ChangePercent } from '../components/common/Tags';

interface Props {
  stocks: StockRecord[];
  news: NewsItem[];
}

/* ─── TOOLTIP DESCRIPTIONS ─── */
const TOOLTIPS: Record<string, string> = {
  // Score breakdown
  'Momentum': '3-month & 6-month price returns. Higher = price trending up strongly.',
  'Technical': 'RSI, MACD, moving averages, Bollinger & Stochastic readings combined.',
  'Sentiment': 'Average sentiment of recent news headlines. Positive news = higher score.',
  'Fundamentals': 'P/E ratio, earnings growth, revenue growth. Good value = higher score.',
  'Volume': 'Trading volume vs 20-day average. Above-average buying = higher score.',
  'Risk (inv.)': 'Lower beta & volatility = higher score. Penalizes erratic stocks.',
  // Key metrics
  'Market Cap': 'Total company value. Small <$2B, Mid $2B-$10B, Large >$10B.',
  'P/E': 'Price-to-Earnings ratio. Lower = cheaper relative to profits. <15 is value, >30 is growth.',
  'Forward P/E': 'P/E based on estimated future earnings. Lower than P/E = analysts expect growth.',
  'Beta': 'Volatility vs market. 1.0 = moves with market. >1.5 = very volatile. <0.5 = defensive.',
  'RSI': 'Relative Strength Index (0-100). >70 = overbought (may drop). <30 = oversold (may bounce).',
  'SMA 50': '50-day Simple Moving Average. Price above SMA50 = short-term uptrend.',
  'SMA 200': '200-day Simple Moving Average. Price above SMA200 = long-term uptrend.',
  'SMA 20': '20-day Simple Moving Average. Used for Bollinger Bands middle line.',
  'Vol Ratio': 'Today\'s volume / 20-day average. >1.5x = unusual activity. >2x = major event.',
  '52W High': 'Highest price in 52 weeks. Near it = strong performance.',
  '52W Low': 'Lowest price in 52 weeks. Near it = struggling or undervalued.',
  '3M Return': 'Price change over last 3 months. Shows medium-term momentum.',
  '6M Return': 'Price change over last 6 months. Shows longer-term momentum.',
  // Advanced indicators
  'Bollinger Upper': 'Upper Bollinger Band. Price above = potentially overextended.',
  'Bollinger Lower': 'Lower Bollinger Band. Price below = potentially oversold.',
  'BB Bandwidth': 'Band width as % of middle. Low = squeeze (breakout imminent). High = volatile.',
  'BB %B': 'Price position in bands. >0.95 = near upper (bearish). <0.05 = near lower (bullish). 0.5 = middle.',
  'BB Squeeze': 'YES = bands are very narrow, low volatility. A big price move is likely coming soon.',
  'Stochastic %K': 'Fast stochastic line (0-100). >80 = overbought. <20 = oversold.',
  'Stochastic %D': 'Slow signal line. When %K crosses %D = buy/sell signal.',
  'OBV Trend': 'On-Balance Volume trend. Rising = buying pressure. Falling = selling pressure.',
  'OBV Divergence': 'Price and volume moving opposite directions. Bullish = smart money buying. Bearish = smart money selling.',
};

export default function StockDetail({ stocks, news }: Props) {
  const { ticker } = useParams<{ ticker: string }>();
  const stock = stocks.find(s => s.ticker === ticker);

  if (!stock) {
    return (
      <div className="text-center py-20">
        <p className="t-tertiary mb-4">Stock not found: <span className="font-mono t-primary">{ticker}</span></p>
        <Link to="/" className="text-accent-light hover:t-primary transition-colors">Back to Overview</Link>
      </div>
    );
  }

  const stockNews = news.filter(n => n.ticker === stock.ticker);

  const scoreItems = [
    { label: 'Momentum', value: stock.score.priceMomentum },
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

  // Generate recommendation
  const recommendation = generateRecommendation(stock);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/" className="inline-flex items-center gap-1 text-sm t-muted hover:text-accent-light transition-colors">
        ← Back
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold t-primary">{stock.ticker}</h1>
            <MarketTag market={stock.market} />
            <CapTag cap={stock.capCategory} />
            {stock.trading212 && <Trading212Badge />}
          </div>
          <p className="t-tertiary mb-3">{stock.name} — {stock.sector}</p>
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold t-primary font-mono tabular-nums">${stock.price.toFixed(2)}</span>
            <ChangePercent value={stock.changePercent} />
          </div>
        </div>
        <ScoreGauge score={stock.score.composite} size={140} />
      </div>

      {/* Recommendation */}
      <RecommendationCard rec={recommendation} stock={stock} />

      {/* Price levels chart */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Price Levels</h2>
        <PriceChart stock={stock} />
      </div>

      {/* Score breakdown */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Score Breakdown</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {scoreItems.map(item => (
            <div key={item.label} className="group relative flex items-center justify-between gap-2">
              <span className="text-sm t-tertiary cursor-help border-b border-dashed border-surface-border">
                {item.label}
              </span>
              <Tooltip text={TOOLTIPS[item.label] ?? ''} />
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
                <span className="text-sm font-bold font-mono tabular-nums w-8 text-right t-primary">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Key Metrics</h2>
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

      {/* Advanced Indicators */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Advanced Indicators</h2>
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
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Active Signals</h2>
        {stock.signals.length === 0 ? (
          <p className="t-muted text-sm">No signals detected</p>
        ) : (
          <div className="space-y-2">
            {stock.signals.map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <SignalBadge direction={s.direction} type={s.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs t-tertiary">{s.description}</p>
                </div>
                <span className={`text-xs font-mono ${s.severity >= 3 ? 't-primary font-bold' : 't-muted'}`}>
                  Sev {s.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* News */}
      {stockNews.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Recent News</h2>
          <div className="space-y-3">
            {stockNews.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm t-secondary hover:text-accent-light transition-colors line-clamp-1 leading-relaxed"
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

/* ─── TOOLTIP COMPONENT ─── */
function Tooltip({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
      <div className="bg-surface-tertiary border border-surface-border text-xs t-secondary px-3 py-2 rounded-lg shadow-xl max-w-[250px] leading-relaxed">
        {text}
      </div>
    </div>
  );
}

/* ─── METRIC WITH TOOLTIP ─── */
function Metric({ label, value, highlight, positive }: {
  label: string; value: string; highlight?: boolean; positive?: boolean;
}) {
  let valueColor = 't-primary';
  if (highlight) valueColor = 'text-neutral';
  if (positive !== undefined) valueColor = positive ? 'text-bullish' : 'text-bearish';

  const tip = TOOLTIPS[label];

  return (
    <div className="group relative">
      <p className={`text-xs t-muted mb-1 ${tip ? 'cursor-help border-b border-dashed border-surface-border inline-block' : ''}`}>
        {label}
      </p>
      {tip && <Tooltip text={tip} />}
      <p className={`font-semibold font-mono tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

/* ─── RECOMMENDATION ENGINE ─── */
interface Recommendation {
  verdict: 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid';
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  summary: string;
  strengths: string[];
  risks: string[];
}

function generateRecommendation(stock: StockRecord): Recommendation {
  const s = stock.score;
  const composite = s.composite;

  const strengths: string[] = [];
  const risks: string[] = [];

  // Analyze each score component
  if (s.priceMomentum >= 65) strengths.push('Strong price momentum — stock is trending up');
  else if (s.priceMomentum < 35) risks.push('Weak price momentum — price has been declining');

  if (s.technicalSignals >= 65) strengths.push('Technical indicators are bullish');
  else if (s.technicalSignals < 35) risks.push('Technical indicators are bearish');

  if (s.newsSentiment >= 60) strengths.push('Positive news sentiment');
  else if (s.newsSentiment < 35) risks.push('Negative news coverage');

  if (s.fundamentals >= 65) strengths.push('Strong fundamentals (good P/E, earnings growth)');
  else if (s.fundamentals < 35) risks.push('Weak fundamentals');

  if (s.volumeTrend >= 60) strengths.push('Volume confirms the price action');
  else if (s.volumeTrend < 30) risks.push('Low volume — price moves may not be sustainable');

  if (s.riskInverse >= 60) strengths.push('Low risk profile (stable, low volatility)');
  else if (s.riskInverse < 30) risks.push('High risk — volatile stock with high beta');

  // Check specific indicators
  if (stock.rsi != null && stock.rsi > 70) risks.push(`RSI at ${stock.rsi.toFixed(0)} — overbought, may pull back`);
  if (stock.rsi != null && stock.rsi < 30) strengths.push(`RSI at ${stock.rsi.toFixed(0)} — oversold, potential bounce`);

  if (stock.obvDivergence === 'bearish') risks.push('OBV bearish divergence — smart money may be selling');
  if (stock.obvDivergence === 'bullish') strengths.push('OBV bullish divergence — smart money accumulating');

  if (stock.bollingerSqueeze) strengths.push('Bollinger Band squeeze — breakout imminent');

  if (stock.bearishScore >= 6) risks.push(`High bearish score (${stock.bearishScore}) — multiple warning signals`);
  else if (stock.bearishScore >= 4) risks.push(`Moderate bearish score (${stock.bearishScore})`);

  if (stock.bullishScore >= 6) strengths.push(`High bullish score (${stock.bullishScore}) — multiple positive signals`);

  // Determine verdict
  let verdict: Recommendation['verdict'];
  let label: string;
  let color: string;
  let bgColor: string;
  let borderColor: string;
  let summary: string;

  if (composite >= 70 && stock.bearishScore < 4 && strengths.length >= 3) {
    verdict = 'strong-buy';
    label = 'Strong Opportunity';
    color = 'text-bullish';
    bgColor = 'bg-bullish/8';
    borderColor = 'border-bullish/25';
    summary = 'Multiple indicators align positively. This stock shows strong momentum, good technicals, and manageable risk. Consider adding to your watchlist.';
  } else if (composite >= 55 && stock.bearishScore < 5) {
    verdict = 'buy';
    label = 'Looks Promising';
    color = 'text-emerald-400';
    bgColor = 'bg-emerald-500/5';
    borderColor = 'border-emerald-500/20';
    summary = 'Overall indicators are positive with some areas to watch. Do additional research on the weaker areas before committing.';
  } else if (composite >= 40 && stock.bearishScore < 6) {
    verdict = 'hold';
    label = 'Mixed Signals — Hold / Wait';
    color = 'text-neutral';
    bgColor = 'bg-neutral/8';
    borderColor = 'border-neutral/25';
    summary = 'Indicators are mixed. Some components look good but others don\'t. If you own this stock, hold. If not, wait for clearer signals before entering.';
  } else if (composite >= 25 || stock.bearishScore >= 5) {
    verdict = 'caution';
    label = 'Caution — Risky Area';
    color = 'text-amber-400';
    bgColor = 'bg-amber-500/5';
    borderColor = 'border-amber-500/20';
    summary = 'Several indicators are negative. This stock is showing signs of weakness. If you own it, consider reducing your position. Not recommended for new entries.';
  } else {
    verdict = 'avoid';
    label = 'Avoid — High Risk';
    color = 'text-bearish';
    bgColor = 'bg-bearish/8';
    borderColor = 'border-bearish/25';
    summary = 'Most indicators are negative. This stock has significant risk factors. Avoid new positions and consider exiting existing ones.';
  }

  return { verdict, label, color, bgColor, borderColor, summary, strengths: strengths.slice(0, 5), risks: risks.slice(0, 5) };
}

function RecommendationCard({ rec, stock }: { rec: Recommendation; stock: StockRecord }) {
  return (
    <div className={`card p-5 ${rec.bgColor} border ${rec.borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Analysis Summary</h2>
          <span className={`text-sm font-bold ${rec.color}`}>{rec.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs t-muted">
          <span>Bullish: <strong className="text-bullish">{stock.bullishScore}</strong></span>
          <span className="t-faint">|</span>
          <span>Bearish: <strong className="text-bearish">{stock.bearishScore}</strong></span>
        </div>
      </div>

      <p className="text-sm t-secondary leading-relaxed mb-4">{rec.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        {rec.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-bullish mb-2">Strengths</p>
            <ul className="space-y-1.5">
              {rec.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs t-tertiary">
                  <span className="text-bullish mt-0.5 flex-shrink-0">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {rec.risks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-bearish mb-2">Risks</p>
            <ul className="space-y-1.5">
              {rec.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs t-tertiary">
                  <span className="text-bearish mt-0.5 flex-shrink-0">-</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-xs t-faint mt-4 italic">
        This is an automated analysis based on technical indicators and scores. Always do your own research before investing.
      </p>
    </div>
  );
}
