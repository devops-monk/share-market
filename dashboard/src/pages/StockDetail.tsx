import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useParams, Link } from 'react-router-dom';
import type { StockRecord, NewsItem, InsiderTradesMap, SocialSentimentMap } from '../types';
import ScoreGauge from '../components/charts/ScoreGauge';
import ScoreRadarChart from '../components/charts/ScoreRadarChart';
import PriceChart from '../components/charts/PriceChart';
import CandlestickChart from '../components/charts/CandlestickChart';
import SentimentBar from '../components/charts/SentimentBar';
import ScoreHistoryChart from '../components/charts/ScoreHistoryChart';
import { MarketTag, CapTag, Trading212Badge, SignalBadge, ChangePercent } from '../components/common/Tags';
import FinancialsBarChart from '../components/charts/FinancialsBarChart';
import { generateStockSummary } from '../lib/stock-summary';
import VolumeProfileChart from '../components/charts/VolumeProfileChart';
import PredictiveScoreCard from '../components/charts/PredictiveScoreCard';
import AICopilotChat from '../components/common/AICopilotChat';
import type { FinancialsMap } from '../hooks/useStockData';

interface Props {
  stocks: StockRecord[];
  news: NewsItem[];
  financials?: FinancialsMap | null;
  insiderTrades?: InsiderTradesMap | null;
  aiResearchNotes?: Record<string, string[]> | null;
  socialSentiment?: SocialSentimentMap | null;
}

