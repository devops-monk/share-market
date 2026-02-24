import { Link } from 'react-router-dom';
import { useState } from 'react';

type Tab = 'basics' | 'dashboard' | 'indicators' | 'strategies';

export default function Guide() {
  const [activeTab, setActiveTab] = useState<Tab>('basics');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="card p-6 bg-gradient-to-br from-accent/10 via-surface-secondary to-bullish/5 border-accent/20">
        <h1 className="text-2xl font-bold t-primary mb-2">Learn to Analyze Stocks</h1>
        <p className="t-tertiary text-sm leading-relaxed max-w-2xl">
          New to investing? This guide will teach you everything you need to know — from basic stock market
          concepts to advanced technical analysis. Follow along step-by-step and use this dashboard to
          make informed decisions.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-secondary border border-surface-border overflow-x-auto">
        <TabBtn active={activeTab === 'basics'} onClick={() => setActiveTab('basics')} label="Stock Market Basics" emoji="1" />
        <TabBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="Using This Dashboard" emoji="2" />
        <TabBtn active={activeTab === 'indicators'} onClick={() => setActiveTab('indicators')} label="Technical Indicators" emoji="3" />
        <TabBtn active={activeTab === 'strategies'} onClick={() => setActiveTab('strategies')} label="Strategies" emoji="4" />
      </div>

      {/* Tab Content */}
      {activeTab === 'basics' && <BasicsTab onNext={() => setActiveTab('dashboard')} />}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'indicators' && <IndicatorsTab />}
      {activeTab === 'strategies' && <StrategiesTab />}

      {/* Disclaimer */}
      <div className="card p-5 border-amber-600/20 bg-amber-600/5">
        <h3 className="text-sm font-semibold text-neutral-light mb-2">Important Disclaimer</h3>
        <p className="text-xs t-tertiary leading-relaxed">
          This dashboard is for educational and informational purposes only. It does not constitute financial advice.
          Stock market investments carry risk — you can lose money. Past performance does not guarantee future results.
          Always do your own research (DYOR) and consider consulting a qualified financial advisor before making investment decisions.
          Never invest more than you can afford to lose.
        </p>
      </div>
    </div>
  );
}

/* ─── TAB BUTTON ─── */
function TabBtn({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-accent/15 text-accent-light border border-accent/20 shadow-sm'
          : 't-muted hover:t-secondary hover:bg-surface-hover'
      }`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
        active ? 'bg-accent text-white' : 'bg-surface-tertiary t-muted'
      }`}>{emoji}</span>
      {label}
    </button>
  );
}

/* ─── TAB 1: STOCK MARKET BASICS ─── */
function BasicsTab({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <Section title="What is a Stock?" icon="S">
        <p className="t-secondary text-sm leading-relaxed mb-4">
          A <strong className="t-primary">stock</strong> (or share) represents a small piece of ownership in a company.
          When you buy a stock, you become a partial owner. If the company does well, the stock price typically
          goes up and you can sell it for a profit. If it does poorly, the price drops.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConceptCard
            term="Stock Price"
            definition="The current cost to buy one share. Changes constantly during market hours based on supply and demand."
            example="Apple (AAPL) at $180 means one share costs $180."
          />
          <ConceptCard
            term="Market Cap"
            definition="The total value of all a company's shares. Stock Price x Total Shares = Market Cap."
            example="Small (<$2B), Mid ($2B-$10B), Large (>$10B)."
          />
        </div>
      </Section>

      <Section title="Key Terms You'll See on This Dashboard" icon="K">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConceptCard
            term="P/E Ratio (Price-to-Earnings)"
            definition="Stock price divided by earnings per share. Lower P/E can mean a stock is 'cheaper' relative to its earnings."
            example="P/E of 15 = you pay $15 for every $1 the company earns."
          />
          <ConceptCard
            term="Beta"
            definition="Measures how much a stock moves compared to the overall market. Beta of 1 = moves with market."
            example="Beta 1.5 = 50% more volatile than market. Beta 0.5 = half as volatile."
          />
          <ConceptCard
            term="Volume"
            definition="Number of shares traded in a day. High volume = lots of interest. Low volume = less activity."
            example="Vol Ratio 2.0x = today's volume is double the 20-day average."
          />
          <ConceptCard
            term="52-Week High / Low"
            definition="The highest and lowest price the stock reached in the past year. Useful for understanding the price range."
            example="Near 52W High = stock is performing well. Near 52W Low = may be struggling or undervalued."
          />
          <ConceptCard
            term="Bullish"
            definition="A signal or trend suggesting the stock price is likely to go UP. Think of a bull charging upward."
            example="Green badges and positive signals on this dashboard."
          />
          <ConceptCard
            term="Bearish"
            definition="A signal or trend suggesting the stock price is likely to go DOWN. Think of a bear swiping downward."
            example="Red badges and warning signals on this dashboard."
          />
          <ConceptCard
            term="Earnings Growth"
            definition="How fast a company's profits are growing. Positive growth = company is becoming more profitable."
            example="25% earnings growth = profits grew 25% compared to last year."
          />
          <ConceptCard
            term="Sentiment"
            definition="The overall mood around a stock based on news headlines. Positive sentiment = good news coverage."
            example="Score from -1 (very negative) to +1 (very positive). 0 = neutral."
          />
          <ConceptCard
            term="RS Percentile (Relative Strength)"
            definition="Ranks a stock's price performance against all other stocks. 99 = top performer, 1 = worst. Weighted: 40% 3-month, 30% 6-month, 30% 1-year returns."
            example="RS 90 = this stock outperformed 90% of all stocks tracked."
          />
          <ConceptCard
            term="ROE (Return on Equity)"
            definition="How much profit a company generates per dollar of shareholder equity. Higher = more efficient use of capital."
            example="ROE of 20% means the company earns $0.20 for every $1 of equity."
          />
          <ConceptCard
            term="PEG Ratio"
            definition="P/E ratio divided by earnings growth rate. Adjusts valuation for growth. PEG < 1 = potentially undervalued given its growth."
            example="P/E of 30 with 30% growth = PEG of 1.0 (fairly valued for growth)."
          />
          <ConceptCard
            term="Profit Margins"
            definition="How much of each dollar of revenue a company keeps as profit. Gross, operating, and net margins each show different layers."
            example="Gross Margin 60% = company keeps 60 cents of every dollar after cost of goods."
          />
          <ConceptCard
            term="Style Classification"
            definition="Categorises stocks as Value (low P/E, underpriced), Growth (high earnings growth, higher P/E), or Blend (mix of both)."
            example="A stock with P/E < 15 and low growth = Value. High earnings growth + high P/E = Growth."
          />
          <ConceptCard
            term="Accumulation / Distribution"
            definition="Rated A to E based on 13-week volume patterns. A/B = institutions buying (bullish). D/E = institutions selling (bearish)."
            example="Rating A = strong institutional buying over the past quarter."
          />
        </div>
      </Section>

      <Section title="US vs UK Markets" icon="M">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-sky-600/5 border border-sky-600/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge bg-sky-600/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-600/20 text-xs">US</span>
              <span className="text-sm font-semibold t-primary">United States</span>
            </div>
            <ul className="space-y-1 text-xs t-tertiary">
              <li>- NYSE & NASDAQ exchanges</li>
              <li>- Includes S&P 500, tech giants, growth stocks</li>
              <li>- Prices in USD ($)</li>
              <li>- Market hours: 9:30 AM - 4:00 PM ET</li>
              <li>- More data available (FinViz fundamentals)</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-slate-500/5 border border-slate-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge bg-slate-500/15 text-slate-500 dark:text-slate-400 ring-1 ring-slate-500/20 text-xs">UK</span>
              <span className="text-sm font-semibold t-primary">United Kingdom</span>
            </div>
            <ul className="space-y-1 text-xs t-tertiary">
              <li>- London Stock Exchange (LSE)</li>
              <li>- FTSE 100, FTSE 250, AIM stocks</li>
              <li>- Prices in GBP (p = pence)</li>
              <li>- Market hours: 8:00 AM - 4:30 PM GMT</li>
              <li>- Tickers end in .L (e.g., GSK.L)</li>
            </ul>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <NextTabBtn label="Using This Dashboard" onClick={onNext} />
      </div>
    </div>
  );
}

