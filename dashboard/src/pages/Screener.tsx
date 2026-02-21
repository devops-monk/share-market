import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import type { StockRecord } from '../types';
import { MarketTag, CapTag, Trading212Badge, ScoreBadge, ChangePercent, PriceDisplay } from '../components/common/Tags';

const col = createColumnHelper<StockRecord>();

const columns = [
  col.accessor('ticker', {
    header: 'Ticker',
    cell: info => (
      <Link to={`/stock/${info.getValue()}`} className="font-semibold text-accent-light hover:text-white transition-colors">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor('name', {
    header: 'Name',
    cell: info => <span className="text-gray-300 truncate max-w-[120px] block">{info.getValue()}</span>,
  }),
  col.accessor('market', {
    header: 'Market',
    cell: info => <MarketTag market={info.getValue()} />,
  }),
  col.accessor('capCategory', {
    header: 'Cap',
    cell: info => <CapTag cap={info.getValue()} />,
  }),
  col.accessor('price', {
    header: 'Price',
    cell: info => <PriceDisplay value={info.getValue()} />,
  }),
  col.accessor('changePercent', {
    header: 'Change',
    cell: info => <ChangePercent value={info.getValue()} />,
  }),
  col.accessor('score.composite', {
    header: 'Composite Score',
    cell: info => <ScoreBadge score={info.getValue()} />,
  }),
  col.accessor('rsi', {
    header: 'RSI',
    cell: info => {
      const v = info.getValue();
      if (v == null) return <span className="text-gray-600">--</span>;
      const color = v > 70 ? 'text-bearish' : v < 30 ? 'text-bullish' : 'text-gray-300';
      return <span className={`font-mono tabular-nums ${color}`}>{v.toFixed(1)}</span>;
    },
  }),
  col.accessor('sentimentAvg', {
    header: 'Sentiment',
    cell: info => {
      const v = info.getValue();
      const color = v > 0.1 ? 'text-bullish' : v < -0.1 ? 'text-bearish' : 'text-neutral';
      return <span className={`font-mono tabular-nums ${color}`}>{v.toFixed(2)}</span>;
    },
  }),
  col.accessor('trading212', {
    header: 'T212',
    cell: info => info.getValue() ? <Trading212Badge /> : <span className="text-gray-700">--</span>,
  }),
];

export default function Screener({ stocks }: { stocks: StockRecord[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'score_composite', desc: true }]);
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [capFilter, setCapFilter] = useState<string>('all');
  const [t212Only, setT212Only] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return stocks.filter(s => {
      if (marketFilter !== 'all' && s.market !== marketFilter) return false;
      if (capFilter !== 'all' && s.capCategory !== capFilter) return false;
      if (t212Only && !s.trading212) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.ticker.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stocks, marketFilter, capFilter, t212Only, search]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Stock Screener</h1>
        <p className="text-sm text-gray-500 mt-1">Sort, filter, and find the best opportunities</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search ticker or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field w-52"
          />
          <select
            value={marketFilter}
            onChange={e => setMarketFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Markets</option>
            <option value="US">US</option>
            <option value="UK">UK</option>
          </select>
          <select
            value={capFilter}
            onChange={e => setCapFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Caps</option>
            <option value="Large">Large Cap</option>
            <option value="Mid">Mid Cap</option>
            <option value="Small">Small Cap</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={t212Only}
              onChange={e => setT212Only(e.target.checked)}
              className="w-4 h-4 rounded border-surface-border bg-surface-tertiary accent-accent"
            />
            Trading212 only
          </label>
          <div className="ml-auto">
            <span className="badge bg-surface-tertiary text-gray-300 ring-1 ring-surface-border">
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
                      className="px-4 py-3 text-left table-header cursor-pointer hover:text-gray-200 select-none transition-colors"
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
    </div>
  );
}
