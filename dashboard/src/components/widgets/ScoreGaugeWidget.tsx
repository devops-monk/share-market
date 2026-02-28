import { useState } from 'react';
import type { StockRecord } from '../../types';
import ScoreGauge from '../charts/ScoreGauge';

interface Props {
  stocks: StockRecord[];
}

export default function ScoreGaugeWidget({ stocks }: Props) {
  const [ticker, setTicker] = useState(stocks[0]?.ticker || '');
  const stock = stocks.find(s => s.ticker === ticker);

  return (
    <div className="flex flex-col items-center gap-2 p-2 h-full">
      <select
        value={ticker}
        onChange={e => setTicker(e.target.value)}
        className="input-field text-xs w-full"
      >
        {stocks.slice(0, 50).map(s => (
          <option key={s.ticker} value={s.ticker}>{s.ticker} — {s.name}</option>
        ))}
      </select>
      {stock && (
        <div className="flex-1 flex items-center justify-center">
          <ScoreGauge score={stock.score.composite} size={100} />
        </div>
      )}
    </div>
  );
}