/* ─── TOOLTIP DESCRIPTIONS (Simple, kid-friendly) ─── */
const TOOLTIPS: Record<string, string> = {
  // Score breakdown
  'Momentum': 'Is the price going up or down lately? Think of it like a ball rolling — higher score means the price has been going up over the past few months.',
  'Technical': 'A mix of math-based signals that look at price patterns, trends, and speed. Like checking multiple weather instruments before deciding if it\'ll rain.',
  'Sentiment': 'What are people saying about this stock in the news? Positive news = higher score, negative news = lower score. Think of it as the stock\'s "mood rating."',
  'Fundamentals': 'Is the company actually making money and growing? This checks things like profits, sales growth, and whether the stock price is a fair deal.',
  'Volume': 'How many people are buying and selling? If way more people are trading than usual, something big might be happening — like a crowded store on a sale day.',
  'Risk (inv.)': 'How wild does the price swing? A calm, steady stock gets a high score. A stock that jumps up and down like a rollercoaster gets a low score.',
  // Key metrics
  'Market Cap': 'The total value of the company if you bought every single share. Small = under $2 billion, Mid = $2-10 billion, Large = over $10 billion. Think of it as the price tag for the whole company.',
  'P/E': 'Price-to-Earnings: how many years of profits you\'re paying for. If P/E = 20, you\'re paying 20x what the company earns per year. Lower = cheaper, like getting a better deal. Under 15 = bargain, over 30 = expensive.',
  'Forward P/E': 'Same as P/E but using next year\'s expected profits instead of last year\'s. If this is lower than P/E, experts think the company will make more money next year — that\'s a good sign!',
  'PEG Ratio': 'P/E divided by how fast the company is growing. Under 1 = the stock is cheap for how fast it\'s growing (great deal!). Over 2 = you\'re overpaying. Think of it like price per speed.',
  'P/B': 'Price-to-Book: the stock price compared to what the company actually owns (buildings, equipment, cash). Under 1 means you\'re paying less than the company is worth on paper — like buying a $100 gift card for $80.',
  'Beta': 'How much the stock moves compared to the whole market. 1.0 = moves the same as the market. Over 1.5 = super jumpy. Under 0.5 = very calm and steady, like a slow-moving boat.',
  'RSI': 'Relative Strength Index — measures if a stock has been bought too much or sold too much recently. Over 70 = everyone\'s been buying (might drop soon). Under 30 = everyone\'s been selling (might bounce back). Think of it like a "tired or rested" meter.',
  'RS Percentile': 'How this stock performs compared to ALL other stocks. 90 means it\'s beating 90% of all stocks. Like a class rank — higher is better!',
  'SMA 50': '50-day average price. If today\'s price is above this line, the stock has been going up recently — like checking if your test score is above your average.',
  'SMA 150': '150-day average price. A medium-term trend line. Price above this = the stock has been doing well for several months.',
  'SMA 200': '200-day average price. The big, important trend line. If the price is above this, the stock is in a long-term uptrend — like a student who\'s been doing well all year.',
  'SMA 20': '20-day average price. Very short-term trend. Helpful for seeing what\'s happened in the last few weeks.',
  'Vol Ratio': 'Today\'s trading activity compared to the average. Over 1.5x = unusually busy (something\'s happening!). Over 2x = major event. Like seeing a store that\'s suddenly way more crowded than usual.',
  '52W High': 'The highest price in the last year. If the stock is near this, it\'s been performing well — like being near a personal best in a race.',
  '52W Low': 'The lowest price in the last year. If the stock is near this, it might be struggling — or it might be a bargain waiting to bounce back.',
  '52W Range': 'Where the current price sits between its yearly low (0%) and yearly high (100%). Higher = closer to its best price this year.',
  '3M Return': 'How much the price changed in the last 3 months. Positive = went up, negative = went down.',
  '6M Return': 'How much the price changed in the last 6 months. Shows the bigger picture trend.',
  '1Y Return': 'How much the price changed in the last 12 months. Shows the full-year performance.',
  'Wtd Alpha': 'A special 1-year return that cares more about recent months than older ones. If the stock did great last month but badly 10 months ago, this still looks good.',
  // Advanced indicators
  'Bollinger Upper': 'The upper boundary of a price channel. If the price goes above this line, it might be too high and could come back down — like stretching a rubber band too far.',
  'Bollinger Lower': 'The lower boundary of a price channel. If the price drops below this, it might be too low and could bounce back up.',
  'BB Bandwidth': 'How wide the price channel is. Very narrow = the stock has been super calm, and a big move is probably coming soon (like the calm before a storm).',
  'BB %B': 'Where the price is inside the channel. Near 1 = at the top (might drop). Near 0 = at the bottom (might rise). 0.5 = right in the middle.',
  'BB Squeeze': 'YES means the price channel is very narrow right now. The stock has been quiet, and a big price move (up or down) is likely coming soon!',
  'Stochastic %K': 'Shows if the stock is near the top or bottom of its recent price range. Over 80 = near the top (might come down). Under 20 = near the bottom (might go up). Like a thermometer for price.',
  'Stochastic %D': 'A smoother version of %K. When the fast line (%K) crosses over this slow line, it can signal a buy or sell moment.',
  'OBV Trend': 'Tracks whether more money is flowing IN (people buying) or OUT (people selling). Rising = more buyers. Falling = more sellers. Like checking if more people are entering or leaving a concert.',
  'OBV Divergence': 'When the price goes one way but the money flow goes the other way. Bullish divergence = price is dropping but big buyers are secretly loading up (sneaky buying!). Bearish = price rising but big sellers are sneaking out.',
  'Acc/Dist': 'Are big institutions (like mutual funds) buying or selling? A/B = they\'re buying (good sign). D/E = they\'re selling (warning sign). Like following what the "smart kids" in class are doing.',
  // Fundamentals
  'ROE': 'Return on Equity — how good is the company at turning your investment into profit? Over 20% = excellent (like a business that turns $1 into $1.20). The higher, the better.',
  'ROA': 'Return on Assets — how well does the company use everything it owns to make money? Higher = more efficient, like a bakery that makes lots of bread with few ovens.',
  'Gross Margin': 'After paying for materials, how much money is left? Over 40% is great — it means for every $1 of sales, they keep 40 cents before other costs. Like a lemonade stand that makes lemonade really cheaply.',
  'Op. Margin': 'After paying for everything (salaries, rent, materials), how much profit is left? Higher = the company runs lean and efficient.',
  'Profit Margin': 'The final bottom line — after ALL costs, taxes, and expenses, what percentage is actual profit? Over 20% = very profitable company.',
  'D/E Ratio': 'How much the company borrowed compared to what it owns. Under 100 = healthy. Over 200 = lots of debt (risky). Like checking if someone owes more than they earn.',
  'Current Ratio': 'Can the company pay its bills right now? Over 2 = plenty of cash on hand. Under 1 = might struggle to pay short-term bills. Like checking if you have enough allowance for the week.',
  'Div. Yield': 'How much cash the company pays you each year just for owning the stock, shown as a percentage. 3% means you get $3 back for every $100 invested. Like earning interest on a savings account.',
  'EPS (TTM)': 'Earnings Per Share — how much profit the company made for each share over the last 12 months. Higher = the company is making more money per share you own.',
  'Free Cash Flow': 'Real cash left over after the company pays for everything it needs. Positive = healthy (the company has money to spare). Negative = spending more than it makes.',
  'EV': 'Enterprise Value — the true "takeover price" of the whole company, including its debt minus its cash. Like the real cost of buying a house (price + mortgage - cash in the bank).',
  'EBITDA': 'Earnings before subtracting interest, taxes, and equipment costs. Shows how much money the core business makes before accounting tricks. Think of it as "raw profit power."',
  'Analyst Target': 'The average price that Wall Street experts think this stock should be worth. If it\'s higher than the current price, they think it\'ll go up!',
  'Insider Own.': 'How much of the company is owned by its own bosses and employees. Higher = they believe in their own company (they\'re "eating their own cooking").',
  'Inst. Own.': 'How much is owned by big professional investors like mutual funds and banks. They do a lot of research, so if they own it, that\'s a vote of confidence.',
  'Short Float': 'The percentage of shares that people are betting AGAINST (expecting the price to drop). Over 20% = a lot of people think it\'ll go down. But if the price goes up instead, shorts scramble to buy back — causing a "short squeeze" pop.',
  'Style': 'Value = cheap stock with slow growth (like a sale item). Growth = expensive but fast-growing (like a hot new product). Blend = somewhere in between.',
  'Data Quality': 'How much financial data we have for this stock. Higher % = more complete picture. Low % means some numbers are missing and the analysis might be less reliable.',
  // Advanced indicators (additional)
  'ADX': 'Average Directional Index — tells you HOW STRONG the current trend is (not the direction). Over 25 = strong trend. Under 20 = no clear trend, the stock is just wandering. Like measuring the strength of the wind, not which way it blows.',
  '+DI / -DI': '+DI measures upward pressure, -DI measures downward pressure. When +DI is above -DI, buyers are winning. When -DI is above +DI, sellers are winning. Like a tug-of-war scoreboard.',
  'Williams %R': 'Similar to RSI — shows if the stock is near its recent high or low. Above -20 = near the top (might come down). Below -80 = near the bottom (might bounce up).',
  'Chaikin MF': 'Chaikin Money Flow — tracks if money is flowing into or out of the stock. Positive = more money coming in (bullish). Negative = money leaving (bearish). Like checking if a pool is filling up or draining.',
  // Risk-adjusted
  'Sharpe Ratio': 'How much return you get for the risk you take. Higher = better reward for the risk. Over 1 = good, over 2 = great. Like measuring how many points a player scores per minute of play time.',
  'Sortino Ratio': 'Like Sharpe Ratio but only counts the BAD kind of risk (drops). Higher = the stock gives you good returns without scary drops.',
  'Max Drawdown': 'The biggest peak-to-bottom drop in the last year. -10% means the stock fell 10% from its high before recovering. Smaller drops = safer ride.',
};

