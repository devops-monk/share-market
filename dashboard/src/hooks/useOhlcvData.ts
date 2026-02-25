import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;

// Module-level cache to avoid refetching
const ohlcvCache = new Map<string, number[][]>();

export function useOhlcvData(tickers: string[]) {
  const [data, setData] = useState<Map<string, number[][]>>(new Map());
  const [loading, setLoading] = useState(false);
  const prevTickersRef = useRef<string>('');

  useEffect(() => {
    const key = tickers.sort().join(',');
    if (key === prevTickersRef.current || tickers.length === 0) return;
    prevTickersRef.current = key;

    setLoading(true);

    const fetchAll = async () => {
      const result = new Map<string, number[][]>();

      await Promise.all(
        tickers.map(async (ticker) => {
          // Check cache first
          if (ohlcvCache.has(ticker)) {
            result.set(ticker, ohlcvCache.get(ticker)!);
            return;
          }

          try {
            const safeTicker = ticker.replace(/[^a-zA-Z0-9.-]/g, '_');
            const res = await fetch(`${BASE}data/charts/${safeTicker}.json`);
            if (!res.ok) return;
            const candles: number[][] = await res.json();
            ohlcvCache.set(ticker, candles);
            result.set(ticker, candles);
          } catch { /* ignore */ }
        })
      );

      setData(result);
      setLoading(false);
    };

    fetchAll();
  }, [tickers]);

  return { data, loading };
}