/* ─── TAB 2: USING THIS DASHBOARD ─── */
function DashboardTab() {
  return (
    <div className="space-y-6">
      <Section title="Step-by-Step: Find Your First Stock" icon="F">
        <div className="space-y-3">
          <Step num={1} title="Start with the Screener" page="/screener">
            Go to the <strong className="t-primary">Screener</strong> page. You'll see all stocks in a sortable table.
            Click the <strong className="t-primary">Composite Score</strong> column header to sort from highest to lowest.
            Stocks with higher scores have better overall indicators.
          </Step>
          <Step num={2} title="Filter to narrow down">
            Use the filters at the top:
            <ul className="mt-1 ml-4 space-y-0.5">
              <li>- <strong className="t-primary">Market:</strong> Choose US or UK based on where you invest</li>
              <li>- <strong className="t-primary">Cap Size:</strong> Large = safer, Small = more growth potential but riskier</li>
              <li>- <strong className="t-primary">Trading212:</strong> Check this if you use Trading212 to only see available stocks</li>
            </ul>
          </Step>
          <Step num={3} title="Look at the numbers">
            For each stock, quickly check:
            <ul className="mt-1 ml-4 space-y-0.5">
              <li>- <strong className="text-bullish">Composite Score 65+</strong> = Strong overall signal</li>
              <li>- <strong className="t-primary">RSI 30-70</strong> = Healthy range (not overbought or oversold)</li>
              <li>- <strong className="text-bullish">Positive Change %</strong> = Price going up today</li>
              <li>- <strong className="text-bullish">Positive Sentiment</strong> = Good news coverage</li>
            </ul>
          </Step>
          <Step num={4} title="Dive deeper" page="/stock/AAPL">
            Click any ticker name to open its <strong className="t-primary">detail page</strong>.
            Here you'll see the full score breakdown, all technical indicators, active signals, and recent news.
            Make sure the score is strong across <em>multiple</em> components, not just one.
          </Step>
          <Step num={5} title="Check for danger signs" page="/bearish">
            Before buying, always visit <strong className="t-primary">Bearish Alerts</strong>.
            If your stock appears here, it means multiple warning signals are active. Proceed with caution or wait
            for signals to clear.
          </Step>
          <Step num={6} title="Read the news" page="/news">
            Check <strong className="t-primary">News Sentiment</strong> for recent headlines.
            A stock with strong numbers but very negative recent news might be about to drop.
            Look for a consistent positive sentiment trend.
          </Step>
        </div>
      </Section>

      <Section title="Understanding the Composite Score (0-100)" icon="C">
        <p className="t-tertiary text-sm mb-4">
          Every stock gets a single score from 0 to 100. This combines 6 different factors so you can
          quickly compare stocks. Here's what makes up the score:
        </p>
        <div className="space-y-2">
          <ScoreBar label="Price Momentum" weight={25} desc="Is the price trending up over 3 and 6 months?" color="bg-accent" />
          <ScoreBar label="Technical Signals" weight={25} desc="Are technical indicators (RSI, MACD, etc.) pointing up?" color="bg-sky-700" />
          <ScoreBar label="News Sentiment" weight={15} desc="Are recent news headlines positive?" color="bg-teal-600" />
          <ScoreBar label="Fundamentals" weight={15} desc="Is the company profitable with good growth?" color="bg-amber-600" />
          <ScoreBar label="Volume Trend" weight={10} desc="Is trading activity supporting the price move?" color="bg-rose-600" />
          <ScoreBar label="Risk (Inverse)" weight={10} desc="Is the stock stable (low beta, low volatility)?" color="bg-green-700" />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <ScoreRange range="70-100" label="Strong Buy Signal" color="text-bullish" bg="bg-bullish/10 border-bullish/20" />
          <ScoreRange range="40-69" label="Neutral / Hold" color="text-neutral" bg="bg-neutral/10 border-neutral/20" />
          <ScoreRange range="0-39" label="Weak / Avoid" color="text-bearish" bg="bg-bearish/10 border-bearish/20" />
        </div>
        <Tip>
          A stock scoring 75 with balanced components (Momentum: 70, Technical: 80, Sentiment: 65) is a
          <strong className="t-primary"> much better pick</strong> than one scoring 80 with one extreme
          component (Momentum: 95) and weak others (Sentiment: 20).
        </Tip>
      </Section>

      <Section title="What Each Page Does" icon="P">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PageCard
            name="Overview"
            path="/"
            desc="Market summary at a glance. See how many stocks are bullish vs bearish, top performers by cap size, and bearish alert count."
            when="Check this first each day for a quick market pulse."
          />
          <PageCard
            name="Screener"
            path="/screener"
            desc="Full sortable table of all stocks with filters. Sort by any column, search by name, filter by market/cap/Trading212."
            when="Use this to find and compare stocks."
          />
          <PageCard
            name="Bearish Alerts"
            path="/bearish"
            desc="Stocks showing multiple danger signs. Bearish score counts how many warning signals are active and how severe they are."
            when="Check this before buying anything, and monitor stocks you already own."
          />
          <PageCard
            name="News Sentiment"
            path="/news"
            desc="Recent headlines with AI-scored sentiment. See what the news is saying about each stock."
            when="Use this to validate your picks and spot breaking developments."
          />
          <PageCard
            name="Heat Map"
            path="/heatmap"
            desc="Visual overview of all stocks grouped by sector. Rectangle size shows market cap, colour shows daily change. Spot sector trends at a glance."
            when="Use for a quick visual pulse on which sectors are hot or cold."
          />
          <PageCard
            name="Sectors"
            path="/sectors"
            desc="Sector-level analysis with average scores, change %, and top stocks per sector. Compare sector performance side by side."
            when="Use to identify strong sectors before drilling into individual stocks."
          />
          <PageCard
            name="Minervini Screen"
            path="/minervini"
            desc="Filters stocks using Mark Minervini's 8-criteria SEPA trend template. Only stocks in a confirmed Stage 2 uptrend pass all checks."
            when="Use to find stocks with the strongest technical setups for momentum breakouts."
          />
          <PageCard
            name="Buy the Dip"
            path="/dip"
            desc="Identifies oversold stocks with low RSI and price near Bollinger lower band. Ranks dip candidates by combined oversold signals."
            when="Use during market pullbacks to find quality stocks at temporarily low prices."
          />
          <PageCard
            name="Breakout Detection"
            path="/breakout"
            desc="Finds stocks with Bollinger Band squeezes and volume surges. Detects stocks about to make a big move after a quiet period."
            when="Use to catch stocks at the start of a new price move."
          />
          <PageCard
            name="Compare"
            path="/compare"
            desc="Side-by-side comparison of 2-4 stocks. Highlights the best value for each metric across price, fundamentals, technicals, and momentum."
            when="Use to choose between similar stocks or compare peers in the same sector."
          />
          <PageCard
            name="Watchlist"
            path="/watchlist"
            desc="Save stocks you're monitoring. Persisted in your browser so it survives page refreshes. Add/remove stocks with one click."
            when="Use to track stocks you're interested in without cluttering your portfolio."
          />
          <PageCard
            name="Alerts"
            path="/alerts"
            desc="Configure price, score, RSI, and Minervini alerts. Get Telegram notifications when conditions are met. Edge-triggered so you won't get spammed."
            when="Set up once, get notified automatically when stocks hit your targets."
          />
        </div>
      </Section>

      <Section title="New Features on Stock Detail Page" icon="N">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConceptCard
            term="Score Radar Chart"
            definition="A 6-axis radar showing each score dimension (Momentum, Technical, Sentiment, Fundamentals, Volume, Risk) so you can visually spot strengths and weaknesses at a glance."
            example="A balanced hexagon = well-rounded stock. A spike in one direction = strength (or weakness) in that area."
          />
          <ConceptCard
            term="Score History Chart"
            definition="Tracks how a stock's composite score has changed over time (30 or 90 day view). Shows trend direction and score stability."
            example="Score rising from 40 to 65 over 30 days = improving momentum. Score dropping = deteriorating setup."
          />
          <ConceptCard
            term="Support & Resistance Levels"
            definition="Algorithmically detected price levels where the stock has historically bounced (support) or stalled (resistance). Computed from OHLCV swing points."
            example="Support at $150 with 4 touches = strong floor. Resistance at $180 = price ceiling to watch for breakout."
          />
          <ConceptCard
            term="Expert Screens (Piotroski, Graham, Buffett)"
            definition="Three classic investment analysis scores computed from multi-year financial statements. Piotroski F-Score (0-9), Graham Number (fair value), and Buffett Quality Score (0-5)."
            example="Piotroski 8/9 + Graham Number above price = strong value pick. Buffett 5/5 = high quality moat business."
          />
          <ConceptCard
            term="Sector-Relative Scoring"
            definition="Z-score and rank within the stock's sector. Shows how a stock compares to its peers, not just the whole universe."
            example="Sector Rank 3/45 = 3rd best in its sector. Z-Score +1.5 = 1.5 standard deviations above sector average."
          />
          <ConceptCard
            term="Market Regime Indicator"
            definition="Shown on the Overview page. Tracks S&P 500 and FTSE 100 to determine if we're in a bull market, correction, or bear market using SMA analysis and distribution day counting."
            example="Bull = favor long positions. Correction = be selective, tighten stops. Bear = prioritize capital preservation."
          />
        </div>
      </Section>

      <Section title="URL Sharing for Screener" icon="U">
        <p className="t-tertiary text-sm">
          The Screener now saves your filters, sort order, and page number in the URL.
          This means you can <strong className="t-primary">bookmark</strong> a specific filtered view or
          <strong className="t-primary"> share a link</strong> with someone and they'll see the exact same view.
          Try filtering by market and style, then copy the URL from your browser.
        </p>
      </Section>
    </div>
  );
}

