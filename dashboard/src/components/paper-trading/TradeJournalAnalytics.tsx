import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface JournalAnalytics {
  winRateByStrategy: { strategy: string; winRate: number; avgPnlPct: number; count: number }[];
  perfByEmotion: { emotion: string; winRate: number; avgPnlPct: number; count: number }[];
  tradeFrequency: { month: string; count: number }[];
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | null;
  longestWinStreak: number;
  longestLossStreak: number;
  strategyDistribution: { strategy: string; count: number }[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#a855f7'];

const chartTooltipStyle = {
  contentStyle: { background: 'var(--surface-secondary)', border: '1px solid var(--surface-border)', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: 'var(--text-primary)' },
};

export default function TradeJournalAnalytics({ analytics }: { analytics: JournalAnalytics }) {
  const hasData = analytics.winRateByStrategy.length > 0;

  if (!hasData) {
    return (
      <div className="card p-8 text-center">
        <p className="t-muted text-sm">Complete some trades with journal tags to see analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Streak cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card border-t-2 border-t-accent">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Current Streak</p>
          <p className={`text-xl font-bold mt-1 font-mono ${analytics.currentStreakType === 'win' ? 'text-bullish' : analytics.currentStreakType === 'loss' ? 'text-bearish' : 't-primary'}`}>
            {analytics.currentStreak > 0 ? `${analytics.currentStreak} ${analytics.currentStreakType === 'win' ? 'W' : 'L'}` : '--'}
          </p>
        </div>
        <div className="stat-card border-t-2 border-t-bullish">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Best Win Streak</p>
          <p className="text-xl font-bold mt-1 font-mono text-bullish">{analytics.longestWinStreak}</p>
        </div>
        <div className="stat-card border-t-2 border-t-bearish">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Worst Loss Streak</p>
          <p className="text-xl font-bold mt-1 font-mono text-bearish">{analytics.longestLossStreak}</p>
        </div>
        <div className="stat-card border-t-2 border-t-accent">
          <p className="text-xs font-medium t-tertiary uppercase tracking-wider">Strategies Used</p>
          <p className="text-xl font-bold mt-1 font-mono t-primary">{analytics.strategyDistribution.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Win Rate by Strategy */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Win Rate by Strategy</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.winRateByStrategy} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="strategy" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Win Rate']} />
              <Bar dataKey="winRate" fill="var(--chart-bullish)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg P&L% by Emotional State */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Avg P&L% by Emotional State</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.perfByEmotion} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="emotion" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="%" />
              <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v.toFixed(2)}%`, 'Avg P&L%']} />
              <Bar dataKey="avgPnlPct" radius={[4, 4, 0, 0]}>
                {analytics.perfByEmotion.map((entry, i) => (
                  <Cell key={i} fill={entry.avgPnlPct >= 0 ? 'var(--chart-bullish)' : 'var(--chart-bearish)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trade Frequency Over Time */}
        {analytics.tradeFrequency.length > 1 && (
          <div className="card p-5">
            <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Trade Frequency</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.tradeFrequency} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip {...chartTooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="var(--chart-accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--chart-accent)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Strategy Distribution */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Strategy Distribution</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={analytics.strategyDistribution} dataKey="count" nameKey="strategy" cx="50%" cy="50%" outerRadius={70} strokeWidth={2} stroke="var(--surface)">
                  {analytics.strategyDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {analytics.strategyDistribution.map((s, i) => (
                <div key={s.strategy} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="t-secondary">{s.strategy}</span>
                  <span className="font-mono t-muted">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
