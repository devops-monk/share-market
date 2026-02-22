import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';

type ColorMode = 'change' | 'score' | 'rs';

function getChangeColor(value: number): string {
  const clamped = Math.max(-8, Math.min(8, value));
  const ratio = clamped / 8;
  if (ratio >= 0) {
    const h = 120;
    const s = 55 + ratio * 20;
    const l = 45 - ratio * 15;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  const h = 0;
  const s = 55 + Math.abs(ratio) * 20;
  const l = 45 - Math.abs(ratio) * 15;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function getScoreColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  const hue = (clamped / 100) * 120;
  return `hsl(${hue}, 70%, ${hue > 60 ? 40 : 50}%)`;
}

function getRsColor(rs: number): string {
  const clamped = Math.max(0, Math.min(100, rs));
  const hue = (clamped / 100) * 120;
  return `hsl(${hue}, 65%, 42%)`;
}

function getDisplayValue(stock: StockRecord, mode: ColorMode): string {
  switch (mode) {
    case 'change':
      return `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(1)}%`;
    case 'score':
      return `${stock.score.composite}`;
    case 'rs':
      return `${stock.rsPercentile}`;
  }
}

function getColor(stock: StockRecord, mode: ColorMode): string {
  switch (mode) {
    case 'change':
      return getChangeColor(stock.changePercent);
    case 'score':
      return getScoreColor(stock.score.composite);
    case 'rs':
      return getRsColor(stock.rsPercentile);
  }
}

function getTextColor(stock: StockRecord, mode: ColorMode): string {
  switch (mode) {
    case 'change': {
      const abs = Math.abs(stock.changePercent);
      return abs > 2 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)';
    }
    case 'score':
    case 'rs':
      return 'rgba(255,255,255,0.9)';
  }
}

export default function HeatMap({ stocks }: { stocks: StockRecord[] }) {
  const [colorMode, setColorMode] = useState<ColorMode>('change');

  const sectorGroups = useMemo(() => {
    const groups: Record<string, StockRecord[]> = {};
    for (const stock of stocks) {
      const sector = stock.sector || 'Unknown';
      if (!groups[sector]) groups[sector] = [];
      groups[sector].push(stock);
    }

    // Sort sectors by total market cap descending
    const sorted = Object.entries(groups).sort(
      (a, b) => b[1].reduce((s, st) => s + st.marketCap, 0) - a[1].reduce((s, st) => s + st.marketCap, 0)
    );

    // Sort stocks within each sector by market cap descending
    for (const [, sectorStocks] of sorted) {
      sectorStocks.sort((a, b) => b.marketCap - a.marketCap);
    }

    return sorted;
  }, [stocks]);

  const modeMeta: Record<ColorMode, { label: string; description: string }> = {
    change: { label: 'Daily Change %', description: 'Green for gains, red for losses' },
    score: { label: 'Composite Score', description: 'Red (0) to green (100)' },
    rs: { label: 'RS Percentile', description: 'Relative strength ranking' },
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Market Heat Map</h1>
        <p className="text-sm t-muted mt-1">Visual overview of the entire market, grouped by sector</p>
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm t-muted">Color by:</span>
          {(Object.keys(modeMeta) as ColorMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                colorMode === mode
                  ? 'bg-accent/15 text-accent-light ring-1 ring-accent/30'
                  : 't-tertiary hover:t-primary hover:bg-surface-hover'
              }`}
            >
              {modeMeta[mode].label}
            </button>
          ))}
          <span className="ml-auto text-xs t-faint">{modeMeta[colorMode].description}</span>
        </div>
      </div>

      {/* Heat map grid */}
      <div className="space-y-4">
        {sectorGroups.map(([sector, sectorStocks]) => (
          <div key={sector} className="card-flat p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold t-primary">{sector}</h2>
              <span className="text-xs t-faint">({sectorStocks.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sectorStocks.map(stock => {
                const size = Math.max(60, Math.min(140, (Math.log10(Math.max(stock.marketCap, 1e6)) - 6) * 30 + 60));
                const bgColor = getColor(stock, colorMode);
                const txtColor = getTextColor(stock, colorMode);

                return (
                  <Link
                    key={stock.ticker}
                    to={`/stock/${stock.ticker}`}
                    className="rounded-md flex flex-col items-center justify-center hover:brightness-125 hover:scale-105 transition-all cursor-pointer overflow-hidden"
                    style={{
                      width: `${size}px`,
                      height: `${size * 0.7}px`,
                      backgroundColor: bgColor,
                      color: txtColor,
                      minWidth: '56px',
                      minHeight: '40px',
                    }}
                    title={`${stock.ticker} - ${stock.name}\nPrice: $${stock.price.toFixed(2)}\nChange: ${stock.changePercent.toFixed(2)}%\nScore: ${stock.score.composite}\nRS: ${stock.rsPercentile}`}
                  >
                    <span className="text-xs font-bold leading-tight truncate px-1">
                      {stock.ticker}
                    </span>
                    <span className="text-[10px] font-mono leading-tight opacity-90">
                      {getDisplayValue(stock, colorMode)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <span className="text-xs t-muted">Legend:</span>
          {colorMode === 'change' && (
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getChangeColor(-6) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getChangeColor(-3) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getChangeColor(-1) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getChangeColor(0) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getChangeColor(1) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getChangeColor(3) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getChangeColor(6) }} />
              <span className="text-xs t-faint ml-1">-6% to +6%</span>
            </div>
          )}
          {colorMode === 'score' && (
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getScoreColor(10) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getScoreColor(30) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getScoreColor(50) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getScoreColor(70) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getScoreColor(90) }} />
              <span className="text-xs t-faint ml-1">0 to 100</span>
            </div>
          )}
          {colorMode === 'rs' && (
            <div className="flex items-center gap-1">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getRsColor(10) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getRsColor(30) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getRsColor(50) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getRsColor(70) }} />
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: getRsColor(90) }} />
              <span className="text-xs t-faint ml-1">0th to 100th percentile</span>
            </div>
          )}
          <span className="ml-auto text-xs t-faint">Rectangle size = relative market cap</span>
        </div>
      </div>
    </div>
  );
}