export default function StockDetail({ stocks, news, financials, insiderTrades, aiResearchNotes, socialSentiment }: Props) {
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
            <p className="t-tertiary text-sm mb-2">{stock.name} — {stock.sector}</p>
            {stock.themes && stock.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {stock.themes.map(t => (
                  <span key={t} className="badge text-[10px] bg-accent/10 text-accent-light ring-1 ring-accent/20 px-2 py-0.5">{t}</span>
                ))}
              </div>
            )}
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

      {/* AI Copilot Chat */}
      <AICopilotChat stocks={stocks} contextStock={stock} />

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

      {/* Volume Profile (VPVR) */}
      {stock.volumeProfile && stock.volumeProfile.bins.length > 0 && (() => {
        const vp = stock.volumeProfile!;
        const priceVsVpoc = ((stock.price - vp.vpoc) / vp.vpoc * 100);
        const isInValueArea = stock.price >= vp.valueAreaLow && stock.price <= vp.valueAreaHigh;
        const isAboveValueArea = stock.price > vp.valueAreaHigh;
        const isBelowValueArea = stock.price < vp.valueAreaLow;
        return (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-1">Volume Profile</h2>
          <p className="text-xs t-muted mb-3 leading-relaxed">
            Imagine stacking all trades from the past year sideways on a price chart. The longest bars show price levels where the most buying and selling happened — these are <strong className="t-secondary">"high-traffic" zones</strong> where lots of traders agreed on the price. These levels often act as magnets: prices tend to gravitate back to them, and they create strong support (floor) or resistance (ceiling).
          </p>

          {/* Plain English interpretation */}
          <div className={`p-3 rounded-lg border mb-4 text-xs leading-relaxed ${
            isInValueArea ? 'bg-accent/5 border-accent/20' : isAboveValueArea ? 'bg-bullish/5 border-bullish/20' : 'bg-bearish/5 border-bearish/20'
          }`}>
            <p className="font-semibold t-secondary mb-1">What this means right now:</p>
            {isInValueArea && (
              <p className="t-tertiary">The stock is trading <strong className="text-accent-light">inside the Value Area</strong> ({cur}{vp.valueAreaLow.toFixed(2)} – {cur}{vp.valueAreaHigh.toFixed(2)}), where 70% of all trading happened. This is the "comfort zone" — the price is at a level most traders consider fair. Expect the price to bounce around in this range unless something big changes.</p>
            )}
            {isAboveValueArea && (
              <p className="t-tertiary">The stock is trading <strong className="text-bullish">above the Value Area</strong> at {cur}{stock.price.toFixed(2)}, which is higher than where most trading took place. This could mean the stock is breaking out to new highs — bullish! But it also means there's less "support" up here, so if it falls back, it could drop quickly to the Value Area.</p>
            )}
            {isBelowValueArea && (
              <p className="t-tertiary">The stock is trading <strong className="text-bearish">below the Value Area</strong> at {cur}{stock.price.toFixed(2)}, which is lower than where most trading took place. This could be a bargain if the stock bounces back, or a warning sign if it keeps falling. Watch for the price to reclaim {cur}{vp.valueAreaLow.toFixed(2)} — that would be a positive sign.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-surface-tertiary/50 border border-surface-border text-center">
              <p className="text-[10px] font-semibold t-muted uppercase">VPOC</p>
              <p className="text-sm font-bold text-amber-400 tabular-nums">{cur}{vp.vpoc.toFixed(2)}</p>
              <p className="text-[10px] t-faint mt-0.5">Most traded price</p>
              <p className="text-[10px] t-muted">{priceVsVpoc >= 0 ? '+' : ''}{priceVsVpoc.toFixed(1)}% from current</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-tertiary/50 border border-surface-border text-center">
              <p className="text-[10px] font-semibold t-muted uppercase">Value Area High</p>
              <p className="text-sm font-bold text-accent-light tabular-nums">{cur}{vp.valueAreaHigh.toFixed(2)}</p>
              <p className="text-[10px] t-faint mt-0.5">Upper "fair price" boundary</p>
              <p className="text-[10px] t-muted">Acts as resistance</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-tertiary/50 border border-surface-border text-center">
              <p className="text-[10px] font-semibold t-muted uppercase">Value Area Low</p>
              <p className="text-sm font-bold text-accent-light tabular-nums">{cur}{vp.valueAreaLow.toFixed(2)}</p>
              <p className="text-[10px] t-faint mt-0.5">Lower "fair price" boundary</p>
              <p className="text-[10px] t-muted">Acts as support</p>
            </div>
          </div>

          {/* Key concepts for beginners */}
          <details className="mb-4 group">
            <summary className="text-xs t-muted cursor-pointer hover:t-secondary transition-colors flex items-center gap-1">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Learn: Key terms explained
            </summary>
            <div className="mt-2 p-3 rounded-lg bg-surface-tertiary/50 border border-surface-border text-xs t-tertiary space-y-2">
              <p><strong className="text-amber-400">VPOC (Volume Point of Control)</strong> — The single price level with the most trading volume. Think of it as the stock's "center of gravity." Prices tend to get pulled back to this level. Professional traders often use it as a reference point for fair value.</p>
              <p><strong className="text-accent-light">Value Area (VA)</strong> — The price range where 70% of all trading took place. It's like the "normal zone" for the stock. When the price is inside this range, it's trading at levels most people agreed were fair. The top of this zone (VAH) acts as a ceiling, and the bottom (VAL) acts as a floor.</p>
              <p><strong className="t-secondary">How traders use this:</strong> If the price opens inside the Value Area, it tends to stay there (range-bound day). If it opens outside and re-enters, it often travels to the other side. If the price stays above VAH, that's bullish strength. If it stays below VAL, that's bearish pressure.</p>
            </div>
          </details>

          <VolumeProfileChart data={vp} currentPrice={stock.price} currency={cur} />
        </div>
        );
      })()}

      {/* Social Buzz */}
      {socialSentiment?.[stock.ticker] && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-1">Social Buzz</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">
            How much are people talking about this stock online? More mentions and upvotes = more buzz. Data aggregated from Reddit communities like r/wallstreetbets, r/stocks, r/investing and more.
          </p>
          {(() => {
            const ss = socialSentiment[stock.ticker];
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-surface-tertiary/50 border border-surface-border text-center">
                  <p className="text-[10px] font-semibold t-muted uppercase">Mentions</p>
                  <p className="text-xl font-bold t-primary">{ss.mentions}</p>
                  <p className="text-[10px] t-muted">posts this week</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-tertiary/50 border border-surface-border text-center">
                  <p className="text-[10px] font-semibold t-muted uppercase">Upvotes</p>
                  <p className="text-xl font-bold t-primary">{(ss.upvotes ?? 0).toLocaleString()}</p>
                  <p className="text-[10px] t-muted">total engagement</p>
                </div>
                {ss.rank != null && (
                  <div className="p-3 rounded-lg bg-surface-tertiary/50 border border-surface-border text-center">
                    <p className="text-[10px] font-semibold t-muted uppercase">Trending Rank</p>
                    <p className="text-xl font-bold text-accent-light">#{ss.rank}</p>
                    <p className="text-[10px] t-muted">across social</p>
                  </div>
                )}
                {ss.mentionChange != null && (
                  <div className="p-3 rounded-lg bg-surface-tertiary/50 border border-surface-border text-center">
                    <p className="text-[10px] font-semibold t-muted uppercase">24h Change</p>
                    <p className={`text-xl font-bold ${ss.mentionChange > 1.2 ? 'text-bullish' : ss.mentionChange < 0.8 ? 'text-bearish' : 't-primary'}`}>
                      {ss.mentionChange > 1 ? '+' : ''}{((ss.mentionChange - 1) * 100).toFixed(0)}%
                    </p>
                    <p className="text-[10px] t-muted">vs yesterday</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Price levels (static fallback) */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Price Levels</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">A visual map of where the stock price sits compared to key levels like the yearly high, yearly low, and moving averages. This helps you see at a glance whether the stock is near the top of its range (expensive) or near the bottom (cheaper).</p>
        <PriceChart stock={stock} />
      </div>

      {/* Score breakdown */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Score Breakdown</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">
          Think of this as a report card for the stock! The overall score (0-100) is made up of 6 categories, like subjects in school.
          <strong className="t-secondary"> Green (65+)</strong> = doing great,
          <strong className="text-neutral"> Amber (40-64)</strong> = okay, could be better,
          <strong className="text-bearish"> Red (&lt;40)</strong> = needs improvement.
          The spider web chart shows the same thing visually — a bigger, rounder shape means the stock is strong in all areas. A lopsided shape means some areas are weak.
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
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Score History</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">How the stock's overall score has changed over time. An upward trend means the stock is getting better across multiple measures. A downward trend means things are getting worse. Flat = stable.</p>
        <ScoreHistoryChart ticker={stock.ticker} />
      </div>

      {/* Predictive Score */}
      {stock.predictiveScore && (
        <PredictiveScoreCard currentScore={stock.score.composite} predictiveScore={stock.predictiveScore} />
      )}

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
        <p className="text-xs t-muted mb-4 leading-relaxed">The most important numbers about this stock at a glance. Hover over any label to see what it means in simple words. Green values = good, red = not so good. <strong className="t-secondary">New to trading?</strong> Focus on P/E (is it cheap or expensive?), RSI (is it overbought or oversold?), and 52W Range (where is it compared to its yearly high/low?) — these three give you a quick gut-check on any stock.</p>
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
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Fundamentals</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">This is the company's financial health check — like a doctor's report but for businesses. It shows how profitable the company is, how much debt it has, and whether experts think the stock price will go up. Hover over any label for a simple explanation. <strong className="t-secondary">Quick guide:</strong> Look at ROE (is the company making good money? 15%+ is great), D/E Ratio (does it have too much debt? under 100 is safe), and Profit Margin (is it keeping enough of what it earns? 10%+ is solid).</p>
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
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Multi-Year Financials</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">How the company's sales, profits, and other financial numbers have changed year by year. Growing bars = the company is getting bigger and stronger. Shrinking bars = things might be slowing down.</p>
          <FinancialsBarChart data={financials[stock.ticker]} />
        </div>
      )}

      {/* Piotroski & Graham */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Expert Screens</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">
          These are tests invented by famous investors to check if a stock is worth buying.
          <strong className="t-secondary"> Piotroski F-Score</strong> (0-9) is like a 9-question quiz about the company's finances — scoring 7+ means it passes with flying colors, under 4 means it's failing.
          <strong className="t-secondary"> Graham Number</strong> calculates what the stock should be worth based on its earnings and assets — if today's price is below this number, you might be getting a bargain!
          <strong className="t-secondary"> Buffett Quality</strong> (0-5) checks 5 things Warren Buffett looks for: steady profits, smart use of money, low debt, growing sales, and real cash. 4+ = Buffett would approve!
          <strong className="t-secondary"> Altman Z-Score</strong> predicts if a company might go bankrupt — higher is safer.
          <strong className="t-secondary"> Beneish M-Score</strong> checks if the company might be faking its numbers — "unlikely manipulator" is what you want to see.
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
              {(stock.piotroskiScore ?? 0) >= 7 ? 'Acing the test! Strong financial health.' :
               (stock.piotroskiScore ?? 0) >= 4 ? 'Passing, but not great. Average financial health.' : 'Failing the test. Weak financial health — be careful.'}
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
                <p className="text-xs t-muted mb-1">What this stock SHOULD be worth, according to a famous formula</p>
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
                <p className="text-xs t-muted mb-1">What the stock should be worth based on future cash flow predictions (5-year estimate)</p>
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
              {stock.altmanZone === 'safe' ? 'Safe zone — This company is financially healthy and very unlikely to go bankrupt.' :
               stock.altmanZone === 'grey' ? 'Grey zone — Not clearly safe or risky. Keep an eye on it.' :
               stock.altmanZone === 'distress' ? 'Danger zone — This company could be in serious financial trouble. High risk!' :
               'Not enough data to calculate'}
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
              A letter grade combining sales growth, profit margins, and how well the company uses your money. A/B = top of the class. D/E = bottom of the class.
            </p>
          </div>

          {/* Beneish M-Score */}
          <div className="p-4 rounded-lg bg-surface-hover border border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold t-primary">Beneish M-Score</span>
              <span className={`text-lg font-bold font-mono ${
                stock.beneishZone === 'unlikely' ? 'text-bullish' :
                stock.beneishZone === 'possible' ? 'text-neutral' :
                stock.beneishZone === 'likely' ? 'text-bearish' : 't-muted'
              }`}>{stock.beneishMScore?.toFixed(2) ?? 'N/A'}</span>
            </div>
            <p className="text-xs t-muted">
              {stock.beneishZone === 'unlikely' ? 'Looks honest! The company\'s financial numbers appear genuine and trustworthy.' :
               stock.beneishZone === 'possible' ? 'Hmm, some numbers look a bit suspicious. Worth double-checking before investing.' :
               stock.beneishZone === 'likely' ? 'Red flag! The numbers might be too good to be true. This company could be manipulating its earnings.' :
               'Not enough financial data to check if the numbers are trustworthy'}
            </p>
          </div>
        </div>
      </div>

      {/* Factor Grades */}
      {stock.factorGrades && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Factor Grades</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">
            Report card grades compared to all other stocks! <strong className="t-secondary">A+</strong> = top 5% (like being the best in class). <strong className="t-secondary">F</strong> = bottom 8% (failing).
            Value = is it cheap? Growth = is it growing fast? Profitability = does it make good money? Momentum = is the price going up? Safety = is it a calm, stable stock?
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
          <p className="text-xs t-muted mb-4">What happened to the stock price after the company announced its earnings on {stock.earningsDrift.lastEarningsDate}? Green = price went up after the announcement, Red = price went down. This shows how the market reacted to the company's results.</p>
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
        <p className="text-xs t-muted mb-4 leading-relaxed">Mark Minervini is a famous stock trader who only buys stocks that pass 8 specific checks. It's like a checklist — the stock must be in a strong uptrend and near its highs. Passing 7-8 = the stock is in great shape. Under 5 = the trend is broken.</p>
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
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Advanced Indicators</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">These are technical tools that traders use to predict where the price might go next. Think of them as different types of weather instruments — each one measures something slightly different. Hover over any label for a simple explanation. <strong className="t-secondary">Key things to watch:</strong> "BB Squeeze = YES" means a big move is coming. ADX over 25 means a strong trend is in place. When +DI {">"} -DI, buyers are winning. Highlighted values (yellow) mean extreme readings that often signal turning points.</p>
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

      {/* Ichimoku Cloud */}
      {stock.ichimoku && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Ichimoku Cloud</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">
            A Japanese charting tool that creates a "cloud" on the price chart. Imagine a cloud floating on the chart:
            <strong className="t-secondary"> If the price is ABOVE the cloud = sunshine (bullish, price is strong).</strong>
            <strong className="t-secondary"> If the price is BELOW the cloud = stormy (bearish, price is weak).</strong>
            <strong className="t-secondary"> Inside the cloud = foggy (uncertain, could go either way).</strong>
            A thicker cloud = stronger support/resistance, like a thicker wall that's harder to break through.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg border border-surface-border bg-surface-hover p-3 text-center">
              <p className="text-xs t-muted mb-1">Tenkan (Fast Line)</p>
              <p className="font-semibold font-mono t-primary">{cur}{stock.ichimoku.tenkan.toFixed(2)}</p>
              <p className="text-[10px] t-faint mt-0.5">9-day avg — shows short-term trend</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-hover p-3 text-center">
              <p className="text-xs t-muted mb-1">Kijun (Slow Line)</p>
              <p className="font-semibold font-mono t-primary">{cur}{stock.ichimoku.kijun.toFixed(2)}</p>
              <p className="text-[10px] t-faint mt-0.5">26-day avg — shows medium trend</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-hover p-3 text-center">
              <p className="text-xs t-muted mb-1">Cloud Top</p>
              <p className="font-semibold font-mono t-primary">{cur}{stock.ichimoku.senkouA.toFixed(2)}</p>
              <p className="text-[10px] t-faint mt-0.5">Upper edge of the cloud</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-hover p-3 text-center">
              <p className="text-xs t-muted mb-1">Cloud Bottom</p>
              <p className="font-semibold font-mono t-primary">{cur}{stock.ichimoku.senkouB.toFixed(2)}</p>
              <p className="text-[10px] t-faint mt-0.5">Lower edge of the cloud</p>
            </div>
            <div className={`rounded-lg border p-3 text-center ${
              stock.ichimoku.signal === 'bullish' ? 'border-bullish/30 bg-bullish/10' :
              stock.ichimoku.signal === 'bearish' ? 'border-bearish/30 bg-bearish/10' :
              'border-neutral/30 bg-neutral/10'
            }`}>
              <p className="text-xs t-muted mb-1">Signal</p>
              <p className={`font-bold text-sm ${
                stock.ichimoku.signal === 'bullish' ? 'text-bullish' :
                stock.ichimoku.signal === 'bearish' ? 'text-bearish' : 'text-neutral'
              }`}>{stock.ichimoku.signal === 'bullish' ? 'Above Cloud' :
                   stock.ichimoku.signal === 'bearish' ? 'Below Cloud' : 'In Cloud'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Candlestick Patterns */}
      {stock.candlestickPatterns && stock.candlestickPatterns.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Candlestick Patterns</h2>
          <p className="text-xs t-muted mb-4">These are shapes formed by recent price bars (called "candles"). Traders have given them fun names like "Hammer" or "Morning Star." Green badges = the pattern suggests the price might go UP. Red badges = the pattern suggests the price might go DOWN. They're like clues about what might happen next!</p>
          <div className="flex flex-wrap gap-2">
            {stock.candlestickPatterns.map((p, i) => (
              <span key={i} className={`badge text-xs px-3 py-1.5 font-medium ${
                p.direction === 'bullish' ? 'bg-bullish/15 text-bullish ring-1 ring-bullish/20' :
                p.direction === 'bearish' ? 'bg-bearish/15 text-bearish ring-1 ring-bearish/20' :
                'bg-neutral/15 text-neutral ring-1 ring-neutral/20'
              }`}>
                {p.direction === 'bullish' ? '+' : p.direction === 'bearish' ? 'x' : 'o'} {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chart Patterns */}
      {stock.chartPatterns && stock.chartPatterns.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Chart Patterns</h2>
          <p className="text-xs t-muted mb-4">Bigger shapes found in the price chart over the last 60 trading days. These are like recognizing shapes in the clouds — "Double Top" looks like the letter M (price might drop), "Double Bottom" looks like the letter W (price might rise). The confidence bar shows how clear the pattern is — higher = more reliable.</p>
          <div className="space-y-2">
            {stock.chartPatterns.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-hover border border-surface-border">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${
                    p.direction === 'bullish' ? 'text-bullish' :
                    p.direction === 'bearish' ? 'text-bearish' : 'text-neutral'
                  }`}>{p.direction === 'bullish' ? '+' : p.direction === 'bearish' ? 'x' : 'o'}</span>
                  <span className="text-sm font-semibold t-primary">{p.name}</span>
                  <span className={`badge text-[10px] ${
                    p.direction === 'bullish' ? 'bg-bullish/15 text-bullish' :
                    p.direction === 'bearish' ? 'bg-bearish/15 text-bearish' : 'bg-neutral/15 text-neutral'
                  }`}>{p.direction}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs t-muted">Confidence</span>
                  <div className="w-16 h-2 bg-surface-tertiary rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${p.confidence * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono t-secondary">{(p.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk-Adjusted Returns */}
      {(stock.sharpeRatio != null || stock.sortinoRatio != null || stock.maxDrawdown != null) && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Risk-Adjusted Returns (1Y)</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">Is this stock worth the risk? These numbers tell you if the rewards are good compared to how scary the ride is. <strong className="t-secondary">Sharpe Ratio:</strong> over 1.0 = good, over 2.0 = excellent — it means the stock gave you solid returns without too much turbulence. <strong className="t-secondary">Sortino Ratio:</strong> like Sharpe but only penalizes drops (ignores upside volatility) — higher is better. <strong className="t-secondary">Max Drawdown:</strong> the worst drop from peak to bottom in the last year — anything over -20% means it was a rough ride. Compare these to the S&P 500 (Sharpe ~1.0, Drawdown ~-10%) to see if this stock is riskier or calmer than the market.</p>
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
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Multi-Timeframe Opinion</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">What do the signals say for different time periods? Short-term = the next few days to 2 weeks. Medium-term = 2 weeks to 3 months. Long-term = 3+ months. "Buy" means signals are mostly positive. "Sell" means mostly negative. "Hold" means mixed — no clear direction yet.</p>
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
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Active Signals</h2>
        <p className="text-xs t-muted mb-4 leading-relaxed">These are all the buy/sell alerts currently firing for this stock. <strong className="text-bullish">Green = bullish</strong> (suggests price may go up). <strong className="text-bearish">Red = bearish</strong> (suggests price may go down). "Sev" = severity/importance — <strong className="t-secondary">Sev 3+ means a strong signal worth paying attention to.</strong> Timeframes: S = days to 2 weeks, M = 2 weeks to 3 months, L = 3+ months. <strong className="t-secondary">Tip:</strong> No single signal is a buy/sell decision. Look for multiple signals pointing the same direction — that's called "confluence" and it's much more reliable.</p>
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
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Dividend History</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">Dividends are like pocket money the company pays you for owning their stock. This chart shows how much they've paid each year. Growing bars = the company is paying you more each year (great!). DPS = Dividend Per Share, CAGR = how fast the dividend has grown over 5 years.</p>
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
            <p className="text-xs t-muted mb-4 leading-relaxed">Are the company's own bosses and employees buying or selling the stock? If they're buying with their own money, they probably believe the stock will go up (that's a good sign!). If they're selling a lot, they might know something we don't.</p>
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
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Recent News</h2>
          <p className="text-xs t-muted mb-4 leading-relaxed">Latest news articles about this stock. The colored bar shows the sentiment — green = positive news (good for the stock), red = negative news (bad for the stock). "AI" badge means the sentiment was analyzed by artificial intelligence.</p>
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
