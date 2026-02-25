import { useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Label, ZAxis,
} from 'recharts';
import type { StockRecord } from '../types';

interface SectorData {
  sector: string;
  currentRS: number;
  rsChange: number;
  count: number;
  avgScore: number;
  quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving';
}

const QUADRANT_COLORS: Record<string, string> = {
  Leading: 'var(--chart-bullish, #16a34a)',
  Weakening: 'var(--chart-neutral, #d97706)',
  Lagging: 'var(--chart-bearish, #dc2626)',
  Improving: 'var(--chart-accent, #3b82f6)',
};

function classifyQuadrant(rs: number, change: number): SectorData['quadrant'] {
  if (rs >= 50 && change >= 0) return 'Leading';
  if (rs >= 50 && change < 0) return 'Weakening';
  if (rs < 50 && change < 0) return 'Lagging';
  return 'Improving';
}

export default function SectorRotation({ stocks }: { stocks: StockRecord[] }) {
  const [sortKey, setSortKey] = useState<'rsChange' | 'currentRS' | 'avgScore'>('rsChange');

  const sectors = useMemo(() => {
    const groups = new Map<string, StockRecord[]>();
    for (const s of stocks) {
      if (!s.sector || s.sector === 'Unknown') continue;
      if (!groups.has(s.sector)) groups.set(s.sector, []);
      groups.get(s.sector)!.push(s);
    }

    const result: SectorData[] = [];
    for (const [sector, sectorStocks] of groups) {
      if (sectorStocks.length < 3) continue;

      const avgRS = sectorStocks.reduce((a, s) => a + s.rsPercentile, 0) / sectorStocks.length;
      const avg3m = sectorStocks.reduce((a, s) => a + s.priceReturn3m, 0) / sectorStocks.length;
      const avg6m = sectorStocks.reduce((a, s) => a + s.priceReturn6m, 0) / sectorStocks.length;
      const rsChange = (avg3m - avg6m) * 100; // momentum acceleration in percentage points
      const avgScore = Math.round(sectorStocks.reduce((a, s) => a + s.score.composite, 0) / sectorStocks.length);

      result.push({
        sector,
        currentRS: +avgRS.toFixed(1),
        rsChange: +rsChange.toFixed(2),
        count: sectorStocks.length,
        avgScore,
        quadrant: classifyQuadrant(avgRS, rsChange),
      });
    }

    return result;
  }, [stocks]);

  const sorted = useMemo(
    () => [...sectors].sort((a, b) => b[sortKey] - a[sortKey]),
    [sectors, sortKey],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Sector Rotation</h1>
        <p className="text-sm t-muted mt-1">Relative Rotation Graph — sector momentum model</p>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 text-xs">
          {(['Leading', 'Weakening', 'Lagging', 'Improving'] as const).map(q => (
            <div key={q} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: QUADRANT_COLORS[q] }} />
              <span className="t-secondary font-medium">{q}</span>
              <span className="t-muted">
                ({q === 'Leading' ? 'High RS, accelerating' :
                  q === 'Weakening' ? 'High RS, decelerating' :
                  q === 'Lagging' ? 'Low RS, decelerating' :
                  'Low RS, accelerating'})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* RRG Chart */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-4">Relative Rotation Graph</h2>
        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, var(--surface-border))" />
            <XAxis
              type="number"
              dataKey="currentRS"
              domain={[0, 100]}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--surface-border)' }}
              tickLine={false}
            >
              <Label value="Relative Strength (RS Percentile)" position="bottom" offset={0} style={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="rsChange"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--surface-border)' }}
              tickLine={false}
            >
              <Label value="RS Momentum Change" angle={-90} position="left" offset={5} style={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            </YAxis>
            <ZAxis range={[80, 80]} />
            <ReferenceLine x={50} stroke="var(--surface-border)" strokeDasharray="4 4" />
            <ReferenceLine y={0} stroke="var(--surface-border)" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--surface-border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'currentRS') return [`${value}`, 'RS Percentile'];
                if (name === 'rsChange') return [`${value.toFixed(2)}pp`, 'Momentum Change'];
                return [value, name];
              }}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload;
                return item ? `${item.sector} (${item.count} stocks)` : '';
              }}
            />
            <Scatter data={sectors} name="Sectors">
              {sectors.map((entry, idx) => (
                <Cell key={idx} fill={QUADRANT_COLORS[entry.quadrant]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* Sector labels overlay */}
        <div className="text-[10px] t-muted text-center mt-2">
          Quadrants: top-right = <span className="text-bullish font-medium">Leading</span>, top-left = <span className="text-accent-light font-medium">Improving</span>, bottom-right = <span className="text-neutral font-medium">Weakening</span>, bottom-left = <span className="text-bearish font-medium">Lagging</span>
        </div>
      </div>

      {/* Table */}
      <div className="card-flat overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="px-4 py-3 text-left table-header">Sector</th>
                <th className="px-4 py-3 text-center table-header">Quadrant</th>
                <th className="px-4 py-3 text-right table-header">Stocks</th>
                <th className="px-4 py-3 text-right table-header cursor-pointer hover:text-accent-light" onClick={() => setSortKey('currentRS')}>
                  Avg RS {sortKey === 'currentRS' && '▼'}
                </th>
                <th className="px-4 py-3 text-right table-header cursor-pointer hover:text-accent-light" onClick={() => setSortKey('rsChange')}>
                  Momentum {sortKey === 'rsChange' && '▼'}
                </th>
                <th className="px-4 py-3 text-right table-header cursor-pointer hover:text-accent-light" onClick={() => setSortKey('avgScore')}>
                  Avg Score {sortKey === 'avgScore' && '▼'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
                <tr key={s.sector} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium t-primary">{s.sector}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className="badge text-xs px-2 py-0.5"
                      style={{
                        backgroundColor: `${QUADRANT_COLORS[s.quadrant]}20`,
                        color: QUADRANT_COLORS[s.quadrant],
                      }}
                    >
                      {s.quadrant}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums t-secondary">{s.count}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">{s.currentRS}</td>
                  <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${s.rsChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {s.rsChange >= 0 ? '+' : ''}{s.rsChange.toFixed(2)}pp
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${s.avgScore >= 55 ? 'text-bullish' : s.avgScore >= 40 ? 'text-neutral' : 'text-bearish'}`}>
                    {s.avgScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