/* ─── TAB 3: TECHNICAL INDICATORS ─── */
function IndicatorsTab() {
  return (
    <div className="space-y-6">
      <div className="card p-4 bg-accent/5 border-accent/20">
        <p className="text-sm t-secondary leading-relaxed">
          Technical indicators are mathematical calculations based on price, volume, and time.
          They help predict where a stock price might go next. Think of them as <strong className="t-primary">health vitals</strong> for a stock —
          just like a doctor checks your heart rate and blood pressure, these indicators check a stock's "health."
        </p>
      </div>

      <Section title="RSI — Is the Stock Overbought or Oversold?" icon="R">
        <p className="t-tertiary text-sm mb-3">
          The <strong className="t-primary">Relative Strength Index (RSI)</strong> measures buying and selling pressure
          on a scale of 0-100. Think of it like a thermometer for stock demand.
        </p>
        <div className="flex gap-2 mb-3">
          <ZoneTag value="0-30" label="Oversold" color="bullish" desc="Stock may have been sold too much — potential bounce up" />
          <ZoneTag value="30-70" label="Normal" color="neutral" desc="Healthy trading range — no extreme" />
          <ZoneTag value="70-100" label="Overbought" color="bearish" desc="Stock may have been bought too much — potential pullback" />
        </div>
        <Tip>
          RSI Oversold does NOT mean "buy immediately." It means the stock <em>might</em> bounce.
          Combine RSI with other indicators for confirmation.
        </Tip>
      </Section>

      <Section title="MACD — Momentum Direction" icon="M">
        <p className="t-tertiary text-sm mb-3">
          <strong className="t-primary">MACD</strong> shows whether upward or downward momentum is getting stronger or weaker.
          It compares a fast moving average (12-day) to a slow one (26-day).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SignalExample direction="bullish" title="Positive Histogram" desc="The fast average is above the slow average — upward momentum is dominant. The bigger the bar, the stronger the trend." />
          <SignalExample direction="bearish" title="Negative Histogram" desc="The fast average is below the slow average — downward momentum is dominant. Getting more negative = trend strengthening." />
        </div>
        <Tip>
          The most powerful signal is when MACD crosses from negative to positive — this often marks the start of a new uptrend.
        </Tip>
      </Section>

      <Section title="Moving Averages (SMA 20, 50, 150 & 200)" icon="A">
        <p className="t-tertiary text-sm mb-3">
          A <strong className="t-primary">Simple Moving Average (SMA)</strong> smooths out price data over a period.
          We track four: SMA20 (short-term), SMA50 (medium), SMA150 (intermediate), and SMA200 (long-term).
          These act like support and resistance levels.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SignalExample direction="bullish" title="Golden Cross" desc="SMA50 crosses ABOVE SMA200. This is one of the most widely watched bullish signals in investing. Often marks the start of a major uptrend." />
          <SignalExample direction="bearish" title="Death Cross" desc="SMA50 crosses BELOW SMA200. A strong warning signal. Many institutional investors sell when this occurs." />
        </div>
        <div className="mt-3 p-3 rounded-lg bg-surface-hover border border-surface-border">
          <p className="text-xs t-tertiary mb-2"><strong className="t-secondary">Price Alignment (strongest signal):</strong></p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-bullish font-mono">Price {'>'} SMA50 {'>'} SMA150 {'>'} SMA200</span>
            <span className="t-faint">=</span>
            <span className="t-secondary">Strong uptrend (Minervini Stage 2). All averages confirm the move.</span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className="text-bearish font-mono">Price {'<'} SMA50 {'<'} SMA150 {'<'} SMA200</span>
            <span className="t-faint">=</span>
            <span className="t-secondary">Strong downtrend. Avoid or sell.</span>
          </div>
        </div>
        <Tip>
          The <strong className="t-primary">SMA 150</strong> is key to Mark Minervini's trend template.
          When Price {'>'} SMA50 {'>'} SMA150 {'>'} SMA200 and SMA200 is trending up, the stock is in a Stage 2 uptrend — the best phase for buying.
        </Tip>
      </Section>

      <Section title="Bollinger Bands — Volatility Channels" icon="B">
        <p className="t-tertiary text-sm mb-3">
          <strong className="t-primary">Bollinger Bands</strong> create a price channel around the 20-day average.
          The bands widen when a stock is volatile and narrow when it's calm.
          Think of them like guardrails — price usually stays inside.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <IndicatorCard
            title="Upper Band Touch"
            desc="Price near the top band = potentially overextended. If RSI is also high, a pullback may come."
            signal="bearish"
          />
          <IndicatorCard
            title="Lower Band Touch"
            desc="Price near the bottom band = potentially oversold. If RSI is also low, a bounce may come."
            signal="bullish"
          />
          <IndicatorCard
            title="Squeeze"
            desc="Bands become very narrow = low volatility. A big move (breakout) is likely coming soon. Direction TBD."
            signal="neutral"
          />
        </div>
        <Tip>
          <strong className="t-primary">%B</strong> on the detail page shows where the price sits within the bands.
          Above 1.0 = above upper band (extreme). Below 0.0 = below lower band (extreme). 0.5 = right at the middle.
        </Tip>
      </Section>

      <Section title="Stochastic Oscillator — Precision Timing" icon="S">
        <p className="t-tertiary text-sm mb-3">
          The <strong className="t-primary">Stochastic</strong> compares where the price closed relative to its
          range over 14 days. It has two lines: %K (fast) and %D (slow signal line).
          Great for timing entries and exits.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SignalExample direction="bullish" title="%K crosses above %D below 20" desc="Buy signal! The stock was oversold and momentum is now turning upward. Even stronger when RSI also confirms oversold." />
          <SignalExample direction="bearish" title="%K crosses below %D above 80" desc="Sell signal! The stock was overbought and momentum is turning downward. Even stronger when RSI also confirms overbought." />
        </div>
        <div className="mt-3 p-3 rounded-lg bg-amber-600/5 border border-amber-600/20">
          <p className="text-xs text-amber-300 font-semibold mb-1">Double Confirmation (Strongest Signal)</p>
          <p className="text-xs t-tertiary">
            When both RSI and Stochastic agree (both overbought or both oversold), the signal
            is rated <strong className="t-primary">severity 3</strong> — the highest level.
            These are the most reliable signals on the dashboard.
          </p>
        </div>
      </Section>

      <Section title="OBV — Follow the Smart Money" icon="O">
        <p className="t-tertiary text-sm mb-3">
          <strong className="t-primary">On-Balance Volume (OBV)</strong> tracks cumulative buying and selling pressure.
          The idea: volume precedes price. If big institutions are quietly buying (accumulating), OBV rises
          even before the price does.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-bullish/5 border border-bullish/20">
            <p className="text-xs font-bold text-bullish mb-2">Bullish Divergence</p>
            <div className="space-y-1 text-xs t-tertiary">
              <p>Price: <span className="text-bearish">falling</span></p>
              <p>OBV: <span className="text-bullish">rising</span></p>
              <p className="mt-2 t-secondary">Smart money is <strong>accumulating</strong> (buying) while the price drops.
              A reversal up is likely coming.</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-bearish/5 border border-bearish/20">
            <p className="text-xs font-bold text-bearish mb-2">Bearish Divergence</p>
            <div className="space-y-1 text-xs t-tertiary">
              <p>Price: <span className="text-bullish">rising</span></p>
              <p>OBV: <span className="text-bearish">falling</span></p>
              <p className="mt-2 t-secondary">Smart money is <strong>distributing</strong> (selling) while the price rises.
              A reversal down is likely coming.</p>
            </div>
          </div>
        </div>
        <Tip>
          OBV divergences are rated <strong className="t-primary">severity 3</strong> because they reveal institutional activity
          that retail investors often miss. Pay close attention when you see these signals.
        </Tip>
      </Section>

      <Section title="Accumulation / Distribution Rating" icon="D">
        <p className="t-tertiary text-sm mb-3">
          The <strong className="t-primary">Acc/Dist Rating</strong> (A through E) measures institutional buying vs selling
          over the past 13 weeks by comparing up-volume days to down-volume days.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <IndicatorCard title="Rating A / B" desc="Heavy institutional buying (accumulation). Up-volume significantly outweighs down-volume. Very bullish for the stock." signal="bullish" />
          <IndicatorCard title="Rating C" desc="Balanced buying and selling. Institutions are neutral — no strong conviction either way." signal="neutral" />
          <IndicatorCard title="Rating D / E" desc="Heavy institutional selling (distribution). Down-volume outweighs up-volume. Bearish — smart money is exiting." signal="bearish" />
        </div>
      </Section>

      <Section title="Fundamental Metrics" icon="F">
        <p className="t-tertiary text-sm mb-3">
          Beyond technical indicators, the dashboard now tracks <strong className="t-primary">expanded fundamentals</strong> for each stock.
          These help you understand the company's financial health, not just its price action.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConceptCard
            term="ROE & ROA"
            definition="Return on Equity and Return on Assets measure how efficiently the company uses capital. Higher is better."
            example="ROE > 15% is generally considered good. ROA > 5% shows efficient asset use."
          />
          <ConceptCard
            term="Debt-to-Equity"
            definition="Total debt divided by shareholder equity. Shows how leveraged the company is. Lower = less risk."
            example="D/E of 0.5 = moderate debt. D/E > 2.0 = heavily leveraged."
          />
          <ConceptCard
            term="Profit Margins (Gross / Operating / Net)"
            definition="How much of revenue the company keeps as profit at each stage. Gross > Operating > Net."
            example="Gross 60%, Operating 25%, Net 18% = healthy and profitable."
          />
          <ConceptCard
            term="Free Cash Flow"
            definition="Cash generated after all expenses and investments. Positive FCF = the company generates real cash, not just accounting profits."
            example="Companies with strong FCF can fund growth, pay dividends, and buy back shares."
          />
        </div>
      </Section>
    </div>
  );
}

