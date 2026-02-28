import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PaperTrade, PaperPortfolio, StockRecord } from '../types';

const STORAGE_KEY = 'sm-paper-trading';
const DEFAULT_CAPITAL = 100000;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function readPortfolio(): PaperPortfolio {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    startingCapital: DEFAULT_CAPITAL,
    cash: DEFAULT_CAPITAL,
    trades: [],
    createdAt: new Date().toISOString(),
  };
}

function writePortfolio(p: PaperPortfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export interface OpenPosition {
  ticker: string;
  shares: number;
  avgCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
}

export interface ClosedTrade {
  ticker: string;
  shares: number;
  buyPrice: number;
  sellPrice: number;
  pnl: number;
  pnlPct: number;
  buyDate: string;
  sellDate: string;
}

export interface PerformanceMetrics {
  totalPnl: number;
  totalPnlPct: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
}

export function usePaperTrading(stocks: StockRecord[]) {
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(readPortfolio);

  useEffect(() => { writePortfolio(portfolio); }, [portfolio]);

  const executeTrade = useCallback((ticker: string, type: 'buy' | 'sell', shares: number, price: number, notes?: string) => {
    setPortfolio(prev => {
      const cost = shares * price;
      if (type === 'buy' && cost > prev.cash) return prev; // insufficient funds
      const trade: PaperTrade = {
        id: generateId(),
        ticker: ticker.toUpperCase(),
        type,
        shares,
        price,
        date: new Date().toISOString(),
        notes,
      };
      return {
        ...prev,
        cash: type === 'buy' ? prev.cash - cost : prev.cash + cost,
        trades: [...prev.trades, trade],
      };
    });
  }, []);

  const closePosition = useCallback((ticker: string, price: number) => {
    setPortfolio(prev => {
      // Calculate net shares for this ticker
      const netShares = prev.trades
        .filter(t => t.ticker === ticker)
        .reduce((acc, t) => t.type === 'buy' ? acc + t.shares : acc - t.shares, 0);
      if (netShares <= 0) return prev;
      const sellTrade: PaperTrade = {
        id: generateId(),
        ticker,
        type: 'sell',
        shares: netShares,
        price,
        date: new Date().toISOString(),
        notes: 'Position closed',
      };
      return {
        ...prev,
        cash: prev.cash + netShares * price,
        trades: [...prev.trades, sellTrade],
      };
    });
  }, []);

  const resetPortfolio = useCallback((startingCapital: number = DEFAULT_CAPITAL) => {
    setPortfolio({
      startingCapital,
      cash: startingCapital,
      trades: [],
      createdAt: new Date().toISOString(),
    });
  }, []);

  const openPositions = useMemo((): OpenPosition[] => {
    const posMap = new Map<string, { shares: number; totalCost: number }>();
    for (const t of portfolio.trades) {
      if (!posMap.has(t.ticker)) posMap.set(t.ticker, { shares: 0, totalCost: 0 });
      const pos = posMap.get(t.ticker)!;
      if (t.type === 'buy') {
        pos.totalCost += t.shares * t.price;
        pos.shares += t.shares;
      } else {
        // Reduce position — use avg cost for the sold portion
        const avgCost = pos.shares > 0 ? pos.totalCost / pos.shares : 0;
        pos.totalCost -= t.shares * avgCost;
        pos.shares -= t.shares;
      }
    }
    const result: OpenPosition[] = [];
    for (const [ticker, pos] of posMap) {
      if (pos.shares <= 0) continue;
      const stock = stocks.find(s => s.ticker === ticker);
      const currentPrice = stock?.price ?? (pos.totalCost / pos.shares);
      const avgCost = pos.totalCost / pos.shares;
      const currentValue = pos.shares * currentPrice;
      const pnl = currentValue - pos.totalCost;
      const pnlPct = pos.totalCost > 0 ? (pnl / pos.totalCost) * 100 : 0;
      result.push({ ticker, shares: pos.shares, avgCost, totalCost: pos.totalCost, currentPrice, currentValue, pnl, pnlPct });
    }
    return result;
  }, [portfolio.trades, stocks]);

  const closedTrades = useMemo((): ClosedTrade[] => {
    // Group trades by ticker, find completed round-trips
    const result: ClosedTrade[] = [];
    const tickerTrades = new Map<string, PaperTrade[]>();
    for (const t of portfolio.trades) {
      if (!tickerTrades.has(t.ticker)) tickerTrades.set(t.ticker, []);
      tickerTrades.get(t.ticker)!.push(t);
    }
    for (const [ticker, trades] of tickerTrades) {
      let openShares = 0;
      let openCost = 0;
      for (const t of trades) {
        if (t.type === 'buy') {
          openShares += t.shares;
          openCost += t.shares * t.price;
        } else if (t.type === 'sell' && openShares > 0) {
          const avgBuy = openCost / openShares;
          const soldShares = Math.min(t.shares, openShares);
          const pnl = soldShares * (t.price - avgBuy);
          const pnlPct = avgBuy > 0 ? ((t.price - avgBuy) / avgBuy) * 100 : 0;
          // Find the earliest buy date for this batch
          const firstBuy = trades.find(tr => tr.type === 'buy');
          result.push({
            ticker,
            shares: soldShares,
            buyPrice: avgBuy,
            sellPrice: t.price,
            pnl,
            pnlPct,
            buyDate: firstBuy?.date ?? t.date,
            sellDate: t.date,
          });
          openCost -= soldShares * avgBuy;
          openShares -= soldShares;
        }
      }
    }
    return result;
  }, [portfolio.trades]);

  const metrics = useMemo((): PerformanceMetrics => {
    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl <= 0);
    const totalPnl = closedTrades.reduce((a, t) => a + t.pnl, 0)
      + openPositions.reduce((a, p) => a + p.pnl, 0);
    const totalPnlPct = portfolio.startingCapital > 0 ? (totalPnl / portfolio.startingCapital) * 100 : 0;
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + t.pnl, 0) / losses.length) : 0;
    const grossWins = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLosses = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

    // Max drawdown from equity curve
    let peak = portfolio.startingCapital;
    let maxDD = 0;
    let equity = portfolio.startingCapital;
    for (const t of closedTrades) {
      equity += t.pnl;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    return {
      totalPnl,
      totalPnlPct,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown: maxDD,
      totalTrades: closedTrades.length,
      winCount: wins.length,
      lossCount: losses.length,
    };
  }, [closedTrades, openPositions, portfolio.startingCapital]);

  const positionsValue = openPositions.reduce((a, p) => a + p.currentValue, 0);
  const totalEquity = portfolio.cash + positionsValue;

  return {
    portfolio,
    cash: portfolio.cash,
    totalEquity,
    positionsValue,
    openPositions,
    closedTrades,
    metrics,
    executeTrade,
    closePosition,
    resetPortfolio,
  };
}
