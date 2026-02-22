import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { ScoreBadge, MarketTag, ChangePercent } from '../components/common/Tags';

/* ─── HELPERS ─── */
function getNextWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function isToday(iso: string): boolean {
  return iso === new Date().toISOString().slice(0, 10);
}

function isThisWeek(iso: string): boolean {
  const now = new Date();
  const d = new Date(iso + 'T00:00:00');
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < 7;
}

/* ─── COMPONENT ─── */
export default function EarningsCalendar({ stocks }: { stocks: StockRecord[] }) {
  const [view, setView] = useState<'upcoming' | 'recent' | 'all'>('upcoming');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'ticker'>('date');

  // Group stocks by earnings date
  const { upcoming, recent, noDate } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcomingList: (StockRecord & { earningsDate: string })[] = [];
    const recentList: (StockRecord & { earningsDate: string })[] = [];
    const noDateList: StockRecord[] = [];

    for (const s of stocks) {
      const ed = s.earningsDate;
      if (!ed) {
        noDateList.push(s);
        continue;
      }
      if (ed >= today) {
        upcomingList.push({ ...s, earningsDate: ed });
      } else {
        recentList.push({ ...s, earningsDate: ed });
      }
    }

    const sorter = (a: any, b: any) => {
      if (sortBy === 'date') return a.earningsDate.localeCompare(b.earningsDate);
      if (sortBy === 'score') return b.score.composite - a.score.composite;
      return a.ticker.localeCompare(b.ticker);
    };

    upcomingList.sort(sorter);
    recentList.sort((a, b) => b.earningsDate.localeCompare(a.earningsDate)); // most recent first

    return { upcoming: upcomingList, recent: recentList, noDate: noDateList };
  }, [stocks, sortBy]);

  const displayList = view === 'upcoming' ? upcoming : view === 'recent' ? recent : [...upcoming, ...recent];

  // Group by date for calendar view
  const grouped = useMemo(() => {
    const map = new Map<string, typeof displayList>();
    for (const s of displayList) {
      const date = s.earningsDate;
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(s);
    }
    return [...map.entries()].sort((a, b) =>
      view === 'recent' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])
    );
  }, [displayList, view]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Earnings Calendar</h1>
        <p className="text-sm t-muted mt-1">
          Track upcoming and recent earnings dates for stocks in your universe.
          Plan trades around earnings announcements.
        </p>
      </div>

      {/* Description */}
      <div className="card p-4">
        <p className="text-xs t-secondary leading-relaxed">
          <strong className="t-primary">Why it matters:</strong> Earnings announcements typically cause the largest single-day
          price moves. Stocks often gap up or down 5-20% on earnings surprises. Knowing when earnings are coming helps you
          manage risk (reduce position size before uncertain reports) or find opportunities (buy quality stocks after overreactions).
        </p>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex gap-1 bg-surface-tertiary rounded-lg p-0.5">
          {([['upcoming', 'Upcoming'], ['recent', 'Recent'], ['all', 'All']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                view === key ? 'bg-accent/20 text-accent-light' : 't-muted hover:t-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-surface-tertiary rounded-lg p-0.5">
          {([['date', 'By Date'], ['score', 'By Score'], ['ticker', 'By Ticker']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key as typeof sortBy)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                sortBy === key ? 'bg-accent/20 text-accent-light' : 't-muted hover:t-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">
          {displayList.length} stocks with dates
        </span>
      </div>

      {/* Calendar grouped view */}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map(([date, dateStocks]) => (
            <div key={date} className="card overflow-hidden">
              <div className={`px-4 py-2.5 border-b border-surface-border flex items-center gap-3 ${
                isToday(date) ? 'bg-accent/10' : isThisWeek(date) ? 'bg-bullish/5' : 'bg-surface-tertiary/30'
              }`}>
                <span className={`text-sm font-semibold ${isToday(date) ? 'text-accent-light' : 't-primary'}`}>
                  {formatDate(date)}
                </span>
                {isToday(date) && (
                  <span className="badge bg-accent/20 text-accent-light text-[10px] px-2 py-0.5">TODAY</span>
                )}
                {isThisWeek(date) && !isToday(date) && (
                  <span className="badge bg-bullish/15 text-bullish text-[10px] px-2 py-0.5">THIS WEEK</span>
                )}
                <span className="text-xs t-muted">{dateStocks.length} stock{dateStocks.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-surface-border/50">
                {dateStocks.map(s => (
                  <div key={s.ticker} className="px-4 py-2.5 flex items-center gap-4 hover:bg-surface-hover/50 transition-colors">
                    <Link to={`/stock/${s.ticker}`} className="font-semibold text-accent-light hover:t-primary transition-colors w-20 flex-shrink-0">
                      {s.ticker}
                    </Link>
                    <span className="text-xs t-secondary truncate flex-1 min-w-0">{s.name}</span>
                    <MarketTag market={s.market} />
                    <div className="text-right w-16 flex-shrink-0">
                      <ChangePercent value={s.changePercent} />
                    </div>
                    <div className="flex-shrink-0">
                      <ScoreBadge score={s.score.composite} />
                    </div>
                    <div className="text-right w-20 flex-shrink-0">
                      <span className="font-mono tabular-nums text-xs t-secondary">
                        {s.market === 'UK' ? '\u00a3' : '$'}{s.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="t-muted text-sm">
            {view === 'upcoming'
              ? 'No upcoming earnings dates found. Earnings date data may not be available yet.'
              : 'No earnings dates found for this view.'}
          </p>
          {noDate.length > 0 && (
            <p className="t-faint text-xs mt-2">{noDate.length} stocks have no earnings date data.</p>
          )}
        </div>
      )}
    </div>
  );
}
