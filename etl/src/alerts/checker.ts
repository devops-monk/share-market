import type { StockRecord } from '../output/writer.js';
import type { AlertRule, AlertState, TriggeredAlert } from './types.js';

const CURRENCY_MAP: Record<string, string> = {
  US: '$', UK: '£', IN: '₹', DE: '€', FR: '€', JP: '¥', HK: 'HK$',
};

function cur(stock: StockRecord): string {
  return CURRENCY_MAP[stock.market] || '$';
}

/**
 * Check alert rules against current stock data.
 * Uses edge-triggered logic: only fires when condition newly becomes true.
 */
export function checkAlerts(
  rules: AlertRule[],
  stocks: StockRecord[],
  prevState: AlertState,
): { triggered: TriggeredAlert[]; newState: AlertState } {
  const triggered: TriggeredAlert[] = [];
  const newState: AlertState = {};
  const stockMap = new Map(stocks.map(s => [s.ticker, s]));

  // Pre-compute top 200 by market cap for top_owned_drop alerts
  const top200ByMarketCap = new Set(
    [...stocks]
      .filter(s => s.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 200)
      .map(s => s.ticker)
  );

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // Daily summary is handled separately
    if (rule.type === 'daily_summary') continue;

    // Determine which stocks to check
    const tickersToCheck = rule.ticker === '*'
      ? stocks.map(s => s.ticker)
      : [rule.ticker];

    for (const ticker of tickersToCheck) {
      const stock = stockMap.get(ticker);
      if (!stock) continue;

      // Apply cap and market filters
      if (rule.marketFilter && rule.marketFilter.length > 0 && !rule.marketFilter.includes(stock.market)) continue;
      if (rule.capFilter && rule.capFilter.length > 0 && !rule.capFilter.includes(stock.capCategory)) continue;

      const stateKey = `${rule.id}:${ticker}`;
      const conditionMet = evaluateCondition(rule, stock, top200ByMarketCap);

      if (conditionMet) {
        newState[stateKey] = new Date().toISOString();

        // Only fire if condition was NOT met last time (edge-triggered)
        const wasFired = stateKey in prevState;
        if (!wasFired) {
          triggered.push({
            ruleId: rule.id,
            ticker,
            type: rule.type,
            message: formatAlertMessage(rule, stock),
            value: getRelevantValue(rule, stock),
            threshold: rule.threshold,
          });
        }
      }
      // If condition is NOT met, we don't add to newState — so next time
      // it becomes true, it will fire again (edge-triggered)
    }
  }

  return { triggered, newState };
}

function evaluateCondition(rule: AlertRule, stock: StockRecord, top200ByMarketCap: Set<string>): boolean {
  switch (rule.type) {
    case 'price_above':
      return stock.price >= rule.threshold;
    case 'price_below':
      return stock.price <= rule.threshold;
    case 'score_above':
      return stock.score.composite >= rule.threshold;
    case 'score_below':
      return stock.score.composite <= rule.threshold;
    case 'bearish_score_above':
      return stock.bearishScore >= rule.threshold;
    case 'rsi_above':
      return stock.rsi != null && stock.rsi >= rule.threshold;
    case 'rsi_below':
      return stock.rsi != null && stock.rsi <= rule.threshold;
    case 'minervini_pass':
      return stock.minerviniChecks.passed >= rule.threshold;
    case 'uptrend_below_resistance':
      // Fires when stock has N+ years of uptrend AND is below resistance by at least threshold %
      return stock.yearlyUptrendYears >= 2
        && stock.pctBelowResistance != null
        && stock.pctBelowResistance >= rule.threshold;
    case 'top_owned_drop': {
      // Fires when a top-200-by-market-cap stock has dropped >= threshold % from 52-week high
      if (!top200ByMarketCap.has(stock.ticker)) return false;
      const dropPct = stock.fiftyTwoWeekHigh > 0
        ? ((stock.fiftyTwoWeekHigh - stock.price) / stock.fiftyTwoWeekHigh) * 100
        : 0;
      return dropPct >= rule.threshold;
    }
    case 'dividend_at_support': {
      // Dividend-paying stock near support level with decent yield
      if (stock.dividendYield == null || stock.dividendYield < 0.02) return false; // must pay dividend (>=2%)
      if (!stock.supportResistance || stock.supportResistance.length === 0) return false;
      const nearestSupport = stock.supportResistance
        .filter(l => l.type === 'support')
        .sort((a, b) => b.price - a.price)[0]; // highest support below price
      if (!nearestSupport) return false;
      const pctAboveSupport = ((stock.price - nearestSupport.price) / nearestSupport.price) * 100;
      // Stock must be within threshold% of support (e.g., 3% = price is within 3% above support)
      return pctAboveSupport >= 0 && pctAboveSupport <= rule.threshold;
    }
    default:
      return false;
  }
}