/* ─── TAB 4: STRATEGIES ─── */
function StrategiesTab() {
  return (
    <div className="space-y-6">
      <div className="card p-4 bg-accent/5 border-accent/20">
        <p className="text-sm t-secondary leading-relaxed">
          Below are six proven strategies you can use with this dashboard. Start with
          <strong className="t-primary"> Momentum</strong> (easiest) and progress to the others
          as you get comfortable reading the indicators.
        </p>
      </div>

      <StrategyCard
        name="Momentum Investing"
        difficulty="Beginner"
        diffColor="text-bullish"
        goal="Find stocks that are already trending up and ride the wave."
        steps={[
          { action: 'Go to Screener', detail: 'Sort by Composite Score (highest first). Focus on scores above 65.', page: '/screener' },
          { action: 'Check momentum', detail: 'Look for positive 3-month return (3M Return > 0%). Higher is better.' },
          { action: 'Confirm with MACD', detail: 'On the stock detail page, check that MACD Histogram is positive (green).' },
          { action: 'Verify volume', detail: 'OBV Trend should be "rising" — this confirms real buying, not just price noise.' },
          { action: 'Safety check', detail: 'Bearish Score should be below 3. If it is 4+, skip this stock.' },
        ]}
        when="Best for trending markets when most stocks are going up."
        risk="Momentum can reverse quickly. Always set a stop-loss (a price at which you sell to limit losses)."
      />

      <StrategyCard
        name="Value + Reversal (Buy the Dip)"
        difficulty="Intermediate"
        diffColor="text-neutral"
        goal="Find quality stocks that have dropped too much and are due for a bounce."
        steps={[
          { action: 'Find oversold stocks', detail: 'In Screener, look for RSI below 35. These stocks have been heavily sold.', page: '/screener' },
          { action: 'Double confirm', detail: 'On detail page, check Stochastic %K is also below 20. Two indicators agreeing = stronger signal.' },
          { action: 'Look for smart money', detail: 'Check for OBV Bullish Divergence — price falling but volume accumulating.' },
          { action: 'Verify fundamentals', detail: 'P/E should be reasonable (not sky-high). Positive earnings growth is a must.' },
          { action: 'Wait for the signal', detail: 'Look for "BB Lower + RSI Low" signal — this means price is at the bottom of Bollinger Bands with oversold RSI.' },
        ]}
        when="Best during market corrections when quality stocks get unfairly punished."
        risk="Stocks can stay oversold longer than expected. Don't catch a falling knife — wait for reversal confirmation."
      />

      <StrategyCard
        name="Breakout Detection"
        difficulty="Intermediate"
        diffColor="text-neutral"
        goal="Catch stocks about to make a big move after a quiet period."
        steps={[
          { action: 'Find squeezes', detail: 'On stock detail pages, look for Bollinger Band Squeeze = YES. This means volatility is extremely low.' },
          { action: 'Watch for breakout', detail: 'When the price moves above the upper Bollinger Band, the squeeze is resolving upward.' },
          { action: 'Confirm volume', detail: 'Vol Ratio should be above 1.5x — the breakout needs volume to be real.', page: '/screener' },
          { action: 'Check OBV direction', detail: 'OBV should be rising. If volume doesn\'t support the breakout, it may be a false signal.' },
          { action: 'Set your stop', detail: 'Place stop-loss at the lower Bollinger Band. If price falls back inside, the breakout failed.' },
        ]}
        when="Works in any market condition. Squeezes happen regularly across all stocks."
        risk="Not all breakouts succeed. About 40% are 'false breakouts' that reverse — hence the stop-loss."
      />

      <StrategyCard
        name="Minervini SEPA Trend Template"
        difficulty="Advanced"
        diffColor="text-accent-light"
        goal="Find stocks in a confirmed Stage 2 uptrend using Mark Minervini's 8-point checklist — the setup used by US Investing Champion winners."
        steps={[
          { action: 'Go to Minervini Screen', detail: 'This page pre-filters stocks through all 8 criteria. Stocks passing 7-8 checks are prime candidates.', page: '/minervini' },
          { action: 'Check the 8 criteria', detail: 'Price > 150 & 200 SMA, SMA150 > SMA200, SMA200 trending up, SMA50 > SMA150 & SMA200, Price > SMA50, Price 30%+ above 52W low, Price within 25% of 52W high, RS Percentile > 70.' },
          { action: 'Confirm volume', detail: 'Look for Acc/Dist rating of A or B — institutional accumulation supporting the trend.' },
          { action: 'Look for a base pattern', detail: 'On the stock detail page, check the weekly high-low range (consolidation %). Tight consolidation (< 15%) near highs = building a launchpad.' },
          { action: 'Enter on breakout', detail: 'Buy when the stock breaks out of the consolidation with volume > 1.5x average. Set stop-loss at the base low.' },
        ]}
        when="Best during bull markets and sector rotations. Minervini stocks are leaders — they outperform in strong markets."
        risk="These high-RS stocks can drop sharply when the broad market turns. Always use a stop-loss (typically 7-8% below entry)."
      />

      <StrategyCard
        name="Fundamental Quality Screen"
        difficulty="Intermediate"
        diffColor="text-neutral"
        goal="Find financially healthy companies using key fundamental metrics — ROE, margins, cash flow, and reasonable valuation."
        steps={[
          { action: 'Start with Screener', detail: 'Sort by Composite Score. Then click into each candidate to check the Fundamentals section on the detail page.', page: '/screener' },
          { action: 'Check profitability', detail: 'ROE > 15%, Profit Margin > 10%, Positive Free Cash Flow. These show a company that consistently generates real profits.' },
          { action: 'Assess valuation', detail: 'P/E reasonable for the sector (< 25 for value, or PEG < 1.5 for growth). Compare to sector average on the Sectors page.', page: '/sectors' },
          { action: 'Check financial health', detail: 'Debt-to-Equity < 1.5, Current Ratio > 1.0. Low debt and enough cash to cover short-term obligations.' },
          { action: 'Compare peers', detail: 'Use the Compare page to put 2-3 similar stocks side by side. The best metrics are highlighted green.', page: '/compare' },
        ]}
        when="Works in all market conditions. Quality companies with strong fundamentals tend to outperform over the long term."
        risk="Even great companies can be overvalued. Always check P/E and PEG to ensure you're not overpaying."
      />

      <StrategyCard
        name="Piotroski F-Score (Value Investing)"
        difficulty="Intermediate"
        diffColor="text-neutral"
        goal="Identify financially strong value stocks using Joseph Piotroski's 9-point fundamental checklist — proven to beat the market."
        steps={[
          { action: 'Check F-Score on detail page', detail: 'Each stock now shows a Piotroski F-Score (0-9) in the Expert Screens section. Look for scores of 7-9.' },
          { action: 'Understand the 9 criteria', detail: 'Positive net income, positive ROA, positive operating cash flow, cash flow > net income, declining debt ratio, improving current ratio, no dilution, improving margins, improving asset turnover.' },
          { action: 'Combine with valuation', detail: 'F-Score works best with low P/E or low P/B stocks. A high F-Score on a cheap stock = classic value buy.' },
          { action: 'Check Graham Number', detail: 'Also shown on the detail page. If stock price < Graham Number, it may be undervalued by Benjamin Graham\'s formula (sqrt of 22.5 x EPS x Book Value).' },
        ]}
        when="Best for patient investors looking for undervalued, fundamentally improving companies."
        risk="Value stocks can stay cheap for a long time. Combine with technical signals for better timing."
      />

      <StrategyCard
        name="Buffett Quality + Moat Screen"
        difficulty="Intermediate"
        diffColor="text-neutral"
        goal="Find companies with durable competitive advantages — consistent profits, low debt, and high returns on equity."
        steps={[
          { action: 'Check Buffett Score', detail: 'Found in Expert Screens on the detail page. Score of 4-5/5 = high quality business.' },
          { action: 'Look for the 5 criteria', detail: 'Consistently profitable (all years), ROE > 15%, low debt-to-equity, growing revenue, positive free cash flow.' },
          { action: 'Verify with margins', detail: 'Gross Margin > 40% = durable competitive advantage (Buffett\'s favorite metric). Check in the Fundamentals section.' },
          { action: 'Compare to Graham Number', detail: 'Buffett evolved Graham\'s approach: "Buy a wonderful company at a fair price." Piotroski 7+ AND Buffett 4+ = premium quality.' },
        ]}
        when="Works in all markets. Quality companies recover faster from downturns."
        risk="Quality comes at a premium. These stocks may seem expensive on P/E — use PEG ratio to adjust for growth."
      />

      <StrategyCard
        name="Risk Avoidance (Protect Your Portfolio)"
        difficulty="Essential"
        diffColor="text-bearish"
        goal="Avoid losses by identifying stocks about to decline."
        steps={[
          { action: 'Check alerts daily', detail: 'Visit Bearish Alerts page. Any stock you own appearing here needs attention.', page: '/bearish' },
          { action: 'Watch severity', detail: 'Bearish Score 4-5 = caution. Score 6+ = serious warning. Consider selling or reducing position.' },
          { action: 'OBV is your friend', detail: 'If a stock you own shows OBV Bearish Divergence, smart money may be exiting. Take note.' },
          { action: 'Death Cross alert', detail: 'A Death Cross (SMA50 < SMA200) + negative MACD = strong sell signal. Many pros exit here.' },
          { action: 'Don\'t panic sell', detail: 'One bearish signal alone isn\'t a reason to sell. Multiple converging signals (3+) is when to act.' },
        ]}
        when="Always. This is not a strategy you turn on and off — it's constant portfolio monitoring."
        risk="Being too cautious can mean missing rebounds. Balance caution with conviction."
      />

      <Section title="Golden Rules for Beginners" icon="G">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RuleCard num={1} title="Never use just one indicator" desc="Always confirm with at least 2-3 indicators pointing the same direction. One indicator alone can give false signals." />
          <RuleCard num={2} title="Don't fight the trend" desc="If SMA50 is below SMA200 (Death Cross), don't try to buy. Wait for the trend to reverse first." />
          <RuleCard num={3} title="Volume confirms everything" desc="A price move without volume is suspicious. Always check Vol Ratio and OBV to confirm moves are real." />
          <RuleCard num={4} title="Start with large caps" desc="Large cap stocks are more stable and predictable. Master the indicators with these before trying small caps." />
          <RuleCard num={5} title="Check the news" desc="Numbers don't capture everything. A stock can have great technicals but terrible news (lawsuit, scandal). Always check sentiment." />
          <RuleCard num={6} title="Set stop-losses" desc="Before buying, decide the price at which you'll sell to limit losses. Typically 5-10% below your buy price." />
        </div>
      </Section>
    </div>
  );
}

