import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { isUSMarketOpen } from '../lib/market-hours';
import { decryptString } from '../lib/crypto';

export interface RealtimePrice {
  price: number;
  previousPrice: number;
  timestamp: number;
  volume: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'market-closed' | 'no-key';

const FINNHUB_KEY_STORAGE = 'sm-finnhub-api-key';
const BATCH_INTERVAL = 500; // ms

export function useRealtimePrices(tickers: string[]) {
  const [prices, setPrices] = useState<Map<string, RealtimePrice>>(new Map());
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [subscribedCount, setSubscribedCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());
  const batchRef = useRef<Map<string, RealtimePrice>>(new Map());
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);

  const tickerSet = useMemo(() => new Set(tickers.map(t => t.toUpperCase())), [tickers]);

  const flushBatch = useCallback(() => {
    if (batchRef.current.size === 0) return;
    const batch = new Map(batchRef.current);
    batchRef.current.clear();
    setPrices(prev => {
      const next = new Map(prev);
      for (const [symbol, data] of batch) {
        const existing = next.get(symbol);
        next.set(symbol, {
          ...data,
          previousPrice: existing?.price ?? data.price,
        });
      }
      return next;
    });
    setLastUpdate(new Date());
  }, []);

  const connect = useCallback(async () => {
    // Check market hours
    if (!isUSMarketOpen()) {
      setStatus('market-closed');
      return;
    }

    // Get API key
    const encrypted = localStorage.getItem(FINNHUB_KEY_STORAGE);
    if (!encrypted) {
      setStatus('no-key');
      return;
    }

    let apiKey = await decryptString(encrypted);
    if (!apiKey) {
      // Maybe plaintext legacy
      if (encrypted.length > 10 && !encrypted.includes(' ')) {
        apiKey = encrypted;
      } else {
        setStatus('no-key');
        return;
      }
    }

    setStatus('connecting');

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectDelayRef.current = 1000; // reset backoff
      // Subscribe to all tickers
      for (const ticker of tickerSet) {
        ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
        subscribedRef.current.add(ticker);
      }
      setSubscribedCount(tickerSet.size);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'trade' && Array.isArray(data.data)) {
          for (const trade of data.data) {
            batchRef.current.set(trade.s, {
              price: trade.p,
              previousPrice: trade.p,
              timestamp: trade.t,
              volume: trade.v,
            });
          }
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      subscribedRef.current.clear();
      setSubscribedCount(0);
      // Reconnect with exponential backoff
      if (isUSMarketOpen()) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
          connect();
        }, reconnectDelayRef.current);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    // Start batch flush timer
    if (batchTimerRef.current) clearInterval(batchTimerRef.current);
    batchTimerRef.current = setInterval(flushBatch, BATCH_INTERVAL);
  }, [tickerSet, flushBatch]);

  // Diff ticker subscriptions when list changes
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Subscribe new tickers
    for (const ticker of tickerSet) {
      if (!subscribedRef.current.has(ticker)) {
        ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
        subscribedRef.current.add(ticker);
      }
    }

    // Unsubscribe removed tickers
    for (const ticker of subscribedRef.current) {
      if (!tickerSet.has(ticker)) {
        ws.send(JSON.stringify({ type: 'unsubscribe', symbol: ticker }));
        subscribedRef.current.delete(ticker);
      }
    }

    setSubscribedCount(subscribedRef.current.size);
  }, [tickerSet]);

  // Connect on mount, check market hours periodically
  useEffect(() => {
    connect();

    const marketCheckInterval = setInterval(() => {
      if (isUSMarketOpen() && status !== 'connected' && status !== 'connecting') {
        connect();
      } else if (!isUSMarketOpen() && wsRef.current) {
        wsRef.current.close();
        setStatus('market-closed');
      }
    }, 60000); // check every minute

    return () => {
      clearInterval(marketCheckInterval);
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { prices, status, subscribedCount, lastUpdate };
}
