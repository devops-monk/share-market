import { useState, useEffect } from 'react';
import type { StockRecord, SummaryData, NewsItem, Metadata } from '../types';

const BASE = import.meta.env.BASE_URL;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}data/${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useStockData() {
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [bearishAlerts, setBearishAlerts] = useState<StockRecord[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson<StockRecord[]>('latest.json'),
      fetchJson<SummaryData>('summary.json'),
      fetchJson<StockRecord[]>('bearish-alerts.json'),
      fetchJson<NewsItem[]>('news-sentiment.json'),
      fetchJson<Metadata>('metadata.json'),
    ]).then(([s, sum, ba, n, m]) => {
      setStocks(s || []);
      setSummary(sum || null);
      setBearishAlerts(ba || []);
      setNews(n || []);
      setMetadata(m || null);
      setLoading(false);
    });
  }, []);

  return { stocks, summary, bearishAlerts, news, metadata, loading };
}
