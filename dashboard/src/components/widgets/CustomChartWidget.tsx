import { useState } from 'react';
import type { StockRecord } from '../../types';
import PriceChart from '../charts/PriceChart';

interface Props {
  stocks: StockRecord[];
}

export default function CustomChartWidget({ stocks }: Props) {
  const [ticker, setTicker] = useState(stocks[0]?.ticker || '');
  const stock = stocks.find(s => s.ticker === ticker);

  return (
    <div className="flex flex-col h-full p-1">
      <select
        value={ticker}
        onChange={e => setTicker(e.target.value)}
        className="input-field text-xs mb-2"
      >
        {stocks.slice(0, 50).map(s => (
          <option key={s.ticker} value={s.ticker}>{s.ticker}</option>
        ))}
      </select>
      {stock && (
        <div className="flex-1 min-h-0">
          <PriceChart stock={stock} />
        </div>
      )}
    </div>
  );
}