function getRelevantValue(rule: AlertRule, stock: StockRecord): number {
  switch (rule.type) {
    case 'price_above':
    case 'price_below':
      return stock.price;
    case 'score_above':
    case 'score_below':
      return stock.score.composite;
    case 'bearish_score_above':
      return stock.bearishScore;
    case 'rsi_above':
    case 'rsi_below':
      return stock.rsi ?? 0;
    case 'minervini_pass':
      return stock.minerviniChecks.passed;
    case 'uptrend_below_resistance':
      return stock.pctBelowResistance ?? 0;
    case 'top_owned_drop':
      return stock.fiftyTwoWeekHigh > 0
        ? ((stock.fiftyTwoWeekHigh - stock.price) / stock.fiftyTwoWeekHigh) * 100
        : 0;
    case 'dividend_at_support':
      return (stock.dividendYield ?? 0) * 100; // yield %
    default:
      return 0;
  }
}

const DASHBOARD_URL = 'https://share.devops-monk.com';

function fmtChange(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return '▓'.repeat(filled) + '░'.repeat(10 - filled);
}

function formatAlertMessage(rule: AlertRule, stock: StockRecord): string {
  const c = cur(stock);
  const price = `${c}${stock.price.toFixed(2)}`;
  const change = fmtChange(stock.changePercent);
  const score = stock.score.composite;
  const link = `<a href="${DASHBOARD_URL}/stock/${stock.ticker}">${stock.ticker}</a>`;
  const header = `<b>${link}</b>  <i>${stock.name}</i>`;
  const scoreLine = `Score  ${scoreBar(score)}  <b>${score}</b>/100`;
  const priceLine = `Price  <code>${price}</code>  ${stock.changePercent >= 0 ? '🟢' : '🔴'} ${change}`;
  const sectorCap = `${stock.sector}  ·  ${stock.capCategory} Cap  ·  ${stock.market}`;

  switch (rule.type) {
    case 'price_above':
      return [
        header,
        `Crossed above <b>${c}${rule.threshold}</b>`,
        ``,
        priceLine,
        scoreLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'price_below':
      return [
        header,
        `Dropped below <b>${c}${rule.threshold}</b>`,
        ``,
        priceLine,
        scoreLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'score_above':
      return [
        header,
        `Score rose above threshold <b>${rule.threshold}</b>`,
        ``,
        scoreLine,
        priceLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'score_below':
      return [
        header,
        `Score dropped below threshold <b>${rule.threshold}</b>`,
        ``,
        scoreLine,
        priceLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'bearish_score_above':
      return [
        header,
        `Bearish score hit <b>${stock.bearishScore}</b>  (threshold: ${rule.threshold})`,
        ``,
        priceLine,
        scoreLine,
        `RSI  <code>${stock.rsi?.toFixed(1) ?? 'N/A'}</code>  ·  Beta  <code>${stock.beta?.toFixed(2) ?? 'N/A'}</code>`,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'rsi_above':
      return [
        header,
        `RSI <b>${stock.rsi?.toFixed(1)}</b> — Overbought  (threshold: ${rule.threshold})`,
        ``,
        priceLine,
        `52W Range  <code>${stock.fiftyTwoWeekRangePercent}%</code>  ·  Vol Ratio  <code>${stock.volumeRatio.toFixed(1)}x</code>`,
        scoreLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'rsi_below':
      return [
        header,
        `RSI <b>${stock.rsi?.toFixed(1)}</b> — Oversold  (threshold: ${rule.threshold})`,
        ``,
        priceLine,
        `52W Range  <code>${stock.fiftyTwoWeekRangePercent}%</code>  ·  Vol Ratio  <code>${stock.volumeRatio.toFixed(1)}x</code>`,
        scoreLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'minervini_pass':
      return [
        header,
        `Minervini  <b>${stock.minerviniChecks.passed}/8</b> checks passed  (threshold: ${rule.threshold})`,
        ``,
        priceLine,
        `RS Percentile  <code>${stock.rsPercentile}</code>  ·  SMA50  <code>${stock.sma50?.toFixed(2) ?? 'N/A'}</code>`,
        scoreLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'uptrend_below_resistance':
      return [
        header,
        `<b>${stock.yearlyUptrendYears}yr</b> uptrend  ·  <b>${stock.pctBelowResistance?.toFixed(1)}%</b> below resistance`,
        ``,
        priceLine,
        `52W High  <code>${c}${stock.fiftyTwoWeekHigh.toFixed(2)}</code>  ·  52W Low  <code>${c}${stock.fiftyTwoWeekLow.toFixed(2)}</code>`,
        scoreLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    case 'top_owned_drop': {
      const dropPct = stock.fiftyTwoWeekHigh > 0
        ? ((stock.fiftyTwoWeekHigh - stock.price) / stock.fiftyTwoWeekHigh) * 100
        : 0;
      const instPct = ((stock.heldPercentInstitutions ?? 0) * 100).toFixed(1);
      return [
        header,
        `<b>${dropPct.toFixed(1)}%</b> off 52W high  ·  <b>${instPct}%</b> institutional`,
        ``,
        priceLine,
        `52W High  <code>${c}${stock.fiftyTwoWeekHigh.toFixed(2)}</code>  ·  Mkt Cap  <code>${(stock.marketCap / 1e9).toFixed(1)}B</code>`,
        scoreLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    }
    case 'dividend_at_support': {
      const yld = ((stock.dividendYield ?? 0) * 100).toFixed(2);
      const nearestSupport = (stock.supportResistance ?? [])
        .filter(l => l.type === 'support')
        .sort((a, b) => b.price - a.price)[0];
      const supportPrice = nearestSupport ? `${c}${nearestSupport.price.toFixed(2)}` : 'N/A';
      return [
        header,
        `Dividend <b>${yld}%</b> yield  ·  Near support <code>${supportPrice}</code>`,
        ``,
        priceLine,
        `52W High  <code>${c}${stock.fiftyTwoWeekHigh.toFixed(2)}</code>  ·  52W Low  <code>${c}${stock.fiftyTwoWeekLow.toFixed(2)}</code>`,
        scoreLine,
        `<i>${sectorCap}</i>`,
      ].join('\n');
    }
    default:
      return `${header}\nAlert: ${rule.type}`;
  }
}

/**
 * Generate a daily market summary message.
 */
export function generateDailySummary(stocks: StockRecord[]): string {
  const sorted = [...stocks].sort((a, b) => b.score.composite - a.score.composite);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();
  const avgScore = Math.round(sorted.reduce((a, s) => a + s.score.composite, 0) / sorted.length);
  const avgChange = stocks.reduce((a, s) => a + s.changePercent, 0) / stocks.length;
  const bullish = stocks.filter(s => s.score.composite >= 60).length;
  const bearish = stocks.filter(s => s.bearishScore >= 4).length;
  const minervini8 = stocks.filter(s => s.minerviniChecks.passed === 8).length;

  // Per-market average change
  const marketFlags: Record<string, string> = { US: '🇺🇸', UK: '🇬🇧', IN: '🇮🇳', DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', HK: '🇭🇰' };
  const marketChanges = Object.entries(marketFlags).map(([market, flag]) => {
    const ms = stocks.filter(s => s.market === market);
    if (ms.length === 0) return null;
    const avg = ms.reduce((a, s) => a + s.changePercent, 0) / ms.length;
    return `${flag} ${market} ${fmtChange(avg)}`;
  }).filter(Boolean);

  const date = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const fmtRow = (s: StockRecord, i: number) => {
    const c = cur(s);
    const chg = fmtChange(s.changePercent);
    const link = `<a href="${DASHBOARD_URL}/stock/${s.ticker}">${s.ticker}</a>`;
    return `  ${i + 1}.  ${link}  <i>${s.name}</i>\n      ${c}${s.price.toFixed(2)}  ${s.changePercent >= 0 ? '🟢' : '🔴'} ${chg}   Score <b>${s.score.composite}</b>`;
  };

  const lines = [
    `<b>📊  Daily Market Summary</b>`,
    `<i>${date}</i>`,
    ``,
    `┌─────────────────────────────`,
    `│  Stocks  <b>${stocks.length}</b>  ·  Avg Score  <b>${avgScore}</b>/100`,
    `│  Avg Change  ${avgChange >= 0 ? '🟢' : '🔴'} <b>${fmtChange(avgChange)}</b>`,
    `│`,
    `│  ${marketChanges.join('   ')}`,
    `│`,
    `│  Bullish (60+)  <code>${bullish}</code>`,
    `│  Bearish Alerts  <code>${bearish}</code>`,
    `│  Minervini 8/8  <code>${minervini8}</code>`,
    `└─────────────────────────────`,
    ``,
    `<b>🏆  Top 5</b>`,
    ...top5.map((s, i) => fmtRow(s, i)),
    ``,
    `<b>📉  Bottom 5</b>`,
    ...bottom5.map((s, i) => fmtRow(s, i)),
    ``,
    `<a href="${DASHBOARD_URL}">Open Dashboard</a>`,
  ];

  return lines.join('\n');
}
