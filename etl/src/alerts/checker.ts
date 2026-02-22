import type { StockRecord } from '../output/writer.js';
import type { AlertRule, AlertState, TriggeredAlert } from './types.js';

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

      const stateKey = `${rule.id}:${ticker}`;
      const conditionMet = evaluateCondition(rule, stock);

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

function evaluateCondition(rule: AlertRule, stock: StockRecord): boolean {
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
    default:
      return 0;
  }
}

function formatAlertMessage(rule: AlertRule, stock: StockRecord): string {
  const cur = stock.market === 'UK' ? '£' : '$';
  const price = `${cur}${stock.price.toFixed(2)}`;
  const change = `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`;
  const score = stock.score.composite;

  switch (rule.type) {
    case 'price_above':
      return `${stock.ticker} crossed above ${cur}${rule.threshold}\nPrice: ${price} (${change})\nScore: ${score}/100`;
    case 'price_below':
      return `${stock.ticker} dropped below ${cur}${rule.threshold}\nPrice: ${price} (${change})\nScore: ${score}/100`;
    case 'score_above':
      return `${stock.ticker} score rose to ${score}/100 (threshold: ${rule.threshold})\nPrice: ${price} (${change})`;
    case 'score_below':
      return `${stock.ticker} score dropped to ${score}/100 (threshold: ${rule.threshold})\nPrice: ${price} (${change})`;
    case 'bearish_score_above':
      return `${stock.ticker} bearish score is ${stock.bearishScore} (threshold: ${rule.threshold})\nPrice: ${price} (${change})\nScore: ${score}/100`;
    case 'rsi_above':
      return `${stock.ticker} RSI is ${stock.rsi?.toFixed(1)} — Overbought (threshold: ${rule.threshold})\nPrice: ${price} (${change})`;
    case 'rsi_below':
      return `${stock.ticker} RSI is ${stock.rsi?.toFixed(1)} — Oversold (threshold: ${rule.threshold})\nPrice: ${price} (${change})`;
    case 'minervini_pass':
      return `${stock.ticker} passes ${stock.minerviniChecks.passed}/8 Minervini checks (threshold: ${rule.threshold})\nPrice: ${price} | RS: ${stock.rsPercentile} | Score: ${score}/100`;
    default:
      return `Alert for ${stock.ticker}: ${rule.type}`;
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

  const lines = [
    `📊 Daily Market Summary`,
    ``,
    `Stocks: ${stocks.length} | Avg Score: ${avgScore} | Avg Change: ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
    `Bullish (60+): ${bullish} | Bearish Alerts: ${bearish} | Minervini 8/8: ${minervini8}`,
    ``,
    `🏆 Top 5:`,
    ...top5.map((s, i) => `${i + 1}. ${s.ticker} — Score ${s.score.composite} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`),
    ``,
    `⚠️ Bottom 5:`,
    ...bottom5.map((s, i) => `${i + 1}. ${s.ticker} — Score ${s.score.composite} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`),
  ];

  return lines.join('\n');
}
