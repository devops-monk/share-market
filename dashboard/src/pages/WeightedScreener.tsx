import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, ChangePercent, ScoreBadge } from '../components/common/Tags';

interface Props {
  stocks: StockRecord[];
}

interface Weights {
  momentum: number;
  technical: number;
  sentiment: number;
  fundamentals: number;
  volume: number;
  risk: number;
}

const PRESETS: Record<string, { label: string; weights: Weights }> = {
  balanced: {
    label: 'Balanced',
    weights: { momentum: 17, technical: 17, sentiment: 17, fundamentals: 17, volume: 16, risk: 16 },
  },
  momentumHunter: {
    label: 'Momentum Hunter',
    weights: { momentum: 35, technical: 25, sentiment: 5, fundamentals: 5, volume: 20, risk: 10 },
  },
  valueInvestor: {
    label: 'Value Investor',
    weights: { momentum: 10, technical: 10, sentiment: 5, fundamentals: 40, volume: 10, risk: 25 },
  },
  riskAverse: {
    label: 'Risk-Averse',
    weights: { momentum: 10, technical: 10, sentiment: 10, fundamentals: 20, volume: 15, risk: 35 },
  },
};

const WEIGHT_KEYS: (keyof Weights)[] = ['momentum', 'technical', 'sentiment', 'fundamentals', 'volume', 'risk'];
const WEIGHT_LABELS: Record<keyof Weights, string> = {
  momentum: 'Momentum',
  technical: 'Technical',
  sentiment: 'Sentiment',
  fundamentals: 'Fundamentals',
  volume: 'Volume',
  risk: 'Risk',
};

function computeAdjustedScore(stock: StockRecord, weights: Weights): number {
  const components: Record<keyof Weights, number> = {
    momentum: stock.score.priceMomentum,
    technical: stock.score.technicalSignals,
    sentiment: stock.score.newsSentiment,
    fundamentals: stock.score.fundamentals,
    volume: stock.score.volumeTrend,
    risk: stock.score.riskInverse,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of WEIGHT_KEYS) {
    weightedSum += components[key] * weights[key];
    totalWeight += weights[key];
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

function parseWeightsFromParams(params: URLSearchParams): Weights | null {
  const m = params.get('m');
  const t = params.get('t');
  const s = params.get('s');
  const f = params.get('f');
  const v = params.get('v');
  const r = params.get('r');
  if (m == null && t == null) return null;
  return {
    momentum: Number(m) || 17,
    technical: Number(t) || 17,
    sentiment: Number(s) || 17,
    fundamentals: Number(f) || 17,
    volume: Number(v) || 16,
    risk: Number(r) || 16,
  };
}

function weightsToParams(w: Weights): string {
  return `?m=${w.momentum}&t=${w.technical}&s=${w.sentiment}&f=${w.fundamentals}&v=${w.volume}&r=${w.risk}`;
}

type StockWithAdjusted = StockRecord & { adjustedScore: number };

const columnHelper = createColumnHelper<StockWithAdjusted>();

export default function WeightedScreener({ stocks }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialWeights = parseWeightsFromParams(searchParams) || PRESETS.balanced.weights;
  const [weights, setWeights] = useState<Weights>(initialWeights);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'adjustedScore', desc: true }]);

  const updateWeights = useCallback((newWeights: Weights) => {
    setWeights(newWeights);
    setSearchParams(new URLSearchParams(weightsToParams(newWeights).slice(1)), { replace: true });
  }, [setSearchParams]);

  const handleSlider = useCallback((key: keyof Weights, value: number) => {
    const newWeights = { ...weights, [key]: value };
    updateWeights(newWeights);
  }, [weights, updateWeights]);

  const data = useMemo(() => {
    return stocks.map(s => ({
      ...s,
      adjustedScore: computeAdjustedScore(s, weights),
    }));
  }, [stocks, weights]);

  const columns = useMemo(() => [
    columnHelper.accessor('ticker', {
      header: 'Ticker',
      cell: info => (
        <Link to={`/stock/${info.getValue()}`} className="font-medium text-accent-light hover:underline">
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => <span className="text-xs t-secondary truncate max-w-[150px] block">{info.getValue()}</span>,
    }),
    columnHelper.accessor('market', {
      header: 'Market',
      cell: info => <MarketTag market={info.getValue()} />,
    }),
    columnHelper.accessor('capCategory', {
      header: 'Cap',
      cell: info => <CapTag cap={info.getValue()} />,
    }),
    columnHelper.accessor('price', {
      header: 'Price',
      cell: info => <span className="font-mono tabular-nums text-xs">${info.getValue().toFixed(2)}</span>,
    }),
    columnHelper.accessor('changePercent', {
      header: 'Change',
      cell: info => <ChangePercent value={info.getValue()} />,
    }),
    columnHelper.accessor(row => row.score.composite, {
      id: 'originalScore',
      header: 'Original',
      cell: info => <ScoreBadge score={info.getValue()} />,
    }),
    columnHelper.accessor('adjustedScore', {
      header: 'Adjusted',
      cell: info => <ScoreBadge score={info.getValue()} />,
      sortDescFirst: true,
    }),
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const exportCsv = useCallback(() => {
    const sorted = table.getSortedRowModel().rows.map(r => r.original);
    const header = 'Ticker,Name,Market,Cap,Price,Change%,Original Score,Adjusted Score\n';
    const rows = sorted.map(s =>
      `${s.ticker},"${s.name}",${s.market},${s.capCategory},${s.price.toFixed(2)},${s.changePercent.toFixed(2)},${s.score.composite},${s.adjustedScore}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weighted-screener.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [table]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold t-primary">Weighted Screener</h1>
        <p className="text-sm t-muted mt-1">
          Customize scoring weights to rank stocks by what matters most to you.
        </p>
      </div>

      {/* Weight Sliders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Score Weights</h2>
          <div className="flex gap-2">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => updateWeights(preset.weights)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  JSON.stringify(weights) === JSON.stringify(preset.weights)
                    ? 'bg-accent/15 text-accent-light'
                    : 'bg-surface-tertiary t-tertiary hover:t-primary'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {WEIGHT_KEYS.map(key => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium t-secondary">{WEIGHT_LABELS[key]}</label>
                <span className="text-xs font-mono tabular-nums t-muted">{weights[key]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights[key]}
                onChange={e => handleSlider(key, Number(e.target.value))}
                className="range-slider w-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <span className="text-xs t-muted">{data.length} stocks</span>
          <button onClick={exportCsv} className="btn-ghost text-xs flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-surface-border bg-surface-tertiary/30">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left table-header cursor-pointer select-none hover:text-accent-light transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && <span className="text-accent-light">&#9650;</span>}
                        {header.column.getIsSorted() === 'desc' && <span className="text-accent-light">&#9660;</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-surface-border">
          <span className="text-xs t-muted">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="pagination-btn px-3"
            >
              Prev
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="pagination-btn px-3"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
