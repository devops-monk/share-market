import { Link } from 'react-router-dom';

export default function Guide() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">How to Analyze Stocks</h1>
        <p className="text-gray-400">A practical guide to using this dashboard for finding high-potential stocks and avoiding risky ones.</p>
      </div>

      {/* Quick Start */}
      <Section title="Quick Start: Finding the Best Stocks">
        <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm leading-relaxed">
          <li>Go to the <Link to="/screener" className="text-accent-light hover:text-white transition-colors">Screener</Link> and sort by <strong className="text-white">Composite Score</strong> (highest first).</li>
          <li>Filter by your preferred market (US/UK) and cap size.</li>
          <li>Look for stocks with scores above <strong className="text-white">65</strong> — these have strong momentum, good technicals, and positive sentiment.</li>
          <li>Click on a stock to see the full breakdown — check that multiple score components are strong, not just one.</li>
          <li>Check the <Link to="/bearish" className="text-accent-light hover:text-white transition-colors">Bearish Alerts</Link> to make sure your picks aren't flagged.</li>
          <li>Review the <Link to="/news" className="text-accent-light hover:text-white transition-colors">News Sentiment</Link> for recent headlines.</li>
        </ol>
      </Section>

      {/* Composite Score */}
      <Section title="Understanding the Composite Score (0-100)">
        <p className="text-gray-400 text-sm mb-4">Each stock gets a composite score from 0-100 based on 6 weighted factors:</p>
        <div className="space-y-3">
          <ScoreRow label="Price Momentum" weight="25%" desc="3-month and 6-month price returns. Stocks trending up strongly score higher." />
          <ScoreRow label="Technical Signals" weight="25%" desc="RSI position, MACD direction, moving average alignment, Bollinger Band position, Stochastic readings. Multiple bullish signals = higher score." />
          <ScoreRow label="News Sentiment" weight="15%" desc="Average sentiment of recent headlines. Positive news coverage lifts the score." />
          <ScoreRow label="Fundamentals" weight="15%" desc="P/E ratio (lower is better), earnings growth, and revenue growth rates." />
          <ScoreRow label="Volume Trend" weight="10%" desc="Current volume vs 20-day average. Above-average volume on up days is bullish." />
          <ScoreRow label="Risk (Inverse)" weight="10%" desc="Lower beta and lower volatility = higher score. Penalizes erratic, high-risk stocks." />
        </div>
        <div className="mt-4 p-3 rounded-lg bg-surface-hover border border-surface-border">
          <p className="text-xs text-gray-400"><strong className="text-gray-300">Tip:</strong> A stock scoring 75+ across multiple components is a stronger candidate than one scoring 90 in momentum alone but 30 in fundamentals.</p>
        </div>
      </Section>

      {/* Technical Indicators */}
      <Section title="Technical Indicators Explained">
        <div className="space-y-4">
          <Indicator
            name="RSI (Relative Strength Index)"
            desc="Measures if a stock is overbought or oversold on a 0-100 scale."
            bullets={[
              'Below 30 = oversold (potential buying opportunity)',
              'Above 70 = overbought (potential sell signal)',
              '40-60 = neutral territory',
            ]}
          />
          <Indicator
            name="MACD (Moving Average Convergence Divergence)"
            desc="Shows momentum direction using the difference between fast and slow moving averages."
            bullets={[
              'Positive histogram = bullish momentum',
              'Negative histogram = bearish momentum',
              'Crossing from negative to positive = buy signal',
            ]}
          />
          <Indicator
            name="SMA 50 & SMA 200 (Moving Averages)"
            desc="Smoothed price trends over 50 and 200 days."
            bullets={[
              'Golden Cross: SMA50 crosses above SMA200 = strong bullish signal',
              'Death Cross: SMA50 crosses below SMA200 = strong bearish signal',
              'Price > SMA50 > SMA200 = healthy uptrend',
            ]}
          />
          <Indicator
            name="Bollinger Bands"
            desc="Dynamic price channels based on 20-day SMA and standard deviation."
            bullets={[
              'Price near upper band + high RSI = potential reversal down',
              'Price near lower band + low RSI = potential bounce up',
              'Squeeze (narrow bands) = low volatility, breakout imminent',
              '%B above 1.0 = above upper band; below 0.0 = below lower band',
            ]}
          />
          <Indicator
            name="Stochastic Oscillator"
            desc="Compares closing price to its range over 14 periods."
            bullets={[
              'Above 80 = overbought zone',
              'Below 20 = oversold zone',
              '%K crossing below %D in overbought = sell signal',
              '%K crossing above %D in oversold = buy signal',
              'Double confirmation (RSI + Stochastic agree) = strongest signals',
            ]}
          />
          <Indicator
            name="OBV (On-Balance Volume)"
            desc="Tracks cumulative volume flow to detect smart money moves."
            bullets={[
              'Bullish divergence: price falling but OBV rising = accumulation (smart money buying)',
              'Bearish divergence: price rising but OBV falling = distribution (smart money selling)',
              'OBV confirming price trend = trend likely to continue',
            ]}
          />
        </div>
      </Section>

      {/* Signal Guide */}
      <Section title="Reading Signals">
        <p className="text-gray-400 text-sm mb-4">Signals are automatically detected conditions. Each has a direction (bullish/bearish) and severity (1-3).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SignalCard direction="bearish" severity={3} examples={['Death Cross', 'RSI + Stochastic Overbought', 'OBV Bearish Divergence']} desc="High-severity bearish — strong warning signs" />
          <SignalCard direction="bearish" severity={2} examples={['RSI Overbought', 'MACD Bearish', 'Volume Spike Decline']} desc="Medium-severity bearish — caution warranted" />
          <SignalCard direction="bullish" severity={3} examples={['RSI + Stochastic Oversold', 'OBV Bullish Divergence']} desc="High-severity bullish — strong buying signals" />
          <SignalCard direction="bullish" severity={2} examples={['Golden Cross', 'RSI Oversold', 'BB Squeeze']} desc="Medium-severity bullish — positive outlook" />
        </div>
        <div className="mt-4 p-3 rounded-lg bg-surface-hover border border-surface-border">
          <p className="text-xs text-gray-400"><strong className="text-gray-300">Bearish Score:</strong> Sum of all bearish signal severities. Stocks with a bearish score of 4+ appear in <Link to="/bearish" className="text-accent-light hover:text-white">Bearish Alerts</Link>. A higher bearish score means more danger signs are converging.</p>
        </div>
      </Section>

      {/* Strategies */}
      <Section title="Analysis Strategies">
        <div className="space-y-4">
          <Strategy
            name="Momentum Investing"
            steps={[
              'Sort screener by composite score (descending)',
              'Filter for 3-month return > 10%',
              'Confirm with positive MACD and RSI between 50-70',
              'Check OBV trend is rising to confirm volume supports the move',
              'Avoid if bearish score > 2',
            ]}
          />
          <Strategy
            name="Value + Reversal"
            steps={[
              'Look for stocks with RSI < 35 (oversold)',
              'Confirm with Stochastic in oversold zone (%K < 20)',
              'Check for OBV bullish divergence (smart money buying the dip)',
              'Verify low P/E ratio and positive earnings growth',
              'Look for BB Lower + RSI Low signal for timing',
            ]}
          />
          <Strategy
            name="Breakout Detection"
            steps={[
              'Filter for stocks with Bollinger Band Squeeze = YES',
              'Wait for price to break above the upper band',
              'Confirm with above-average volume (Vol Ratio > 1.5x)',
              'Check OBV is rising to support the breakout',
              'Set stop-loss at the lower Bollinger Band',
            ]}
          />
          <Strategy
            name="Risk Avoidance"
            steps={[
              'Check Bearish Alerts page daily',
              'Avoid stocks with bearish score >= 6',
              'Watch for OBV bearish divergence on stocks you own',
              'Be cautious of Death Cross + negative MACD combo',
              'Reduce exposure when multiple holdings show bearish signals',
            ]}
          />
        </div>
      </Section>

      {/* Disclaimer */}
      <div className="card p-5 border-amber-500/20 bg-amber-500/5">
        <h3 className="text-sm font-semibold text-amber-400 mb-2">Disclaimer</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          This dashboard is for educational and informational purposes only. It does not constitute financial advice.
          Stock market investments carry risk and past performance does not guarantee future results.
          Always do your own research and consider consulting a qualified financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function ScoreRow({ label, weight, desc }: { label: string; weight: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-2 min-w-[140px]">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-xs text-gray-500 font-mono">{weight}</span>
      </div>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}

function Indicator({ name, desc, bullets }: { name: string; desc: string; bullets: string[] }) {
  return (
    <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
      <h4 className="text-sm font-semibold text-white mb-1">{name}</h4>
      <p className="text-xs text-gray-400 mb-2">{desc}</p>
      <ul className="space-y-1">
        {bullets.map((b, i) => (
          <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
            <span className="text-gray-600 mt-0.5">-</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignalCard({ direction, severity, examples, desc }: {
  direction: 'bullish' | 'bearish'; severity: number; examples: string[]; desc: string;
}) {
  const isBear = direction === 'bearish';
  return (
    <div className={`p-3 rounded-lg border ${isBear ? 'border-bearish/20 bg-bearish/5' : 'border-bullish/20 bg-bullish/5'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-bold ${isBear ? 'text-bearish' : 'text-bullish'}`}>
          {direction.toUpperCase()} - Severity {severity}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-2">{desc}</p>
      <div className="flex flex-wrap gap-1">
        {examples.map(e => (
          <span key={e} className={`text-xs px-2 py-0.5 rounded ${isBear ? 'bg-bearish/10 text-bearish' : 'bg-bullish/10 text-bullish'}`}>
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

function Strategy({ name, steps }: { name: string; steps: string[] }) {
  return (
    <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
      <h4 className="text-sm font-semibold text-white mb-2">{name}</h4>
      <ol className="list-decimal list-inside space-y-1">
        {steps.map((s, i) => (
          <li key={i} className="text-xs text-gray-300">{s}</li>
        ))}
      </ol>
    </div>
  );
}