/* ─── SHARED COMPONENTS ─── */

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center text-accent-light text-xs font-bold">
          {icon}
        </div>
        <h2 className="text-sm font-semibold t-primary">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ConceptCard({ term, definition, example }: { term: string; definition: string; example: string }) {
  return (
    <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
      <h4 className="text-sm font-semibold t-primary mb-1">{term}</h4>
      <p className="text-xs t-tertiary mb-2">{definition}</p>
      <p className="text-xs t-muted italic">{example}</p>
    </div>
  );
}

function Step({ num, title, page, children }: { num: number; title: string; page?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-accent-light text-sm font-bold">
        {num}
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold t-primary">{title}</h4>
          {page && (
            <Link to={page} className="text-xs text-accent-light hover:t-primary transition-colors">
              Go &rarr;
            </Link>
          )}
        </div>
        <p className="text-xs t-tertiary leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function ScoreBar({ label, weight, desc, color }: { label: string; weight: number; desc: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-[120px]">
        <span className="text-xs font-medium t-primary">{label}</span>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-3 bg-surface-tertiary rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${weight * 4}%` }} />
        </div>
        <span className="text-xs font-mono t-tertiary w-8 text-right">{weight}%</span>
      </div>
      <p className="hidden lg:block text-xs t-muted min-w-[200px]">{desc}</p>
    </div>
  );
}

function ScoreRange({ range, label, color, bg }: { range: string; label: string; color: string; bg: string }) {
  return (
    <div className={`p-3 rounded-lg border text-center ${bg}`}>
      <p className={`text-lg font-bold font-mono ${color}`}>{range}</p>
      <p className="text-xs t-tertiary mt-1">{label}</p>
    </div>
  );
}

function PageCard({ name, path, desc, when }: { name: string; path: string; desc: string; when: string }) {
  return (
    <Link to={path} className="block p-4 rounded-lg bg-surface-hover border border-surface-border hover:border-accent/30 transition-colors group">
      <h4 className="text-sm font-semibold t-primary group-hover:text-accent-light transition-colors mb-1">{name}</h4>
      <p className="text-xs t-tertiary mb-2">{desc}</p>
      <p className="text-xs text-accent-light/70">{when}</p>
    </Link>
  );
}

function ZoneTag({ value, label, color, desc }: { value: string; label: string; color: string; desc: string }) {
  const colorMap = { bullish: 'bg-bullish/10 border-bullish/20 text-bullish', bearish: 'bg-bearish/10 border-bearish/20 text-bearish', neutral: 'bg-neutral/10 border-neutral/20 text-neutral' };
  return (
    <div className={`flex-1 p-3 rounded-lg border ${colorMap[color as keyof typeof colorMap]}`}>
      <p className="text-sm font-bold font-mono">{value}</p>
      <p className="text-xs font-semibold mt-0.5">{label}</p>
      <p className="text-xs t-muted mt-1">{desc}</p>
    </div>
  );
}

function SignalExample({ direction, title, desc }: { direction: 'bullish' | 'bearish'; title: string; desc: string }) {
  const isBull = direction === 'bullish';
  return (
    <div className={`p-3 rounded-lg border ${isBull ? 'border-bullish/20 bg-bullish/5' : 'border-bearish/20 bg-bearish/5'}`}>
      <p className={`text-xs font-bold mb-1 ${isBull ? 'text-bullish' : 'text-bearish'}`}>{title}</p>
      <p className="text-xs t-tertiary">{desc}</p>
    </div>
  );
}

function IndicatorCard({ title, desc, signal }: { title: string; desc: string; signal: 'bullish' | 'bearish' | 'neutral' }) {
  const colors = { bullish: 'border-bullish/20 bg-bullish/5', bearish: 'border-bearish/20 bg-bearish/5', neutral: 'border-neutral/20 bg-neutral/5' };
  const textColors = { bullish: 'text-bullish', bearish: 'text-bearish', neutral: 'text-neutral' };
  return (
    <div className={`p-3 rounded-lg border ${colors[signal]}`}>
      <p className={`text-xs font-bold mb-1 ${textColors[signal]}`}>{title}</p>
      <p className="text-xs t-tertiary">{desc}</p>
    </div>
  );
}

function StrategyCard({ name, difficulty, diffColor, goal, steps, when, risk }: {
  name: string; difficulty: string; diffColor: string; goal: string;
  steps: { action: string; detail: string; page?: string }[]; when: string; risk: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold t-primary">{name}</h3>
        <span className={`text-xs font-semibold ${diffColor}`}>{difficulty}</span>
      </div>
      <p className="text-sm t-tertiary mb-4">{goal}</p>
      <div className="space-y-3 mb-4">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-tertiary flex items-center justify-center text-xs font-bold t-tertiary">
              {i + 1}
            </div>
            <div className="pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold t-primary">{s.action}</span>
                {s.page && (
                  <Link to={s.page} className="text-xs text-accent-light hover:t-primary transition-colors">Go &rarr;</Link>
                )}
              </div>
              <p className="text-xs t-tertiary mt-0.5">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-bullish/5 border border-bullish/20">
          <p className="text-xs font-semibold text-bullish mb-1">Best When</p>
          <p className="text-xs t-tertiary">{when}</p>
        </div>
        <div className="p-3 rounded-lg bg-bearish/5 border border-bearish/20">
          <p className="text-xs font-semibold text-bearish mb-1">Risk</p>
          <p className="text-xs t-tertiary">{risk}</p>
        </div>
      </div>
    </div>
  );
}

function RuleCard({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="p-3 rounded-lg bg-surface-hover border border-surface-border flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center text-accent-light text-xs font-bold">
        {num}
      </div>
      <div>
        <p className="text-xs font-semibold t-primary mb-0.5">{title}</p>
        <p className="text-xs t-tertiary">{desc}</p>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
      <p className="text-xs t-tertiary"><strong className="text-accent-light">Tip:</strong> {children}</p>
    </div>
  );
}

function NextTabBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs text-accent-light hover:t-primary transition-colors flex items-center gap-1">
      Next: {label} &rarr;
    </button>
  );
}
