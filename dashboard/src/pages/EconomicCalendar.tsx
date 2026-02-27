import { useMemo } from 'react';

interface EconomicEvent {
  date: string;       // YYYY-MM-DD
  name: string;
  category: 'fed' | 'inflation' | 'jobs' | 'gdp' | 'earnings' | 'other';
  impact: 'high' | 'medium' | 'low';
  description: string;
}

// Key economic dates for 2025-2026
const EVENTS: EconomicEvent[] = [
  // FOMC Meetings 2025-2026
  { date: '2025-01-29', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2025-03-19', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2025-05-07', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2025-06-18', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2025-07-30', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2025-09-17', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2025-10-29', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2025-12-17', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2026-01-28', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2026-03-18', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2026-05-06', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },
  { date: '2026-06-17', name: 'FOMC Rate Decision', category: 'fed', impact: 'high', description: 'Federal Reserve interest rate decision and statement' },

  // CPI Reports (monthly, ~12th-14th)
  { date: '2025-02-12', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-03-12', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-04-10', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-05-13', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-06-11', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-07-11', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-08-12', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-09-10', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-10-14', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-11-12', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2025-12-10', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2026-01-13', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2026-02-11', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },
  { date: '2026-03-11', name: 'CPI Report', category: 'inflation', impact: 'high', description: 'Consumer Price Index — key inflation gauge' },

  // Non-Farm Payrolls (first Friday of each month)
  { date: '2025-02-07', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-03-07', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-04-04', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-05-02', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-06-06', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-07-03', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-08-01', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-09-05', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-10-03', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-11-07', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2025-12-05', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2026-01-09', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2026-02-06', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },
  { date: '2026-03-06', name: 'Non-Farm Payrolls', category: 'jobs', impact: 'high', description: 'Monthly jobs report — employment and wage data' },

  // GDP Reports (quarterly)
  { date: '2025-01-30', name: 'GDP (Q4 Advance)', category: 'gdp', impact: 'medium', description: 'Advance estimate of Q4 2024 GDP growth' },
  { date: '2025-03-27', name: 'GDP (Q4 Final)', category: 'gdp', impact: 'medium', description: 'Final estimate of Q4 2024 GDP growth' },
  { date: '2025-04-30', name: 'GDP (Q1 Advance)', category: 'gdp', impact: 'medium', description: 'Advance estimate of Q1 2025 GDP growth' },
  { date: '2025-06-26', name: 'GDP (Q1 Final)', category: 'gdp', impact: 'medium', description: 'Final estimate of Q1 2025 GDP growth' },
  { date: '2025-07-30', name: 'GDP (Q2 Advance)', category: 'gdp', impact: 'medium', description: 'Advance estimate of Q2 2025 GDP growth' },
  { date: '2025-10-30', name: 'GDP (Q3 Advance)', category: 'gdp', impact: 'medium', description: 'Advance estimate of Q3 2025 GDP growth' },
  { date: '2026-01-29', name: 'GDP (Q4 Advance)', category: 'gdp', impact: 'medium', description: 'Advance estimate of Q4 2025 GDP growth' },

  // Earnings seasons
  { date: '2025-01-13', name: 'Earnings Season Begins', category: 'earnings', impact: 'medium', description: 'Q4 2024 earnings season kicks off (banks lead)' },
  { date: '2025-04-14', name: 'Earnings Season Begins', category: 'earnings', impact: 'medium', description: 'Q1 2025 earnings season kicks off' },
  { date: '2025-07-14', name: 'Earnings Season Begins', category: 'earnings', impact: 'medium', description: 'Q2 2025 earnings season kicks off' },
  { date: '2025-10-13', name: 'Earnings Season Begins', category: 'earnings', impact: 'medium', description: 'Q3 2025 earnings season kicks off' },
  { date: '2026-01-12', name: 'Earnings Season Begins', category: 'earnings', impact: 'medium', description: 'Q4 2025 earnings season kicks off' },

  // Options expiration (triple/quadruple witching)
  { date: '2025-03-21', name: 'Quad Witching', category: 'other', impact: 'medium', description: 'Quarterly options & futures expiration — expect high volatility' },
  { date: '2025-06-20', name: 'Quad Witching', category: 'other', impact: 'medium', description: 'Quarterly options & futures expiration — expect high volatility' },
  { date: '2025-09-19', name: 'Quad Witching', category: 'other', impact: 'medium', description: 'Quarterly options & futures expiration — expect high volatility' },
  { date: '2025-12-19', name: 'Quad Witching', category: 'other', impact: 'medium', description: 'Quarterly options & futures expiration — expect high volatility' },
  { date: '2026-03-20', name: 'Quad Witching', category: 'other', impact: 'medium', description: 'Quarterly options & futures expiration — expect high volatility' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  fed: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Fed' },
  inflation: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Inflation' },
  jobs: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Jobs' },
  gdp: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'GDP' },
  earnings: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Earnings' },
  other: { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Other' },
};

export default function EconomicCalendar() {
  const today = new Date().toISOString().slice(0, 10);

  const { upcoming, past } = useMemo(() => {
    const sorted = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = sorted.filter(e => e.date >= today).slice(0, 20);
    const past = sorted.filter(e => e.date < today).reverse().slice(0, 10);
    return { upcoming, past };
  }, [today]);

  const daysUntil = (date: string) => {
    const d = new Date(date);
    const t = new Date(today);
    const diff = Math.ceil((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Economic Calendar</h1>
        <p className="text-sm t-muted mt-1">Key market-moving events: FOMC, CPI, NFP, GDP, and earnings seasons</p>
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_COLORS).map(([key, { bg, text, label }]) => (
          <span key={key} className={`badge text-xs px-2 py-1 ${bg} ${text}`}>{label}</span>
        ))}
      </div>

      {/* Upcoming Events */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Upcoming Events</h2>
        <div className="space-y-2">
          {upcoming.map((event, i) => {
            const cat = CATEGORY_COLORS[event.category];
            const isToday = event.date === today;
            return (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                isToday ? 'bg-accent/10 border-accent/30' : 'bg-surface-hover border-surface-border hover:bg-surface-tertiary'
              }`}>
                <div className="w-24 flex-shrink-0">
                  <p className={`text-xs font-mono font-bold ${isToday ? 'text-accent-light' : 't-primary'}`}>{formatDate(event.date)}</p>
                </div>
                <span className={`badge text-[10px] px-2 py-0.5 flex-shrink-0 ${cat.bg} ${cat.text}`}>{cat.label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold t-primary">{event.name}</p>
                  <p className="text-xs t-muted truncate">{event.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-mono ${isToday ? 'text-accent-light font-bold' : 't-muted'}`}>
                    {daysUntil(event.date)}
                  </span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    event.impact === 'high' ? 'bg-red-400' : event.impact === 'medium' ? 'bg-yellow-400' : 'bg-gray-400'
                  }`} title={`${event.impact} impact`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Past Events */}
      {past.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Recent Events</h2>
          <div className="space-y-1.5">
            {past.map((event, i) => {
              const cat = CATEGORY_COLORS[event.category];
              return (
                <div key={i} className="flex items-center gap-4 p-2 rounded-lg hover:bg-surface-hover transition-colors opacity-60">
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs font-mono t-muted">{formatDate(event.date)}</p>
                  </div>
                  <span className={`badge text-[10px] px-2 py-0.5 flex-shrink-0 ${cat.bg} ${cat.text}`}>{cat.label}</span>
                  <p className="text-sm t-secondary flex-1 truncate">{event.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
