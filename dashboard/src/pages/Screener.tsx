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
import { MarketTag, CapTag, Trading212Badge, ScoreBadge } from '../components/common/Tags';

const col = createColumnHelper<StockRecord>();

const columns = [
  col.accessor('ticker', {
    header: 'Ticker',
    cell: info => (
      <Link to={`/stock/${info.getValue()}`} className="text-blue-400 hover:text-blue-300 font-medium">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor('name', { header: 'Name' }),
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
    cell: info => `$${info.getValue().toFixed(2)}`,
  }),
  col.accessor('changePercent', {
    header: 'Change %',
    cell: info => {
      const v = info.getValue();
      return (
        <span className={v >= 0 ? 'text-bullish' : 'text-bearish'}>
          {v >= 0 ? '+' : ''}{v.toFixed(2)}%
        </span>
      );
    },
  }),
  col.accessor('score.composite', {
    header: 'Score',
    cell: info => <ScoreBadge score={info.getValue()} />,
  }),
  col.accessor('rsi', {
    header: 'RSI',
    cell: info => {
      const v = info.getValue();
      if (v == null) return '—';
      const color = v > 70 ? 'text-bearish' : v < 30 ? 'text-bullish' : 'text-gray-300';
      return <span className={color}>{v.toFixed(1)}</span>;
    },
  }),
  col.accessor('sentimentAvg', {
    header: 'Sentiment',
    cell: info => {
      const v = info.getValue();
      const color = v > 0.1 ? 'text-bullish' : v < -0.1 ? 'text-bearish' : 'text-neutral';
      return <span className={color}>{v.toFixed(2)}</span>;
    },
  }),
  col.accessor('trading212', {
    header: 'T212',
    cell: info => info.getValue() ? <Trading212Badge /> : null,
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Stock Screener</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search ticker or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-surface-secondary border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 w-48"
        />
        <select
          value={marketFilter}
          onChange={e => setMarketFilter(e.target.value)}
          className="bg-surface-secondary border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All Markets</option>
          <option value="US">US</option>
          <option value="UK">UK</option>
        </select>
        <select
          value={capFilter}
          onChange={e => setCapFilter(e.target.value)}
          className="bg-surface-secondary border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All Caps</option>
          <option value="Large">Large</option>
          <option value="Mid">Mid</option>
          <option value="Small">Small</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={t212Only}
            onChange={e => setT212Only(e.target.checked)}
            className="rounded"
          />
          Trading212 only
        </label>
        <span className="text-sm text-gray-500">{filtered.length} stocks</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="bg-surface-secondary">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-3 py-2 text-left text-gray-400 font-medium cursor-pointer hover:text-white select-none"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-t border-gray-800 hover:bg-surface-secondary/50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
