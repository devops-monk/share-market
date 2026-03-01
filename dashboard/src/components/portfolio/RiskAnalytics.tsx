/**
 * N31: Portfolio Risk Analytics Dashboard
 * VaR, Monte Carlo, drawdown, sector concentration, risk metrics
 */
import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { StockRecord } from '../../types';
import InfoTooltip from '../common/InfoTooltip';
import {
  computePortfolioReturns,
  computeVaR,
  monteCarloSimulation,
  computeSectorConcentration,
  computePortfolioDrawdown,
  computePortfolioBeta,
  computePortfolioSharpe,
  computeHoldingRisks,
} from '../../lib/portfolio-risk';

interface PortfolioPosition {
  ticker: string;
  stock: StockRecord | undefined;
  totalShares: number;
  avgCost: number;
  totalCost: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
}

interface Props {
  portfolio: PortfolioPosition[];
  stocks: StockRecord[];
  ohlcvData: Map<string, number[][]>;
}

const COLORS = ['#3b82f6','#16a34a','#d97706','#dc2626','#0284c7','#0d9488','#c2410c','#9333ea','#0891b2','#7c3aed'];

/* ─── PIE CHART (SVG) ─── */
function PieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;

  const cx = 80, cy = 80, r = 70;
  let cumAngle = -Math.PI / 2;
  const paths: JSX.Element[] = [];

  for (const slice of slices) {
    const angle = (slice.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    paths.push(
      <path
        key={slice.label}
        d={`M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`}
        fill={slice.color}
        stroke="var(--surface)"
        strokeWidth="2"
      >
        <title>{slice.label}: {((slice.value / total) * 100).toFixed(1)}%</title>
      </path>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={160} height={160} viewBox="0 0 160 160">{paths}</svg>
      <div className="space-y-1.5">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="t-secondary">{s.label}</span>
            <span className="font-mono t-muted">{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RiskAnalytics({ portfolio, stocks, ohlcvData }: Props) {
  const [showHelp, setShowHelp] = useState(false);

  const totalValue = portfolio.reduce((a, p) => a + p.currentValue, 0);

  // Portfolio returns
  const { dates: portDates, returns: portReturns } = useMemo(
    () => computePortfolioReturns(ohlcvData, portfolio),
    [ohlcvData, portfolio],
  );

  // VaR
  const varResult = useMemo(
    () => computeVaR(portReturns, totalValue),
    [portReturns, totalValue],
  );

  // Monte Carlo
  const mcResult = useMemo(
    () => monteCarloSimulation(portReturns, totalValue, 252, 500),
    [portReturns, totalValue],
  );

  // Sector concentration
  const sectorData = useMemo(
    () => computeSectorConcentration(portfolio),
    [portfolio],
  );

  // Drawdown
  const drawdownResult = useMemo(
    () => computePortfolioDrawdown(portDates, portReturns),
    [portDates, portReturns],
  );

  // Beta (use first ticker with most data as market proxy — typically a broad ETF or largest holding)
  const marketProxy = useMemo(() => {
    // Try to use SPY-like data, fallback to largest holding
    for (const ticker of ['SPY', 'VOO', 'QQQ']) {
      if (ohlcvData.has(ticker)) {
        const candles = ohlcvData.get(ticker)!;
        const returns: number[] = [];
        for (let i = 1; i < candles.length; i++) {
          const prev = candles[i - 1][4];
          const curr = candles[i][4];
          if (prev > 0 && curr > 0) returns.push((curr - prev) / prev);
        }
        return returns;
      }
    }
    // Fallback: use equal-weighted average of all holdings as a pseudo-market
    return portReturns;
  }, [ohlcvData, portReturns]);

  const beta = useMemo(
    () => computePortfolioBeta(portReturns, marketProxy),
    [portReturns, marketProxy],
  );

  const sharpe = useMemo(
    () => computePortfolioSharpe(portReturns),
    [portReturns],
  );

  // Holding risks
  const holdingRisks = useMemo(
    () => computeHoldingRisks(portfolio, ohlcvData),
    [portfolio, ohlcvData],
  );

  // Not enough data guard
  if (portReturns.length < 20) {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-semibold t-primary mb-2">Not enough data for risk analytics</p>
        <p className="t-muted text-sm">Add at least 2 holdings with available price history to see risk metrics.</p>
      </div>
    );
  }

  // Chart data
  const mcChartData = mcResult.bands.p50.map((_, i) => ({
    day: i + 1,
    p5: mcResult.bands.p5[i],
    p25: mcResult.bands.p25[i],
    p50: mcResult.bands.p50[i],
    p75: mcResult.bands.p75[i],
    p95: mcResult.bands.p95[i],
  })).filter((_, i) => i % 5 === 0 || i === mcResult.days - 1); // Sample every 5 days for performance

  const ddChartData = drawdownResult.drawdownSeries.map((dd, i) => ({
    date: drawdownResult.dates[i]
      ? new Date(drawdownResult.dates[i] * 1000).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      : '',
    drawdown: dd * 100,
  })).filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 200)) === 0); // limit points

  const sectorSlices = sectorData.map((s, i) => ({
    label: s.sector,
    value: s.value,
    color: COLORS[i % COLORS.length],
  }));

  const fmtDollar = (v: number) => `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

  return (
    <div className="space-y-5">
      {/* Help toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowHelp(v => !v)}
          className="badge bg-surface-hover t-muted ring-1 ring-surface-border hover:t-secondary transition-colors cursor-pointer text-xs px-3 py-1.5"
        >
          {showHelp ? 'Hide Explanations' : 'What do these mean?'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card border-t-2 border-t-bearish">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
            <InfoTooltip text="Value at Risk (95%): The maximum expected daily loss, 19 out of 20 trading days">VaR (95%)</InfoTooltip>
          </p>
          <p className="text-xl font-bold text-bearish mt-1 font-mono tabular-nums">{fmtDollar(varResult.var95)}</p>
          <p className="text-xs t-muted mt-1">{fmtPct(varResult.var95Pct)} of portfolio</p>
        </div>
        <div className="stat-card border-t-2 border-t-bearish">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
            <InfoTooltip text="Conditional VaR: Average loss when losses exceed VaR — the expected loss on a really bad day">CVaR (95%)</InfoTooltip>
          </p>
          <p className="text-xl font-bold text-bearish mt-1 font-mono tabular-nums">{fmtDollar(varResult.cvar95)}</p>
        </div>
        <div className="stat-card border-t-2 border-t-accent">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
            <InfoTooltip text="Portfolio Beta: How much your portfolio moves vs the market. 1.0 = same as market, >1 = more volatile">Beta</InfoTooltip>
          </p>
          <p className="text-xl font-bold t-primary mt-1 font-mono tabular-nums">{beta.toFixed(2)}</p>
          <p className="text-xs t-muted mt-1">{beta > 1.2 ? 'Aggressive' : beta > 0.8 ? 'Moderate' : 'Defensive'}</p>
        </div>
        <div className="stat-card border-t-2 border-t-accent">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
            <InfoTooltip text="Sharpe Ratio: Risk-adjusted return. Higher is better. >1 is good, >2 is great">Sharpe</InfoTooltip>
          </p>
          <p className="text-xl font-bold t-primary mt-1 font-mono tabular-nums">{sharpe.toFixed(2)}</p>
          <p className="text-xs t-muted mt-1">{sharpe > 2 ? 'Excellent' : sharpe > 1 ? 'Good' : sharpe > 0 ? 'Fair' : 'Poor'}</p>
        </div>
        <div className="stat-card border-t-2 border-t-bearish">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">
            <InfoTooltip text="Maximum Drawdown: The largest peak-to-trough decline in portfolio value historically">Max Drawdown</InfoTooltip>
          </p>
          <p className="text-xl font-bold text-bearish mt-1 font-mono tabular-nums">{(drawdownResult.maxDrawdown * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Beginner explanations */}
      {showHelp && (
        <div className="card p-4 border-l-4 border-l-accent text-xs t-secondary space-y-2">
          <p><strong className="t-primary">VaR (Value at Risk):</strong> If your VaR is $500, it means on 95% of trading days, you won't lose more than $500. Think of it as "how much could I lose on a normal bad day?"</p>
          <p><strong className="t-primary">CVaR (Expected Shortfall):</strong> On the worst 5% of days (when VaR is exceeded), CVaR tells you the average loss. It's the "how bad could a really bad day be?" metric.</p>
          <p><strong className="t-primary">Beta:</strong> How sensitive your portfolio is to market moves. Beta of 1.5 means when the market drops 1%, your portfolio drops ~1.5%. Lower beta = less volatile.</p>
          <p><strong className="t-primary">Sharpe Ratio:</strong> Return per unit of risk. Higher means you're getting more reward for the risk you're taking. Below 0 means you'd be better off in treasury bills.</p>
          <p><strong className="t-primary">Max Drawdown:</strong> The worst peak-to-trough drop your portfolio has experienced. A -30% max drawdown means at one point you were down 30% from your highest value.</p>
        </div>
      )}

      {/* Monte Carlo Fan Chart */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-1">Monte Carlo Projection (1 Year)</h2>
        <p className="text-xs t-muted mb-4">
          500 simulated paths based on historical daily returns. Shows range of possible portfolio outcomes.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mcChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={d => `${d}d`} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ fontSize: 11, backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--surface-border)', borderRadius: 8 }}
                formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, '']}
                labelFormatter={d => `Day ${d}`}
              />
              <Area type="monotone" dataKey="p95" stroke="none" fill="#16a34a" fillOpacity={0.1} />
              <Area type="monotone" dataKey="p75" stroke="none" fill="#16a34a" fillOpacity={0.15} />
              <Area type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={2} fill="none" />
              <Area type="monotone" dataKey="p25" stroke="none" fill="#dc2626" fillOpacity={0.15} />
              <Area type="monotone" dataKey="p5" stroke="none" fill="#dc2626" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs t-muted">
          <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-green-600/30 inline-block" /> 75th–95th pctl</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-blue-500 inline-block" /> Median</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-red-600/30 inline-block" /> 5th–25th pctl</span>
        </div>
      </div>

      {/* Sector Concentration + Drawdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sector Concentration */}
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-1">Sector Concentration</h2>
          <p className="text-xs t-muted mb-4">
            Diversification across sectors. Heavy concentration in one sector increases risk.
          </p>
          <PieChart slices={sectorSlices} />
          {sectorData.some(s => s.weight > 0.4) && (
            <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
              Warning: Over 40% concentrated in one sector. Consider diversifying.
            </div>
          )}
        </div>

        {/* Drawdown Chart */}
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-1">Portfolio Drawdown</h2>
          <p className="text-xs t-muted mb-4">
            How far below the peak value your portfolio has been at each point.
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ddChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} domain={['auto', 0]} />
                <Tooltip
                  contentStyle={{ fontSize: 11, backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--surface-border)', borderRadius: 8 }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="t-muted">Current: <span className="text-bearish font-mono">{(drawdownResult.currentDrawdown * 100).toFixed(1)}%</span></span>
            <span className="t-muted">Max: <span className="text-bearish font-mono">{(drawdownResult.maxDrawdown * 100).toFixed(1)}%</span></span>
          </div>
        </div>
      </div>

      {/* Risk Contribution Table */}
      <div className="card-flat overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Risk Contribution by Holding</h2>
          <p className="text-xs t-muted mt-1">Individual stock weight, volatility, and beta within your portfolio.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="px-4 py-3 text-left table-header">Ticker</th>
                <th className="px-4 py-3 text-right table-header">Weight</th>
                <th className="px-4 py-3 text-right table-header">Volatility (Ann.)</th>
                <th className="px-4 py-3 text-right table-header">Beta</th>
                <th className="px-4 py-3 text-left table-header">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {holdingRisks.map(hr => {
                const riskLevel = hr.volatility > 0.5 ? 'High' : hr.volatility > 0.25 ? 'Medium' : 'Low';
                const riskColor = hr.volatility > 0.5 ? 'text-bearish' : hr.volatility > 0.25 ? 'text-amber-400' : 'text-bullish';
                return (
                  <tr key={hr.ticker} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-accent-light">{hr.ticker}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">{(hr.weight * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">{(hr.volatility * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">{hr.beta?.toFixed(2) ?? '—'}</td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${riskColor}`}>{riskLevel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
