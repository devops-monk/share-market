import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { HelpLabel } from '../components/common/InfoTooltip';
import { TIPS } from '../lib/tooltips';

interface SectorData {
  name: string;
  count: number;
  avgComposite: number;
  avgChange: number;
  avgRsi: number;
  avgRsPercentile: number;
  topStocks: StockRecord[];
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function SectorPerformance({ stocks }: { stocks: StockRecord[] }) {
  const sectors = useMemo(() => {
    const groups: Record<string, StockRecord[]> = {};
    for (const stock of stocks) {
      const sector = stock.sector || 'Unknown';
      if (!groups[sector]) groups[sector] = [];
      groups[sector].push(stock);
    }

    const sectorList: SectorData[] = Object.entries(groups).map(([name, sectorStocks]) => {
      const rsiValues = sectorStocks.map(s => s.rsi).filter((v): v is number => v != null);

      const sorted = [...sectorStocks].sort((a, b) => b.score.composite - a.score.composite);

      return {
        name,
        count: sectorStocks.length,
        avgComposite: Math.round(avg(sectorStocks.map(s => s.score.composite))),
        avgChange: avg(sectorStocks.map(s => s.changePercent)),
        avgRsi: rsiValues.length > 0 ? avg(rsiValues) : 0,
        avgRsPercentile: Math.round(avg(sectorStocks.map(s => s.rsPercentile))),
        topStocks: sorted.slice(0, 3),
      };
    });

    sectorList.sort((a, b) => b.avgComposite - a.avgComposite);
    return sectorList;
  }, [stocks]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Sector Performance</h1>
        <p className="text-sm t-muted mt-1">
          Comparative analysis across {sectors.length} sectors covering {stocks.length} stocks
        </p>
      </div>

      {/* Summary bar */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="t-muted">Sectors: </span>
            <span className="font-semibold t-primary">{sectors.length}</span>
          </div>
          <div>
            <span className="t-muted">Strongest: </span>
            <span className="font-semibold text-bullish">{sectors[0]?.name ?? '--'}</span>
          </div>
          <div>
            <span className="t-muted">Weakest: </span>
            <span className="font-semibold text-bearish">{sectors[sectors.length - 1]?.name ?? '--'}</span>
          </div>
        </div>
      </div>

      {/* Sector cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sectors.map((sector, idx) => {
          const scoreColor =
            sector.avgComposite >= 65 ? 'text-bullish' : sector.avgComposite >= 40 ? 'text-neutral' : 'text-bearish';
          const scoreBg =
            sector.avgComposite >= 65 ? 'bg-bullish/10' : sector.avgComposite >= 40 ? 'bg-neutral/10' : 'bg-bearish/10';
          const changeColor = sector.avgChange >= 0 ? 'text-bullish' : 'text-bearish';

          return (
            <div key={sector.name} className="card p-5 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono t-faint">#{idx + 1}</span>
                    <h3 className="text-base font-bold t-primary">{sector.name}</h3>
                  </div>
                  <span className="text-xs t-muted">{sector.count} stock{sector.count !== 1 ? 's' : ''}</span>
                </div>
                <div className={`text-2xl font-bold font-mono tabular-nums rounded-md px-3 py-1 ${scoreColor} ${scoreBg}`}>
                  {sector.avgComposite}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider t-faint mb-0.5">
                    <HelpLabel label="Avg Change" tip={TIPS['Avg Change']} />
                  </div>
                  <div className={`text-sm font-mono tabular-nums font-medium ${changeColor}`}>
                    {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider t-faint mb-0.5">
                    <HelpLabel label="Avg RSI" tip={TIPS['RSI']} />
                  </div>
                  <div className={`text-sm font-mono tabular-nums font-medium ${
                    sector.avgRsi > 70 ? 'text-bearish' : sector.avgRsi < 30 ? 'text-bullish' : 't-secondary'
                  }`}>
                    {sector.avgRsi.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider t-faint mb-0.5">
                    <HelpLabel label="Avg RS" tip={TIPS['RS']} />
                  </div>
                  <div className={`text-sm font-mono tabular-nums font-medium ${
                    sector.avgRsPercentile >= 70 ? 'text-bullish' : sector.avgRsPercentile >= 40 ? 'text-neutral' : 'text-bearish'
                  }`}>
                    {sector.avgRsPercentile}
                  </div>
                </div>
              </div>

              {/* Top stocks */}
              <div className="pt-3 border-t border-surface-border mt-auto">
                <div className="text-[10px] uppercase tracking-wider t-faint mb-2">Top Stocks</div>
                <div className="space-y-1.5">
                  {sector.topStocks.map(stock => (
                    <Link
                      key={stock.ticker}
                      to={`/stock/${stock.ticker}`}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-accent-light group-hover:t-primary transition-colors">
                          {stock.ticker}
                        </span>
                        <span className="text-xs t-muted truncate max-w-[100px]">{stock.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono tabular-nums ${stock.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                        </span>
                        <span className={`text-xs font-bold font-mono tabular-nums rounded px-1.5 py-0.5 ${
                          stock.score.composite >= 65
                            ? 'text-bullish bg-bullish/10'
                            : stock.score.composite >= 40
                            ? 'text-neutral bg-neutral/10'
                            : 'text-bearish bg-bearish/10'
                        }`}>
                          {stock.score.composite}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
