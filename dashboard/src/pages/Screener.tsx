import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, ScoreBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';
import InfoTooltip from '../components/common/InfoTooltip';
import { TIPS } from '../lib/tooltips';

const col = createColumnHelper<StockRecord>();

const TH = ({ label, tipKey }: { label: string; tipKey?: string }) => (
  <InfoTooltip text={TIPS[tipKey ?? label] ?? ''}>{label}</InfoTooltip>
);

const columns = [
  col.accessor('ticker', {
    header: 'Ticker',
    cell: info => (
      <Link to={`/stock/${info.getValue()}`} className="font-semibold text-accent-light hover:t-primary transition-colors">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor('name', {
    header: 'Name',
    cell: info => <span className="t-secondary truncate max-w-[120px] block">{info.getValue()}</span>,
  }),
  col.accessor('market', {
    header: () => <TH label="Market" />,
    cell: info => <MarketTag market={info.getValue()} />,
  }),
  col.accessor('capCategory', {
    header: () => <TH label="Cap" />,
    cell: info => <CapTag cap={info.getValue()} />,
  }),
  col.accessor('price', {
    header: () => <TH label="Price" />,
    cell: info => <PriceDisplay value={info.getValue()} market={info.row.original.market} />,
  }),
  col.accessor('changePercent', {
    header: () => <TH label="Change" />,
    cell: info => <ChangePercent value={info.getValue()} />,
  }),
  col.accessor('score.composite', {
    header: () => <TH label="Score" tipKey="Composite Score" />,
    cell: info => <ScoreBadge score={info.getValue()} />,
  }),
  col.accessor('rsi', {
    header: () => <TH label="RSI" />,
    cell: info => {
      const v = info.getValue();
      if (v == null) return <span className="t-faint">--</span>;
      const color = v > 70 ? 'text-bearish' : v < 30 ? 'text-bullish' : 't-secondary';
      return <span className={`font-mono tabular-nums ${color}`}>{v.toFixed(1)}</span>;
    },
  }),
  col.accessor('rsPercentile', {
    header: () => <TH label="RS" />,
    cell: info => {
      const v = info.getValue();
      const color = v >= 80 ? 'text-bullish' : v >= 50 ? 't-secondary' : 'text-bearish';
      return <span className={`font-mono tabular-nums ${color}`}>{v}</span>;
    },
  }),
  col.accessor('styleClassification', {
    header: () => <TH label="Style" />,
    cell: info => {
      const v = info.getValue();
      const color = v === 'Growth' ? 'text-accent-light' : v === 'Value' ? 'text-bullish' : 'text-neutral';
      return <span className={`text-xs font-medium ${color}`}>{v}</span>;
    },
  }),
  col.accessor('sentimentAvg', {
    header: () => <TH label="Sentiment" />,
    cell: info => {
      const v = info.getValue();
      if (v == null) return <span className="t-faint">--</span>;
      const color = v > 0.1 ? 'text-bullish' : v < -0.1 ? 'text-bearish' : 'text-neutral';
      return <span className={`font-mono tabular-nums ${color}`}>{v.toFixed(2)}</span>;
    },
  }),
  col.accessor('dataCompleteness', {
    header: () => <TH label="Data %" tipKey="Data %" />,
    cell: info => {
      const v = info.getValue();
      const color = v >= 80 ? 'text-bullish' : v >= 50 ? 'text-neutral' : 'text-bearish';
      return <span className={`font-mono tabular-nums text-xs ${color}`}>{v}%</span>;
    },
  }),
];

export default function Screener({ stocks }: { stocks: StockRecord[] }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params (or defaults)
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sortId = searchParams.get('sort');
    const sortDir = searchParams.get('dir');
    if (sortId) return [{ id: sortId, desc: sortDir !== 'asc' }];
    return [{ id: 'score_composite', desc: true }];
  });
  const [pagination, setPagination] = useState<PaginationState>(() => ({
    pageIndex: Math.max(0, Number(searchParams.get('page') ?? 1) - 1),
    pageSize: [10, 25, 50, 100].includes(Number(searchParams.get('size'))) ? Number(searchParams.get('size')) : 25,
  }));
  const [marketFilter, setMarketFilter] = useState<string>(searchParams.get('market') ?? 'all');
  const [capFilter, setCapFilter] = useState<string>(searchParams.get('cap') ?? 'all');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [styleFilter, setStyleFilter] = useState<string>(searchParams.get('style') ?? 'all');

  // Sync state to URL params
  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (marketFilter !== 'all') params.set('market', marketFilter);
    if (capFilter !== 'all') params.set('cap', capFilter);
    if (styleFilter !== 'all') params.set('style', styleFilter);
    if (sorting.length > 0 && sorting[0].id !== 'score_composite') {
      params.set('sort', sorting[0].id);
      if (!sorting[0].desc) params.set('dir', 'asc');
    }
    if (sorting.length > 0 && sorting[0].id === 'score_composite' && !sorting[0].desc) {
      params.set('sort', sorting[0].id);
      params.set('dir', 'asc');
    }
    if (pagination.pageIndex > 0) params.set('page', String(pagination.pageIndex + 1));
    if (pagination.pageSize !== 25) params.set('size', String(pagination.pageSize));
    setSearchParams(params, { replace: true });
  }, [search, marketFilter, capFilter, styleFilter, sorting, pagination, setSearchParams]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  const filtered = useMemo(() => {
    return stocks.filter(s => {
      if (marketFilter !== 'all' && s.market !== marketFilter) return false;
      if (capFilter !== 'all' && s.capCategory !== capFilter) return false;
      if (styleFilter !== 'all' && s.styleClassification !== styleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.ticker.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stocks, marketFilter, capFilter, styleFilter, search]);

  const exportCsv = () => {
    const headers = ['Ticker','Name','Market','Cap','Style','Price','Change%','Score','RS','RSI','P/E','ROE','Sentiment'];
    const rows = filtered.map(s => [
      s.ticker, s.name, s.market, s.capCategory, s.styleClassification,
      s.price.toFixed(2), s.changePercent.toFixed(2), s.score.composite,
      s.rsPercentile, s.rsi?.toFixed(1) ?? '', s.pe?.toFixed(1) ?? '',
      s.returnOnEquity != null ? (s.returnOnEquity * 100).toFixed(1) : '',
      s.sentimentAvg.toFixed(3),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screener-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset to first page when filters change
  const resetPage = () => setPagination(p => ({ ...p, pageIndex: 0 }));

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Stock Screener</h1>
        <p className="text-sm t-muted mt-1">Sort, filter, and find the best opportunities</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search ticker or name..."
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            className="input-field w-52"
          />
          <select
            value={marketFilter}
            onChange={e => { setMarketFilter(e.target.value); resetPage(); }}
            className="input-field"
          >
            <option value="all">All Markets</option>
            <option value="US">US</option>
            <option value="UK">UK</option>
          </select>
          <select
            value={capFilter}
            onChange={e => { setCapFilter(e.target.value); resetPage(); }}
            className="input-field"
          >
            <option value="all">All Caps</option>
            <option value="Large">Large Cap</option>
            <option value="Mid">Mid Cap</option>
            <option value="Small">Small Cap</option>
          </select>
          <select
            value={styleFilter}
            onChange={e => { setStyleFilter(e.target.value); resetPage(); }}
            className="input-field"
          >
            <option value="all">All Styles</option>
            <option value="Value">Value</option>
            <option value="Blend">Blend</option>
            <option value="Growth">Growth</option>
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 hover:bg-accent/25 transition-colors cursor-pointer text-xs px-3 py-1.5"
            >
              Export CSV
            </button>
            <span className="badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">
              {filtered.length} stocks
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-flat overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-surface-border">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-4 py-3 text-left table-header cursor-pointer hover:t-secondary select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-accent/60">
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors"
                >
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
      </div>

      {/* Pagination */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm t-muted">Rows per page</span>
            <select
              value={pagination.pageSize}
              onChange={e => {
                setPagination({ pageIndex: 0, pageSize: Number(e.target.value) });
              }}
              className="input-field text-sm py-1 px-2"
            >
              {[10, 25, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="pagination-btn"
              title="First page"
            >
              ««
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="pagination-btn"
              title="Previous page"
            >
              «
            </button>

            {/* Page numbers */}
            {(() => {
              const current = pagination.pageIndex;
              const total = table.getPageCount();
              const pages: (number | 'ellipsis')[] = [];

              if (total <= 7) {
                for (let i = 0; i < total; i++) pages.push(i);
              } else {
                pages.push(0);
                if (current > 2) pages.push('ellipsis');
                for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
                  pages.push(i);
                }
                if (current < total - 3) pages.push('ellipsis');
                pages.push(total - 1);
              }

              return pages.map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-1 t-faint text-sm">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => table.setPageIndex(p)}
                    className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${
                      p === current
                        ? 'bg-accent/15 text-accent-light border border-accent/20'
                        : 't-tertiary hover:t-primary hover:bg-surface-hover'
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              );
            })()}

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="pagination-btn"
              title="Next page"
            >
              »
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="pagination-btn"
              title="Last page"
            >
              »»
            </button>
          </div>

          <span className="text-sm t-muted">
            {filtered.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, filtered.length)} of {filtered.length}
          </span>
        </div>
      </div>
    </div>
  );
}
