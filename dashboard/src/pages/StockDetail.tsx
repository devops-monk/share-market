import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useParams, Link } from 'react-router-dom';
import type { StockRecord, NewsItem, InsiderTradesMap } from '../types';
import ScoreGauge from '../components/charts/ScoreGauge';
import ScoreRadarChart from '../components/charts/ScoreRadarChart';
import PriceChart from '../components/charts/PriceChart';
import CandlestickChart from '../components/charts/CandlestickChart';
import SentimentBar from '../components/charts/SentimentBar';
import ScoreHistoryChart from '../components/charts/ScoreHistoryChart';
import { MarketTag, CapTag, Trading212Badge, SignalBadge, ChangePercent } from '../components/common/Tags';
import FinancialsBarChart from '../components/charts/FinancialsBarChart';
import { generateStockSummary } from '../lib/stock-summary';
import type { FinancialsMap } from '../hooks/useStockData';

interface Props {
  stocks: StockRecord[];
  news: NewsItem[];
  financials?: FinancialsMap | null;
  insiderTrades?: InsiderTradesMap | null;
  aiResearchNotes?: Record<string, string[]> | null;
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
  'PEG Ratio': 'P/E divided by growth rate. <1 = undervalued, <0.5 = strong buy, >2 = overpriced (Peter Lynch).',
  'P/B': 'Price-to-Book ratio. <1.5 preferred by Graham. <1 may indicate deep value.',
  'Beta': 'Volatility vs market. 1.0 = moves with market. >1.5 = very volatile. <0.5 = defensive.',
  'RSI': 'Relative Strength Index (0-100). >70 = overbought (may drop). <30 = oversold (may bounce).',
  'RS Percentile': 'Relative Strength ranking vs all stocks (1-99). >80 = top performer. Used by CAN SLIM & Minervini.',
  'SMA 50': '50-day Simple Moving Average. Price above SMA50 = short-term uptrend.',
  'SMA 150': '150-day SMA. Key level in Minervini trend template.',
  'SMA 200': '200-day Simple Moving Average. Price above SMA200 = long-term uptrend.',
  'SMA 20': '20-day Simple Moving Average. Used for Bollinger Bands middle line.',
  'Vol Ratio': 'Today\'s volume / 20-day average. >1.5x = unusual activity. >2x = major event.',
  '52W High': 'Highest price in 52 weeks. Near it = strong performance.',
  '52W Low': 'Lowest price in 52 weeks. Near it = struggling or undervalued.',
  '52W Range': 'Position in 52-week range (0-100%). Higher = closer to 52W high.',
  '3M Return': 'Price change over last 3 months. Shows medium-term momentum.',
  '6M Return': 'Price change over last 6 months. Shows longer-term momentum.',
  '1Y Return': 'Price change over last 12 months. Shows long-term momentum.',
  'Wtd Alpha': 'Exponentially-weighted 1-year return. Recent price action weighted more heavily than older data.',
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
  'Acc/Dist': 'Accumulation/Distribution rating (A-E). A/B = institutional buying. D/E = institutional selling.',
  // Fundamentals
  'ROE': 'Return on Equity. >20% = excellent (Buffett). Measures profitability vs shareholders\' equity.',
  'ROA': 'Return on Assets. Measures how efficiently assets generate profit.',
  'Gross Margin': 'Revenue minus cost of goods. >40% suggests durable competitive advantage (Buffett).',
  'Op. Margin': 'Operating profit margin. Higher = more efficient operations.',
  'Profit Margin': 'Net profit margin. >20% = highly profitable company.',
  'D/E Ratio': 'Debt-to-Equity ratio. <33% preferred (Lynch). <100% is healthy.',
  'Current Ratio': 'Current assets / liabilities. >2 preferred (Graham). >1 = can pay short-term debts.',
  'Div. Yield': 'Annual dividend as % of price. Higher = more income.',
  'EPS (TTM)': 'Earnings per share, trailing 12 months.',
  'Free Cash Flow': 'Cash generated after capital expenditures. Positive = healthy business.',
  'EV': 'Enterprise Value = Market Cap + Debt - Cash. Debt-adjusted valuation.',
  'EBITDA': 'Earnings Before Interest, Taxes, Depreciation & Amortization.',
  'Analyst Target': 'Average analyst price target. Compare to current price for upside/downside.',
  'Insider Own.': 'Percentage owned by company insiders. Higher = aligned interests.',
  'Inst. Own.': 'Percentage owned by institutions. 3-10 quality institutions preferred (CAN SLIM).',
  'Short Float': 'Percentage of float sold short. >20% = high bearish bets or potential squeeze.',
  'Style': 'Value (low P/E, slow growth), Growth (high P/E, fast growth), or Blend.',
  'Data Quality': 'Percentage of fundamental metrics available. Higher = more reliable analysis.',
};

