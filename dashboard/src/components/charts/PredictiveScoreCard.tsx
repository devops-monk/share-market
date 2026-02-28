import type { PredictiveScore } from '../../types';

interface Props {
  currentScore: number;
  predictiveScore: PredictiveScore;
}

const directionConfig = {
  improving: { label: 'Improving', color: 'text-bullish', bg: 'bg-bullish/10', arrow: '\u2191' },
  stable: { label: 'Stable', color: 't-muted', bg: 'bg-surface-hover', arrow: '\u2192' },
  declining: { label: 'Declining', color: 'text-bearish', bg: 'bg-bearish/10', arrow: '\u2193' },
};

const confidenceConfig = {
  low: { label: 'Low', color: 't-muted', dots: 1 },
  medium: { label: 'Medium', color: 'text-accent-light', dots: 2 },
  high: { label: 'High', color: 'text-bullish', dots: 3 },
};

export default function PredictiveScoreCard({ currentScore, predictiveScore: ps }: Props) {
  const dir = directionConfig[ps.direction];
  const conf = confidenceConfig[ps.confidence];
  const delta = ps.predicted - currentScore;

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Predictive Score</h2>
      <p className="text-xs t-muted mb-4 leading-relaxed">
        Forecasted score based on trend analysis, mean reversion signals, and technical indicators. Higher confidence means more consistent historical trend.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Current vs Predicted */}
        <div className="text-center">
          <p className="text-xs t-muted mb-1">Current</p>
          <p className="text-2xl font-bold font-mono t-primary">{currentScore}</p>
        </div>
        <div className="text-center">
          <p className="text-xs t-muted mb-1">Predicted</p>
          <p className={`text-2xl font-bold font-mono ${delta >= 0 ? 'text-bullish' : 'text-bearish'}`}>
            {ps.predicted}
          </p>
          <p className={`text-xs mt-0.5 ${delta >= 0 ? 'text-bullish' : 'text-bearish'}`}>
            {delta >= 0 ? '+' : ''}{delta} pts
          </p>
        </div>

        {/* Direction */}
        <div className="text-center">
          <p className="text-xs t-muted mb-1">Direction</p>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${dir.color} ${dir.bg}`}>
            <span className="text-lg">{dir.arrow}</span>
            {dir.label}
          </span>
        </div>

        {/* Confidence */}
        <div className="text-center">
          <p className="text-xs t-muted mb-1">Confidence</p>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i <= conf.dots ? (conf.dots === 3 ? 'bg-bullish' : conf.dots === 2 ? 'bg-accent' : 'bg-surface-border') : 'bg-surface-border'
                }`}
              />
            ))}
            <span className={`text-sm font-medium ml-1 ${conf.color}`}>{conf.label}</span>
          </div>
          <p className="text-xs t-muted mt-0.5">R\u00B2 = {ps.r2.toFixed(2)}</p>
        </div>
      </div>

      {/* Factors breakdown */}
      <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
        <p className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-2">Driving Factors</p>
        <div className="grid grid-cols-3 gap-3">
          <FactorBar label="Trend Momentum" value={ps.factors.trendMomentum} />
          <FactorBar label="Mean Reversion" value={ps.factors.meanReversion} />
          <FactorBar label="Technical Support" value={ps.factors.technicalSupport} />
        </div>
      </div>
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const pct = ((value + 1) / 2) * 100; // -1..1 → 0..100
  const isPositive = value >= 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs t-muted">{label}</span>
        <span className={`text-xs font-mono ${isPositive ? 'text-bullish' : 'text-bearish'}`}>
          {value >= 0 ? '+' : ''}{value.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 bg-surface-border rounded-full overflow-hidden relative">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-surface-border z-10" />
        {/* Fill bar */}
        <div
          className={`absolute top-0 h-full rounded-full ${isPositive ? 'bg-bullish' : 'bg-bearish'}`}
          style={{
            left: isPositive ? '50%' : `${pct}%`,
            width: `${Math.abs(pct - 50)}%`,
          }}
        />
      </div>
    </div>
  );
}