export default function StockDetail({ stocks, news, financials, insiderTrades, aiResearchNotes }: Props) {
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

  const cur = stock.market === 'UK' ? '£' : '$';

  const formatMcap = (v: number) => {
    if (v === 0) return 'N/A';
    const sym = stock.market === 'UK' ? '£' : '$';
    if (v >= 1e12) return `${sym}${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `${sym}${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${sym}${(v / 1e6).toFixed(0)}M`;
    return `${sym}${v.toLocaleString()}`;
  };

  // Generate recommendation
  const recommendation = generateRecommendation(stock);
  const aiNotes = aiResearchNotes?.[stock.ticker];
  const aiSummary = useMemo(() => aiNotes ?? generateStockSummary(stock), [stock, aiNotes]);
  const isAiGenerated = !!aiNotes;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="t-muted hover:text-accent-light transition-colors">Home</Link>
        <span className="t-faint">/</span>
        <Link to="/screener" className="t-muted hover:text-accent-light transition-colors">Screener</Link>
        <span className="t-faint">/</span>
        <span className="t-primary font-medium">{stock.ticker}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold t-primary">{stock.ticker}</h1>
              <MarketTag market={stock.market} />
              <CapTag cap={stock.capCategory} />
              {stock.trading212 && <Trading212Badge />}
            </div>
            <p className="t-tertiary text-sm mb-4">{stock.name} — {stock.sector}</p>
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold t-primary font-mono tabular-nums">{cur}{stock.price.toFixed(2)}</span>
              <ChangePercent value={stock.changePercent} />
            </div>
          </div>
          <ScoreGauge score={stock.score.composite} size={120} />
        </div>
      </div>

      {/* Recommendation */}
      <RecommendationCard rec={recommendation} stock={stock} />

      {/* AI Stock Summary */}
      <AiSummaryCard paragraphs={aiSummary} isAiGenerated={isAiGenerated} />

      {/* Candlestick Chart */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Price Chart</h2>
        <CandlestickChart
          ticker={stock.ticker}
          sma50={stock.sma50}
          sma150={stock.sma150}
          sma200={stock.sma200}
        />
        <details className="mt-4 group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs font-medium t-muted select-none">
            <span className="text-[10px] group-open:rotate-90 transition-transform">&#9654;</span>
            How to read this chart
          </summary>
          <div className="mt-3 text-xs t-muted space-y-2 leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-surface-tertiary/50 border border-surface-border">
                <p className="font-semibold t-secondary mb-1">Candlestick Basics</p>
                <p>Each candle = one trading day. <span className="text-bullish font-medium">Green</span> = closed higher than open (bullish). <span className="text-bearish font-medium">Red</span> = closed lower (bearish). Thin wicks show the day's high and low.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-tertiary/50 border border-surface-border">
                <p className="font-semibold t-secondary mb-1">Volume Bars</p>
                <p>Bars at the bottom = trading volume. High volume on green candles = strong buying conviction. High volume on red candles = heavy selling pressure. Price rising on low volume = weak move, be cautious.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-tertiary/50 border border-surface-border">
                <p className="font-semibold t-secondary mb-1">Moving Averages (SMA)</p>
                <p><span className="text-accent-light font-medium">SMA 50</span> (short-term), <span className="text-sky-400 font-medium">SMA 150</span> (medium), <span className="text-neutral-light font-medium">SMA 200</span> (long-term). Price above all three = strong uptrend. SMA 50 crossing above SMA 200 = "Golden Cross" (bullish signal).</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-tertiary/50 border border-surface-border">
                <p className="font-semibold t-secondary mb-1">Key Patterns</p>
                <p><strong>Hammer</strong> (long lower wick) at support = potential bounce. <strong>Engulfing</strong> (big candle swallowing previous) = momentum shift. <strong>Doji</strong> (tiny body) = indecision, wait for next candle.</p>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-bullish/5 border border-bullish/15">
              <p className="font-semibold t-secondary mb-1.5">How to Use This Chart for Buy/Sell Decisions</p>
              <ul className="list-disc list-inside space-y-1 ml-0.5">
                <li><strong className="t-secondary">Before buying:</strong> Switch to 3Y view to check the long-term trend. Is the stock making higher highs and higher lows? If yes, the trend is your friend.</li>
                <li><strong className="t-secondary">Finding entry points:</strong> Look for price pulling back to the SMA 50 (blue line) or SMA 200 (amber line) on the 1Y view. A bounce off these levels with a green candle + above-average volume = good entry.</li>
                <li><strong className="t-secondary">Confirm with Support/Resistance:</strong> Check the Support &amp; Resistance section below. If price is near a strong support level AND showing a green candle, that's a higher-confidence buy.</li>
                <li><strong className="t-secondary">When to be cautious:</strong> Multiple large red candles with high volume = selling pressure. Price dropping below SMA 200 = long-term trend may be breaking. Avoid catching falling knives.</li>
                <li><strong className="t-secondary">Setting stops:</strong> Place your stop-loss just below the nearest support level or below the SMA 200. This limits your downside if the trade goes wrong.</li>
                <li><strong className="t-secondary">Taking profits:</strong> Consider selling portions near resistance levels shown below. If price hits resistance and forms red candles with high volume, the rally may be stalling.</li>
              </ul>
            </div>
          </div>
        </details>
      </div>

      {/* Support & Resistance Levels */}
      {stock.supportResistance && stock.supportResistance.length > 0 && (
        <SupportResistanceCard levels={stock.supportResistance} currentPrice={stock.price} currency={cur} />
      )}

      {/* Price levels (static fallback) */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Price Levels</h2>
        <PriceChart stock={stock} />
      </div>

      {/* Score breakdown */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Score Breakdown</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">
          The composite score (0-100) is built from 6 sub-scores shown below. Each bar represents how strong that dimension is.
          <strong className="t-secondary"> Green (65+)</strong> = strong,
          <strong className="text-neutral"> Amber (40-64)</strong> = average,
          <strong className="text-bearish"> Red (&lt;40)</strong> = weak.
          The radar chart shows the same data visually — a bigger shape means a healthier stock. Look for lopsided shapes to spot weaknesses quickly.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="flex items-center justify-center">
            <ScoreRadarChart score={stock.score} />
          </div>
          {/* Bar breakdown */}
          <div className="space-y-4 flex flex-col justify-center">
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
                        backgroundColor: item.value >= 65 ? 'var(--chart-bullish, #16a34a)' : item.value >= 40 ? 'var(--chart-neutral, #d97706)' : 'var(--chart-bearish, #dc2626)',
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold font-mono tabular-nums w-8 text-right t-primary">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score History */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Score History</h2>
        <ScoreHistoryChart ticker={stock.ticker} />
      </div>

      {/* Key metrics */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Key Metrics</h2>
          <div className="flex items-center gap-2">
            <span className={`badge text-xs ${stock.styleClassification === 'Growth' ? 'bg-accent/15 text-accent-light' : stock.styleClassification === 'Value' ? 'bg-bullish/15 text-bullish' : 'bg-neutral/15 text-neutral'}`}>
              {stock.styleClassification}
            </span>
            <span className={`badge text-xs ${stock.dataCompleteness >= 80 ? 'bg-bullish/15 text-bullish' : stock.dataCompleteness >= 50 ? 'bg-neutral/15 text-neutral' : 'bg-bearish/15 text-bearish'}`}>
              {stock.dataCompleteness}% data
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <Metric label="Market Cap" value={formatMcap(stock.marketCap)} />
          <Metric label="P/E" value={stock.pe?.toFixed(1) ?? 'N/A'} />
          <Metric label="Forward P/E" value={stock.forwardPe?.toFixed(1) ?? 'N/A'} />
          <Metric label="PEG Ratio" value={stock.pegRatio?.toFixed(2) ?? 'N/A'} positive={stock.pegRatio != null ? stock.pegRatio < 1 : undefined} />
          <Metric label="P/B" value={stock.priceToBook?.toFixed(2) ?? 'N/A'} />
          <Metric label="Beta" value={stock.beta?.toFixed(2) ?? 'N/A'} />
          <Metric label="RSI" value={stock.rsi?.toFixed(1) ?? 'N/A'} highlight={stock.rsi != null && (stock.rsi > 70 || stock.rsi < 30)} />
          <Metric label="RS Percentile" value={`${stock.rsPercentile}`} positive={stock.rsPercentile >= 70 ? true : stock.rsPercentile < 30 ? false : undefined} />
          <Metric label="SMA 50" value={stock.sma50?.toFixed(2) ?? 'N/A'} />
          <Metric label="SMA 150" value={stock.sma150?.toFixed(2) ?? 'N/A'} />
          <Metric label="SMA 200" value={stock.sma200?.toFixed(2) ?? 'N/A'} />
          <Metric label="SMA 20" value={stock.sma20?.toFixed(2) ?? 'N/A'} />
          <Metric label="Vol Ratio" value={stock.volumeRatio != null ? stock.volumeRatio.toFixed(2) + 'x' : 'N/A'} />
          <Metric label="Acc/Dist" value={stock.accDistRating} positive={stock.accDistRating <= 'B' ? true : stock.accDistRating >= 'D' ? false : undefined} />
          <Metric label="52W High" value={stock.fiftyTwoWeekHigh ? `${cur}${stock.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A'} />
          <Metric label="52W Low" value={stock.fiftyTwoWeekLow ? `${cur}${stock.fiftyTwoWeekLow.toFixed(2)}` : 'N/A'} />
          <Metric label="52W Range" value={`${stock.fiftyTwoWeekRangePercent}%`} positive={stock.fiftyTwoWeekRangePercent >= 70 ? true : stock.fiftyTwoWeekRangePercent < 30 ? false : undefined} />
          <Metric label="3M Return" value={`${(stock.priceReturn3m * 100).toFixed(1)}%`} positive={stock.priceReturn3m >= 0} />
          <Metric label="6M Return" value={`${(stock.priceReturn6m * 100).toFixed(1)}%`} positive={stock.priceReturn6m >= 0} />
          <Metric label="1Y Return" value={`${(stock.priceReturn1y * 100).toFixed(1)}%`} positive={stock.priceReturn1y >= 0} />
          {stock.weightedAlpha != null && (
            <Metric label="Wtd Alpha" value={`${stock.weightedAlpha > 0 ? '+' : ''}${stock.weightedAlpha.toFixed(1)}%`} positive={stock.weightedAlpha >= 0} />
          )}
        </div>
      </div>

      {/* Fundamentals */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Fundamentals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <Metric label="ROE" value={stock.returnOnEquity != null ? `${(stock.returnOnEquity * 100).toFixed(1)}%` : 'N/A'} positive={stock.returnOnEquity != null ? stock.returnOnEquity > 0.15 : undefined} />
          <Metric label="ROA" value={stock.returnOnAssets != null ? `${(stock.returnOnAssets * 100).toFixed(1)}%` : 'N/A'} positive={stock.returnOnAssets != null ? stock.returnOnAssets > 0.05 : undefined} />
          <Metric label="Gross Margin" value={stock.grossMargins != null ? `${(stock.grossMargins * 100).toFixed(1)}%` : 'N/A'} positive={stock.grossMargins != null ? stock.grossMargins > 0.4 : undefined} />
          <Metric label="Op. Margin" value={stock.operatingMargins != null ? `${(stock.operatingMargins * 100).toFixed(1)}%` : 'N/A'} positive={stock.operatingMargins != null ? stock.operatingMargins > 0.15 : undefined} />
          <Metric label="Profit Margin" value={stock.profitMargins != null ? `${(stock.profitMargins * 100).toFixed(1)}%` : 'N/A'} positive={stock.profitMargins != null ? stock.profitMargins > 0.1 : undefined} />
          <Metric label="D/E Ratio" value={stock.debtToEquity?.toFixed(1) ?? 'N/A'} positive={stock.debtToEquity != null ? stock.debtToEquity < 100 : undefined} />
          <Metric label="Current Ratio" value={stock.currentRatio?.toFixed(2) ?? 'N/A'} positive={stock.currentRatio != null ? stock.currentRatio > 1.5 : undefined} />
          <Metric label="EPS (TTM)" value={stock.trailingEps?.toFixed(2) ?? 'N/A'} positive={stock.trailingEps != null ? stock.trailingEps > 0 : undefined} />
          <Metric label="Div. Yield" value={stock.dividendYield != null ? `${(stock.dividendYield * 100).toFixed(2)}%` : 'N/A'} />
          <Metric label="Free Cash Flow" value={stock.freeCashflow != null ? formatLargeNum(stock.freeCashflow) : 'N/A'} positive={stock.freeCashflow != null ? stock.freeCashflow > 0 : undefined} />
          <Metric label="EV" value={stock.enterpriseValue != null ? formatLargeNum(stock.enterpriseValue) : 'N/A'} />
          <Metric label="EBITDA" value={stock.ebitda != null ? formatLargeNum(stock.ebitda) : 'N/A'} positive={stock.ebitda != null ? stock.ebitda > 0 : undefined} />
          <Metric label="Analyst Target" value={stock.targetMeanPrice != null ? `${cur}${stock.targetMeanPrice.toFixed(2)}` : 'N/A'} positive={stock.targetMeanPrice != null ? stock.targetMeanPrice > stock.price : undefined} />
          <Metric label="Earnings Date" value={stock.earningsDate ?? 'N/A'} />
          <Metric label="Insider Own." value={stock.heldPercentInsiders != null ? `${(stock.heldPercentInsiders * 100).toFixed(1)}%` : 'N/A'} />
          <Metric label="Inst. Own." value={stock.heldPercentInstitutions != null ? `${(stock.heldPercentInstitutions * 100).toFixed(1)}%` : 'N/A'} />
          <Metric label="Short Float" value={stock.shortPercentOfFloat != null ? `${(stock.shortPercentOfFloat * 100).toFixed(1)}%` : 'N/A'} positive={stock.shortPercentOfFloat != null ? stock.shortPercentOfFloat < 0.05 : undefined} />
        </div>
      </div>

      {/* Multi-Year Financials */}
      {financials && financials[stock.ticker] && financials[stock.ticker].length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Multi-Year Financials</h2>
          <FinancialsBarChart data={financials[stock.ticker]} />
        </div>
      )}

      {/* Piotroski & Graham */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Expert Screens</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">
          Three classic investing frameworks applied to this stock.
          <strong className="t-secondary"> Piotroski F-Score</strong> (0-9) checks 9 financial health criteria — 7+ means strong fundamentals, under 4 is a red flag.
          <strong className="t-secondary"> Graham Number</strong> estimates fair value using Benjamin Graham's formula (sqrt of 22.5 x EPS x Book Value) — if the current price is <em>below</em> the Graham Number, the stock may be undervalued.
          <strong className="t-secondary"> Buffett Quality</strong> (0-5) checks for consistent profits, high ROE, low debt, revenue growth, and positive free cash flow — 4+ is Buffett-grade quality.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Piotroski F-Score */}
          <div className="p-4 rounded-lg bg-surface-hover border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold t-primary">Piotroski F-Score</span>
              <span className={`text-lg font-bold font-mono ${
                (stock.piotroskiScore ?? 0) >= 7 ? 'text-bullish' :
                (stock.piotroskiScore ?? 0) >= 4 ? 'text-neutral' : 'text-bearish'
              }`}>{stock.piotroskiScore ?? 'N/A'}/9</span>
            </div>
            <p className="text-xs t-muted mb-2">
              {(stock.piotroskiScore ?? 0) >= 7 ? 'Strong financials' :
               (stock.piotroskiScore ?? 0) >= 4 ? 'Average financials' : 'Weak financials'}
            </p>
            {stock.piotroskiDetails && stock.piotroskiDetails.length > 0 && (
              <ul className="space-y-1">
                {stock.piotroskiDetails.map((d: string, i: number) => (
                  <li key={i} className="text-xs t-tertiary flex items-center gap-1.5">
                    <span className="text-bullish">+</span> {d}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Graham Number */}
          <div className="p-4 rounded-lg bg-surface-hover border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold t-primary">Graham Number</span>
              <span className="text-lg font-bold font-mono t-primary">
                {stock.grahamNumber != null ? `$${stock.grahamNumber.toFixed(2)}` : 'N/A'}
              </span>
            </div>
            {stock.grahamNumber != null && (
              <>
                <p className="text-xs t-muted mb-1">Fair value estimate (Benjamin Graham formula)</p>
                <p className={`text-xs font-medium ${stock.price < stock.grahamNumber ? 'text-bullish' : 'text-bearish'}`}>
                  {stock.price < stock.grahamNumber
                    ? `Undervalued by ${((1 - stock.price / stock.grahamNumber) * 100).toFixed(1)}%`
                    : `Overvalued by ${((stock.price / stock.grahamNumber - 1) * 100).toFixed(1)}%`}
                </p>
              </>
            )}
          </div>

          {/* DCF Lite */}
          <div className="p-4 rounded-lg bg-surface-hover border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold t-primary">DCF Value</span>
              <span className="text-lg font-bold font-mono t-primary">
                {stock.dcfValue != null ? `${stock.market === 'UK' ? '\u00a3' : '$'}${stock.dcfValue.toFixed(2)}` : 'N/A'}
              </span>
            </div>
            {stock.dcfValue != null && (
              <>
                <p className="text-xs t-muted mb-1">Intrinsic value (5-year DCF model)</p>
                <p className={`text-xs font-medium ${stock.price < stock.dcfValue ? 'text-bullish' : 'text-bearish'}`}>
                  {stock.price < stock.dcfValue
                    ? `Undervalued by ${((1 - stock.price / stock.dcfValue) * 100).toFixed(1)}%`
                    : `Overvalued by ${((stock.price / stock.dcfValue - 1) * 100).toFixed(1)}%`}
                </p>
              </>
            )}
          </div>

          {/* Buffett Score */}
          <div className="p-4 rounded-lg bg-surface-hover border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold t-primary">Buffett Quality</span>
              <span className={`text-lg font-bold font-mono ${
                (stock.buffettScore ?? 0) >= 4 ? 'text-bullish' :
                (stock.buffettScore ?? 0) >= 2 ? 'text-neutral' : 'text-bearish'
              }`}>{stock.buffettScore ?? 'N/A'}/5</span>
            </div>
            {stock.buffettDetails && stock.buffettDetails.length > 0 && (
              <ul className="space-y-1">
                {stock.buffettDetails.map((d: string, i: number) => (
                  <li key={i} className="text-xs t-tertiary flex items-center gap-1.5">
                    <span className="text-bullish">+</span> {d}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Altman Z-Score */}
          <div className="p-4 rounded-lg bg-surface-hover border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold t-primary">Altman Z-Score</span>
              <span className={`text-lg font-bold font-mono ${
                stock.altmanZone === 'safe' ? 'text-bullish' :
                stock.altmanZone === 'grey' ? 'text-neutral' : stock.altmanZone === 'distress' ? 'text-bearish' : 't-muted'
              }`}>{stock.altmanZScore?.toFixed(2) ?? 'N/A'}</span>
            </div>
            <p className="text-xs t-muted">
              {stock.altmanZone === 'safe' ? 'Safe zone (>2.99) — Low bankruptcy risk' :
               stock.altmanZone === 'grey' ? 'Grey zone (1.81-2.99) — Moderate risk' :
               stock.altmanZone === 'distress' ? 'Distress zone (<1.81) — High bankruptcy risk' :
               'Insufficient data'}
            </p>
          </div>

          {/* SMR Rating */}
          <div className="p-4 rounded-lg bg-surface-hover border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold t-primary">SMR Rating</span>
              <span className={`text-lg font-bold font-mono ${
                stock.smrRating === 'A' ? 'text-bullish' :
                stock.smrRating === 'B' ? 'text-bullish' :
                stock.smrRating === 'C' ? 'text-neutral' : 'text-bearish'
              }`}>{stock.smrRating ?? 'N/A'}</span>
            </div>
            <p className="text-xs t-muted">
              Sales growth + Operating margin + ROE composite (IBD-style). A/B = strong fundamentals.
            </p>
          </div>
        </div>
      </div>

      {/* Factor Grades */}
      {stock.factorGrades && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Factor Grades</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">
            Percentile-based grades across five investment factors. <strong className="t-secondary">A+</strong> = top 5%, <strong className="t-secondary">F</strong> = bottom 8%.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {(['overall', 'value', 'growth', 'profitability', 'momentum', 'safety'] as const).map(factor => {
              const grade = stock.factorGrades![factor];
              const isGood = grade.startsWith('A') || grade.startsWith('B');
              const isBad = grade === 'D' || grade === 'F';
              return (
                <div key={factor} className={`rounded-lg border p-3 text-center ${
                  factor === 'overall' ? 'border-accent/30 bg-accent/5' : 'border-surface-border bg-surface-hover'
                }`}>
                  <p className="text-[10px] t-muted uppercase tracking-wider mb-1">{factor}</p>
                  <p className={`text-xl font-bold font-mono ${
                    isGood ? 'text-bullish' : isBad ? 'text-bearish' : 'text-neutral'
                  }`}>{grade}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Earnings Drift */}
      {stock.earningsDrift && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Post-Earnings Drift</h2>
          <p className="text-xs t-muted mb-4">Price returns after last earnings ({stock.earningsDrift.lastEarningsDate})</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '1-Day', val: stock.earningsDrift.return1d },
              { label: '5-Day', val: stock.earningsDrift.return5d },
              { label: '20-Day', val: stock.earningsDrift.return20d },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-lg border border-surface-border bg-surface-hover p-3 text-center">
                <p className="text-xs t-muted mb-1">{label}</p>
                <p className={`text-lg font-bold font-mono ${
                  val != null ? (val >= 0 ? 'text-bullish' : 'text-bearish') : 't-muted'
                }`}>{val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minervini Trend Template */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Minervini Trend Template</h2>
          <span className={`text-sm font-bold ${stock.minerviniChecks.passed >= 7 ? 'text-bullish' : stock.minerviniChecks.passed >= 5 ? 'text-neutral' : 'text-bearish'}`}>
            {stock.minerviniChecks.passed}/8 passed
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <CheckItem pass={stock.minerviniChecks.priceAbove150and200} label="Price above 150-day & 200-day SMA" />
          <CheckItem pass={stock.minerviniChecks.sma150Above200} label="150-day SMA above 200-day SMA" />
          <CheckItem pass={stock.minerviniChecks.sma200Trending} label="200-day SMA trending up" />
          <CheckItem pass={stock.minerviniChecks.sma50Above150and200} label="50-day SMA above 150 & 200-day" />
          <CheckItem pass={stock.minerviniChecks.priceAbove50} label="Price above 50-day SMA" />
          <CheckItem pass={stock.minerviniChecks.price30PctAboveLow} label="Price 30%+ above 52-week low" />
          <CheckItem pass={stock.minerviniChecks.priceWithin25PctOfHigh} label="Price within 25% of 52-week high" />
          <CheckItem pass={stock.minerviniChecks.rsAbove70} label={`RS Percentile >= 70 (current: ${stock.rsPercentile})`} />
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
          <Metric label="ADX" value={stock.adx?.toFixed(1) ?? 'N/A'} highlight={stock.adx != null && stock.adx > 25} />
          <Metric label="+DI / -DI" value={stock.plusDI != null && stock.minusDI != null ? `${stock.plusDI.toFixed(1)} / ${stock.minusDI.toFixed(1)}` : 'N/A'} positive={stock.plusDI != null && stock.minusDI != null ? stock.plusDI > stock.minusDI : undefined} />
          <Metric label="Williams %R" value={stock.williamsR?.toFixed(1) ?? 'N/A'} highlight={stock.williamsR != null && (stock.williamsR > -20 || stock.williamsR < -80)} />
          <Metric label="Chaikin MF" value={stock.chaikinMoneyFlow?.toFixed(3) ?? 'N/A'} positive={stock.chaikinMoneyFlow != null ? stock.chaikinMoneyFlow > 0 : undefined} />
        </div>
      </div>

      {/* Risk-Adjusted Returns */}
      {(stock.sharpeRatio != null || stock.sortinoRatio != null || stock.maxDrawdown != null) && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Risk-Adjusted Returns (1Y)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <Metric label="Sharpe Ratio" value={stock.sharpeRatio?.toFixed(2) ?? 'N/A'} positive={stock.sharpeRatio != null ? stock.sharpeRatio > 0.5 : undefined} />
            <Metric label="Sortino Ratio" value={stock.sortinoRatio?.toFixed(2) ?? 'N/A'} positive={stock.sortinoRatio != null ? stock.sortinoRatio > 0.5 : undefined} />
            <Metric label="Max Drawdown" value={stock.maxDrawdown != null ? `${stock.maxDrawdown.toFixed(1)}%` : 'N/A'} positive={stock.maxDrawdown != null ? stock.maxDrawdown > -15 : undefined} />
          </div>
        </div>
      )}

      {/* Multi-Timeframe Opinion */}
      {stock.timeframeSentiment && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Multi-Timeframe Opinion</h2>
          <div className="grid grid-cols-3 gap-3">
            {(['short', 'medium', 'long'] as const).map(tf => {
              const data = stock.timeframeSentiment![tf];
              const label = tf === 'short' ? 'Short-Term' : tf === 'medium' ? 'Medium-Term' : 'Long-Term';
              const sub = tf === 'short' ? 'Days — 2 weeks' : tf === 'medium' ? '2 weeks — 3 months' : '3+ months';
              const bg = data.opinion === 'Buy' ? 'bg-bullish/10 border-bullish/30' : data.opinion === 'Sell' ? 'bg-bearish/10 border-bearish/30' : 'bg-neutral/10 border-neutral/30';
              const textColor = data.opinion === 'Buy' ? 'text-bullish' : data.opinion === 'Sell' ? 'text-bearish' : 'text-neutral';
              return (
                <div key={tf} className={`rounded-lg border p-3 text-center ${bg}`}>
                  <p className="text-xs t-muted mb-1">{label}</p>
                  <p className={`text-lg font-bold ${textColor}`}>{data.opinion}</p>
                  <p className="text-[10px] t-faint mt-1">{sub}</p>
                  <p className="text-[10px] t-muted">{data.signalCount} signal{data.signalCount !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Signals */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Active Signals</h2>
        {stock.signals.length === 0 ? (
          <p className="t-muted text-sm">No signals detected</p>
        ) : (
          <div className="space-y-2">
            {stock.signals.map((s, i) => {
              const tfBadge = s.timeframe === 'short' ? 'S' : s.timeframe === 'medium' ? 'M' : s.timeframe === 'long' ? 'L' : null;
              const tfColor = s.timeframe === 'short' ? 'bg-accent/20 text-accent-light' : s.timeframe === 'medium' ? 'bg-neutral/20 text-neutral' : 'bg-bullish/20 text-bullish';
              return (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors">
                  <SignalBadge direction={s.direction} type={s.type} />
                  {tfBadge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tfColor} flex-shrink-0`}>{tfBadge}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs t-tertiary">{s.description}</p>
                  </div>
                  <span className={`text-xs font-mono ${s.severity >= 3 ? 't-primary font-bold' : 't-muted'}`}>
                    Sev {s.severity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dividend History */}
      {stock.dividendMetrics && stock.dividendMetrics.annualDividends.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Dividend History</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {stock.dividendMetrics.currentAnnualDPS != null && (
              <div>
                <p className="text-xs t-muted mb-1">Annual DPS</p>
                <p className="font-semibold font-mono t-primary">{cur}{stock.dividendMetrics.currentAnnualDPS.toFixed(2)}</p>
              </div>
            )}
            {stock.dividendYield != null && (
              <div>
                <p className="text-xs t-muted mb-1">Yield</p>
                <p className="font-semibold font-mono text-bullish">{(stock.dividendYield * 100).toFixed(2)}%</p>
              </div>
            )}
            {stock.dividendMetrics.fiveYearCAGR != null && (
              <div>
                <p className="text-xs t-muted mb-1">5Y CAGR</p>
                <p className={`font-semibold font-mono ${stock.dividendMetrics.fiveYearCAGR >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {stock.dividendMetrics.fiveYearCAGR > 0 ? '+' : ''}{stock.dividendMetrics.fiveYearCAGR.toFixed(1)}%
                </p>
              </div>
            )}
            {stock.dividendMetrics.growthStreak > 0 && (
              <div>
                <p className="text-xs t-muted mb-1">Growth Streak</p>
                <p className="font-semibold font-mono text-bullish">{stock.dividendMetrics.growthStreak} yr{stock.dividendMetrics.growthStreak > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stock.dividendMetrics.annualDividends}>
                <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="var(--color-text-muted, #888)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted, #888)" />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface, #1a1a2e)', border: '1px solid var(--color-border, #333)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--color-text-secondary, #ccc)' }}
                  formatter={(value: number) => [`${cur}${value.toFixed(4)}`, 'DPS']}
                />
                <Bar dataKey="totalDPS" fill="var(--color-accent, #6366f1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Insider Trading */}
      {insiderTrades && insiderTrades[stock.ticker] && insiderTrades[stock.ticker].trades.length > 0 && (() => {
        const insider = insiderTrades[stock.ticker];
        const sentimentColor = insider.sentiment === 'bullish' ? 'text-bullish' : insider.sentiment === 'bearish' ? 'text-bearish' : 'text-neutral';
        const sentimentBg = insider.sentiment === 'bullish' ? 'bg-bullish/10' : insider.sentiment === 'bearish' ? 'bg-bearish/10' : 'bg-neutral/10';
        const sentimentLabel = insider.sentiment === 'bullish' ? 'Net Insider Buying' : insider.sentiment === 'bearish' ? 'Net Insider Selling' : 'Neutral Insider Activity';
        return (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Insider Trading</h2>
              <span className={`text-xs font-bold px-2 py-1 rounded ${sentimentBg} ${sentimentColor}`}>{sentimentLabel}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div>
                <p className="text-xs t-muted">Buys (90d)</p>
                <p className="font-semibold font-mono text-bullish">{insider.buyCount90d}</p>
              </div>
              <div>
                <p className="text-xs t-muted">Sells (90d)</p>
                <p className="font-semibold font-mono text-bearish">{insider.sellCount90d}</p>
              </div>
              <div>
                <p className="text-xs t-muted">Net Shares</p>
                <p className={`font-semibold font-mono ${insider.netShares90d >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                  {insider.netShares90d >= 0 ? '+' : ''}{insider.netShares90d.toLocaleString()}
                </p>
              </div>
            </div>
            {insider.trades.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="t-muted border-b border-surface-border">
                      <th className="text-left py-2 pr-3">Date</th>
                      <th className="text-left py-2 pr-3">Insider</th>
                      <th className="text-left py-2 pr-3">Type</th>
                      <th className="text-right py-2 pr-3">Shares</th>
                      <th className="text-right py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insider.trades.slice(0, 10).map((t, i) => {
                      const typeLabel = t.transactionType === 'P' ? 'Buy' : t.transactionType === 'S' ? 'Sell' : t.transactionType === 'A' ? 'Award' : t.transactionType;
                      const typeColor = t.transactionType === 'P' ? 'text-bullish' : t.transactionType === 'S' ? 'text-bearish' : 'text-neutral';
                      return (
                        <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                          <td className="py-1.5 pr-3 t-muted">{t.filingDate}</td>
                          <td className="py-1.5 pr-3 t-secondary truncate max-w-[120px]">{t.insiderName}</td>
                          <td className={`py-1.5 pr-3 font-medium ${typeColor}`}>{typeLabel}</td>
                          <td className="py-1.5 pr-3 text-right font-mono t-secondary">{Math.abs(t.shares).toLocaleString()}</td>
                          <td className="py-1.5 text-right font-mono t-secondary">{t.totalValue != null ? `$${t.totalValue.toLocaleString()}` : '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* News */}
      {stockNews.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Recent News</h2>
          <div className="space-y-3">
            {stockNews.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.finbertScore != null && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-accent/20 text-accent-light flex-shrink-0">AI</span>
                  )}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm t-secondary hover:text-accent-light transition-colors line-clamp-1 leading-relaxed"
                  >
                    {item.title}
                  </a>
                </div>
                <SentimentBar score={item.sentimentScore} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── HELPER FUNCTIONS ─── */
function formatLargeNum(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

function CheckItem({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-surface-hover transition-colors">
      <span className={`text-sm flex-shrink-0 ${pass ? 'text-bullish' : 'text-bearish'}`}>
        {pass ? '+' : 'x'}
      </span>
      <span className={`text-sm ${pass ? 't-secondary' : 't-muted'}`}>{label}</span>
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
interface SellSignal {
  triggered: boolean;
  reasons: string[];
}

interface Recommendation {
  verdict: 'strong-buy' | 'buy' | 'hold' | 'caution' | 'avoid';
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  summary: string;
  strengths: string[];
  risks: string[];
  sell: SellSignal;
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
    color = 'text-bullish-light';
    bgColor = 'bg-bullish/5';
    borderColor = 'border-bullish/20';
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
    color = 'text-neutral-light';
    bgColor = 'bg-neutral/5';
    borderColor = 'border-neutral/20';
    summary = 'Several indicators are negative. This stock is showing signs of weakness. If you own it, consider reducing your position. Not recommended for new entries.';
  } else {
    verdict = 'avoid';
    label = 'Avoid — High Risk';
    color = 'text-bearish';
    bgColor = 'bg-bearish/8';
    borderColor = 'border-bearish/25';
    summary = 'Most indicators are negative. This stock has significant risk factors. Avoid new positions and consider exiting existing ones.';
  }

  // Sell signal — based on Risk Avoidance strategy
  const sellReasons: string[] = [];

  // 1. Bearish score severity
  if (stock.bearishScore >= 6) {
    sellReasons.push(`Bearish score is ${stock.bearishScore} (6+ = serious warning, consider selling)`);
  } else if (stock.bearishScore >= 4) {
    sellReasons.push(`Bearish score is ${stock.bearishScore} (4-5 = caution zone)`);
  }

  // 2. OBV Bearish Divergence — smart money exiting
  if (stock.obvDivergence === 'bearish') {
    sellReasons.push('OBV Bearish Divergence — smart money may be exiting while price rises');
  }

  // 3. Death Cross + negative MACD = strong sell
  const hasDeathCross = stock.sma50 != null && stock.sma200 != null && stock.sma50 < stock.sma200;
  const hasNegativeMacd = stock.macdHistogram != null && stock.macdHistogram < 0;
  if (hasDeathCross && hasNegativeMacd) {
    sellReasons.push('Death Cross (SMA50 < SMA200) + negative MACD — strong sell signal');
  } else if (hasDeathCross) {
    sellReasons.push('Death Cross detected (SMA50 < SMA200) — long-term trend is bearish');
  }

  // 4. Multiple converging bearish signals (3+)
  const bearishSignalCount = stock.signals.filter(s => s.direction === 'bearish').length;
  if (bearishSignalCount >= 3) {
    sellReasons.push(`${bearishSignalCount} converging bearish signals active — multiple warnings aligned`);
  }

  const sell: SellSignal = {
    triggered: sellReasons.length >= 2, // Need at least 2 reasons to trigger sell
    reasons: sellReasons,
  };

  return { verdict, label, color, bgColor, borderColor, summary, strengths: strengths.slice(0, 5), risks: risks.slice(0, 5), sell };
}

function RecommendationCard({ rec, stock }: { rec: Recommendation; stock: StockRecord }) {
  return (
    <div className={`card p-5 ${rec.bgColor} border ${rec.borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Analysis Summary</h2>
          <span className={`text-sm font-bold ${rec.color}`}>{rec.label}</span>
          {rec.sell.triggered && <SellTag reasons={rec.sell.reasons} />}
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

/* ─── AI SUMMARY CARD ─── */
function AiSummaryCard({ paragraphs, isAiGenerated }: { paragraphs: string[]; isAiGenerated: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (paragraphs.length === 0) return null;

  const visible = expanded ? paragraphs : paragraphs.slice(0, 2);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">AI Research Note</h2>
        {isAiGenerated ? (
          <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">AI-Generated</span>
        ) : (
          <span className="text-[10px] t-faint bg-surface-secondary px-2 py-0.5 rounded-full">Rule-Based</span>
        )}
      </div>
      <div className="space-y-3">
        {visible.map((p, i) => (
          <p key={i} className="text-sm t-secondary leading-relaxed">{p}</p>
        ))}
      </div>
      {paragraphs.length > 2 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs text-accent hover:underline"
        >
          {expanded ? 'Show less' : `Read full analysis (${paragraphs.length - 2} more)`}
        </button>
      )}
    </div>
  );
}

/* ─── SELL TAG WITH TOOLTIP ─── */
function SellTag({ reasons }: { reasons: string[] }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(v => !v)}
        className="badge bg-red-500/20 text-red-400 ring-1 ring-red-500/30 text-xs font-bold cursor-help px-2.5 py-1"
      >
        SELL
      </button>
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 z-50 w-80">
          <div className="bg-surface-secondary border border-red-500/30 rounded-xl shadow-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold">!</span>
              <p className="text-xs font-semibold text-red-400">Sell Signal — Risk Avoidance</p>
            </div>
            <p className="text-xs t-muted mb-3">Multiple risk conditions are met. If you own this stock, consider reducing or exiting your position.</p>
            <ul className="space-y-2">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs t-tertiary">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">x</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SUPPORT & RESISTANCE CARD ─── */
function SupportResistanceCard({ levels, currentPrice, currency }: {
  levels: { price: number; strength: number; type: 'support' | 'resistance' }[];
  currentPrice: number;
  currency: string;
}) {
  const resistances = levels.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price);
  const supports = levels.filter(l => l.type === 'support').sort((a, b) => b.price - a.price);

  // Determine the range for the bar chart
  const allPrices = [...levels.map(l => l.price), currentPrice];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const range = maxPrice - minPrice || 1;
  const maxStrength = Math.max(...levels.map(l => l.strength), 1);

  const positionPercent = (price: number) =>
    ((price - minPrice) / range) * 100;

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Support & Resistance</h2>
      <p className="text-xs t-muted mb-4 leading-relaxed">
        <strong className="text-bullish">Support (S1, S2, S3)</strong> = price levels where the stock has historically bounced up. If the price drops to a support level, it may bounce again.
        <strong className="text-bearish"> Resistance (R1, R2, R3)</strong> = price levels where the stock has historically stalled or reversed down.
        More <strong className="t-secondary">touches</strong> = stronger level. The % shows how far each level is from the current price.
        Use support levels as potential buy zones and resistance levels as potential sell/take-profit targets.
      </p>

      {/* Visual bar chart */}
      <div className="relative mb-6 py-2">
        {/* Track line */}
        <div className="absolute left-12 right-4 top-1/2 h-px bg-surface-border -translate-y-1/2" />

        {/* Current price marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          style={{ left: `calc(${positionPercent(currentPrice)}% * 0.85 + 3rem)` }}
        >
          <div className="w-0.5 h-8 bg-accent-light -mt-4" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-accent-light">
            {currency}{currentPrice.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Level rows */}
      <div className="space-y-2">
        {/* Resistance levels (highest first) */}
        {[...resistances].reverse().map((level, i) => {
          const pctFromPrice = ((level.price - currentPrice) / currentPrice * 100).toFixed(1);
          const barWidth = Math.max((level.strength / maxStrength) * 100, 12);
          return (
            <div key={`r-${i}`} className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-bearish uppercase w-6 flex-shrink-0">R{resistances.length - i}</span>
              <span className="text-sm font-mono tabular-nums t-primary w-20 text-right flex-shrink-0">
                {currency}{level.price.toFixed(2)}
              </span>
              <div className="flex-1 h-5 bg-surface-tertiary rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-bearish/30 border border-bearish/50 transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold t-secondary">
                  {level.strength} touches
                </span>
              </div>
              <span className="text-xs font-mono t-muted w-14 text-right flex-shrink-0">+{pctFromPrice}%</span>
            </div>
          );
        })}

        {/* Current price row */}
        <div className="flex items-center gap-3 py-1">
          <span className="text-[10px] font-bold text-accent-light uppercase w-6 flex-shrink-0">NOW</span>
          <span className="text-sm font-mono tabular-nums font-bold text-accent-light w-20 text-right flex-shrink-0">
            {currency}{currentPrice.toFixed(2)}
          </span>
          <div className="flex-1 h-px bg-accent-light/40 border-t border-dashed border-accent-light/60" />
          <span className="text-xs font-mono text-accent-light w-14 text-right flex-shrink-0">0.0%</span>
        </div>

        {/* Support levels (highest first, nearest to price at top) */}
        {supports.map((level, i) => {
          const pctFromPrice = ((level.price - currentPrice) / currentPrice * 100).toFixed(1);
          const barWidth = Math.max((level.strength / maxStrength) * 100, 12);
          return (
            <div key={`s-${i}`} className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-bullish uppercase w-6 flex-shrink-0">S{i + 1}</span>
              <span className="text-sm font-mono tabular-nums t-primary w-20 text-right flex-shrink-0">
                {currency}{level.price.toFixed(2)}
              </span>
              <div className="flex-1 h-5 bg-surface-tertiary rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-bullish/30 border border-bullish/50 transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold t-secondary">
                  {level.strength} touches
                </span>
              </div>
              <span className="text-xs font-mono t-muted w-14 text-right flex-shrink-0">{pctFromPrice}%</span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] t-faint mt-3 italic">
        Levels identified via swing-point clustering on historical OHLCV data. Strength = number of price touches at that level.
      </p>
    </div>
  );
}
