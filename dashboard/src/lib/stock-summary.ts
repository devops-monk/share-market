import type { StockRecord } from '../types';
import { currencySymbol } from './format';

/**
 * Generates a natural-language analyst-style summary for a stock.
 * Combines score, signals, fundamentals, technicals, and valuation
 * into readable paragraphs that read like a brief research note.
 */
export function generateStockSummary(stock: StockRecord): string[] {
  const s = stock.score;
  const paragraphs: string[] = [];

  // ── 1. Opening — overall assessment ──
  paragraphs.push(buildOpening(stock));

  // ── 2. Technical setup ──
  const techPara = buildTechnicalParagraph(stock);
  if (techPara) paragraphs.push(techPara);

  // ── 3. Fundamentals & valuation ──
  const fundPara = buildFundamentalsParagraph(stock);
  if (fundPara) paragraphs.push(fundPara);

  // ── 4. Signals & catalysts ──
  const signalPara = buildSignalsParagraph(stock);
  if (signalPara) paragraphs.push(signalPara);

  // ── 5. Closing verdict ──
  paragraphs.push(buildClosing(stock));

  return paragraphs;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function pct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function cur(stock: StockRecord): string {
  return currencySymbol(stock.market);
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'strong';
  if (score >= 55) return 'above average';
  if (score >= 40) return 'mixed';
  if (score >= 25) return 'below average';
  return 'weak';
}

function trendDesc(stock: StockRecord): string {
  const above50 = stock.sma50 != null && stock.price > stock.sma50;
  const above200 = stock.sma200 != null && stock.price > stock.sma200;
  if (above50 && above200) return 'in a confirmed uptrend';
  if (!above50 && !above200) return 'in a downtrend';
  if (above200 && !above50) return 'in a long-term uptrend but showing short-term weakness';
  return 'attempting a short-term recovery within a longer-term downtrend';
}

/* ── Paragraph builders ─────────────────────────────────────────────────── */

function buildOpening(stock: StockRecord): string {
  const s = stock.score;
  const composite = s.composite;
  const name = stock.name.length > 40 ? stock.ticker : stock.name;
  const c = cur(stock);

  let opening = `${name} (${stock.ticker}) is trading at ${c}${stock.price.toFixed(2)}, ${pct(stock.changePercent)} today, `;

  // Market cap context
  if (stock.marketCap > 0) {
    const mcap = stock.marketCap >= 1e12 ? `${c}${(stock.marketCap / 1e12).toFixed(1)}T`
      : stock.marketCap >= 1e9 ? `${c}${(stock.marketCap / 1e9).toFixed(1)}B`
      : `${c}${(stock.marketCap / 1e6).toFixed(0)}M`;
    opening += `with a market cap of ${mcap}. `;
  } else {
    opening += `a ${stock.capCategory.toLowerCase()}-cap ${stock.sector.toLowerCase()} stock. `;
  }

  // Composite score context
  opening += `Our composite score of ${composite}/100 is ${scoreLabel(composite)}`;

  // Strongest and weakest components
  const components = [
    { name: 'momentum', score: s.priceMomentum },
    { name: 'technicals', score: s.technicalSignals },
    { name: 'sentiment', score: s.newsSentiment },
    { name: 'fundamentals', score: s.fundamentals },
    { name: 'volume', score: s.volumeTrend },
    { name: 'risk profile', score: s.riskInverse },
  ];
  const sorted = [...components].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  if (strongest.score >= 60 && weakest.score < 40) {
    opening += `, driven by ${strongest.name} (${strongest.score}) while ${weakest.name} (${weakest.score}) is the weakest area.`;
  } else if (strongest.score >= 60) {
    opening += `, with ${strongest.name} being the standout factor at ${strongest.score}.`;
  } else {
    opening += `, with no single factor standing out strongly.`;
  }

  return opening;
}

function buildTechnicalParagraph(stock: StockRecord): string | null {
  const parts: string[] = [];

  // Trend
  parts.push(`The stock is ${trendDesc(stock)}`);

  // RSI
  if (stock.rsi != null) {
    if (stock.rsi > 70) {
      parts.push(`RSI at ${stock.rsi.toFixed(0)} indicates overbought conditions — a pullback may be due`);
    } else if (stock.rsi < 30) {
      parts.push(`RSI at ${stock.rsi.toFixed(0)} signals oversold territory — a mean-reversion bounce is possible`);
    } else if (stock.rsi > 55) {
      parts.push(`RSI at ${stock.rsi.toFixed(0)} shows healthy bullish momentum`);
    } else if (stock.rsi < 45) {
      parts.push(`RSI at ${stock.rsi.toFixed(0)} suggests fading momentum`);
    }
  }

  // 52-week range
  if (stock.fiftyTwoWeekRangePercent >= 90) {
    parts.push(`trading near its 52-week high (${stock.fiftyTwoWeekRangePercent}% of range)`);
  } else if (stock.fiftyTwoWeekRangePercent <= 15) {
    parts.push(`languishing near its 52-week low (${stock.fiftyTwoWeekRangePercent}% of range)`);
  }

  // Bollinger squeeze
  if (stock.bollingerSqueeze) {
    parts.push('a Bollinger Band squeeze is active, suggesting a significant move is building');
  }

  // Volume
  if (stock.volumeRatio >= 2) {
    parts.push(`volume is ${stock.volumeRatio.toFixed(1)}x the 20-day average, indicating strong institutional interest`);
  } else if (stock.volumeRatio >= 1.5) {
    parts.push(`above-average volume (${stock.volumeRatio.toFixed(1)}x) confirms recent price action`);
  } else if (stock.volumeRatio < 0.5) {
    parts.push('volume is notably thin, which reduces conviction in the current trend');
  }

  // Returns
  const returns: string[] = [];
  if (stock.priceReturn3m !== 0) returns.push(`${pct(stock.priceReturn3m * 100)} over 3 months`);
  if (stock.priceReturn1y !== 0) returns.push(`${pct(stock.priceReturn1y * 100)} over 1 year`);
  if (returns.length > 0) {
    parts.push(`price returns are ${returns.join(' and ')}`);
  }

  if (parts.length < 2) return null;
  return `On the technical side, ${parts[0]}. ${parts.slice(1).map((p, i) => i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p).join('. ')}.`;
}

function buildFundamentalsParagraph(stock: StockRecord): string | null {
  const parts: string[] = [];
  const c = cur(stock);

  // P/E and valuation
  if (stock.pe != null && stock.pe > 0) {
    if (stock.forwardPe != null && stock.forwardPe > 0) {
      const peDirection = stock.forwardPe < stock.pe ? 'dropping to' : 'rising to';
      parts.push(`the trailing P/E of ${stock.pe.toFixed(1)} is ${peDirection} a forward P/E of ${stock.forwardPe.toFixed(1)}, ${stock.forwardPe < stock.pe ? 'suggesting earnings growth ahead' : 'implying a potential slowdown'}`);
    } else {
      parts.push(`trading at a P/E of ${stock.pe.toFixed(1)}${stock.pe < 15 ? ', which is value territory' : stock.pe > 35 ? ', a premium valuation' : ''}`);
    }
  }

  // Earnings & revenue growth
  if (stock.earningsGrowth != null) {
    const eg = stock.earningsGrowth * 100;
    if (eg > 25) parts.push(`earnings are growing at an impressive ${eg.toFixed(0)}%`);
    else if (eg > 0) parts.push(`earnings growth is modest at ${eg.toFixed(0)}%`);
    else parts.push(`earnings are declining at ${eg.toFixed(0)}%`);
  }
  if (stock.revenueGrowth != null) {
    const rg = stock.revenueGrowth * 100;
    if (rg > 15) parts.push(`revenue growth of ${rg.toFixed(0)}% shows strong top-line expansion`);
    else if (rg < -5) parts.push(`revenue is contracting at ${rg.toFixed(0)}%, a concerning trend`);
  }

  // Profitability
  if (stock.returnOnEquity != null) {
    const roe = stock.returnOnEquity * 100;
    if (roe > 20) parts.push(`ROE of ${roe.toFixed(0)}% indicates excellent capital efficiency`);
    else if (roe > 10) parts.push(`ROE of ${roe.toFixed(0)}% is solid`);
    else if (roe < 5 && roe >= 0) parts.push(`ROE of ${roe.toFixed(0)}% is below average`);
  }

  // Debt
  if (stock.debtToEquity != null) {
    if (stock.debtToEquity > 200) parts.push(`debt/equity of ${stock.debtToEquity.toFixed(0)}% is elevated and warrants monitoring`);
    else if (stock.debtToEquity < 30) parts.push('the balance sheet is conservatively leveraged');
  }

  // Graham / DCF valuation
  const valuations: string[] = [];
  if (stock.grahamNumber != null) {
    const diff = ((stock.price / stock.grahamNumber) - 1) * 100;
    valuations.push(`Graham Number (${c}${stock.grahamNumber.toFixed(2)}) suggests the stock is ${diff > 0 ? `overvalued by ${diff.toFixed(0)}%` : `undervalued by ${Math.abs(diff).toFixed(0)}%`}`);
  }
  if (stock.dcfValue != null) {
    const diff = ((stock.price / stock.dcfValue) - 1) * 100;
    valuations.push(`DCF model (${c}${stock.dcfValue.toFixed(2)}) implies ${diff > 0 ? `${diff.toFixed(0)}% downside` : `${Math.abs(diff).toFixed(0)}% upside`} to intrinsic value`);
  }
  if (valuations.length > 0) parts.push(valuations.join(', while the '));

  // Expert scores
  const expertParts: string[] = [];
  if (stock.piotroskiScore != null) {
    expertParts.push(`Piotroski ${stock.piotroskiScore}/9${stock.piotroskiScore >= 7 ? ' (strong)' : stock.piotroskiScore <= 3 ? ' (weak)' : ''}`);
  }
  if (stock.buffettScore != null) {
    expertParts.push(`Buffett Quality ${stock.buffettScore}/5${stock.buffettScore >= 4 ? ' (high)' : stock.buffettScore <= 1 ? ' (low)' : ''}`);
  }
  if (expertParts.length > 0) parts.push(`expert screens show ${expertParts.join(' and ')}`);

  if (parts.length < 1) return null;
  return `Fundamentally, ${parts[0]}. ${parts.slice(1).map((p, i) => i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p).join('. ')}.`;
}

function buildSignalsParagraph(stock: StockRecord): string | null {
  const bullish = stock.signals.filter(s => s.direction === 'bullish');
  const bearish = stock.signals.filter(s => s.direction === 'bearish');

  if (bullish.length === 0 && bearish.length === 0) return null;

  const parts: string[] = [];

  if (bullish.length > 0 && bearish.length > 0) {
    parts.push(`The signal dashboard shows ${bullish.length} bullish and ${bearish.length} bearish active signals`);

    // Highlight key signals
    const highSeverity = [...bullish, ...bearish].filter(s => s.severity >= 3);
    if (highSeverity.length > 0) {
      const keySignals = highSeverity.slice(0, 3).map(s => s.description);
      parts.push(`key signals include: ${keySignals.join('; ')}`);
    }
  } else if (bullish.length >= 3) {
    parts.push(`${bullish.length} bullish signals are active with no bearish counterparts — a rare alignment of positive factors`);
  } else if (bearish.length >= 3) {
    parts.push(`${bearish.length} bearish signals are firing with no bullish offsets — caution is warranted`);
  } else if (bullish.length > 0) {
    parts.push(`${bullish.length} mild bullish signal${bullish.length > 1 ? 's are' : ' is'} active`);
  } else {
    parts.push(`${bearish.length} bearish signal${bearish.length > 1 ? 's are' : ' is'} present`);
  }

  // OBV
  if (stock.obvDivergence === 'bullish') {
    parts.push('on-balance volume shows bullish divergence, suggesting accumulation by large players');
  } else if (stock.obvDivergence === 'bearish') {
    parts.push('on-balance volume shows bearish divergence — distribution may be underway despite price holding');
  }

  // Minervini
  if (stock.minerviniChecks.passed >= 7) {
    parts.push(`the stock passes ${stock.minerviniChecks.passed}/8 Minervini trend template checks, qualifying as a SEPA candidate`);
  } else if (stock.minerviniChecks.passed >= 5) {
    parts.push(`${stock.minerviniChecks.passed}/8 Minervini checks pass — close to trend template qualification`);
  }

  // RS Percentile
  if (stock.rsPercentile >= 90) {
    parts.push(`relative strength is in the top 10% of all stocks (RS ${stock.rsPercentile}), a hallmark of institutional favorites`);
  } else if (stock.rsPercentile <= 20) {
    parts.push(`relative strength is in the bottom 20% (RS ${stock.rsPercentile}), indicating persistent underperformance`);
  }

  if (parts.length < 1) return null;
  return `${parts[0]}. ${parts.slice(1).map((p, i) => i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p).join('. ')}.`;
}

function buildClosing(stock: StockRecord): string {
  const composite = stock.score.composite;
  const name = stock.ticker;

  if (composite >= 70 && stock.bearishScore < 3) {
    return `Overall, ${name} presents a compelling opportunity with aligned momentum, solid fundamentals, and manageable risk. The key question is whether current valuations leave room for further upside. Consider building a position on pullbacks to support levels.`;
  }
  if (composite >= 55) {
    return `In summary, ${name} has more going for it than against it, but it's not a slam dunk. The stock merits a spot on your watchlist, with entry ideally timed to a technical pullback or positive catalyst. Monitor the weaker score components for signs of deterioration.`;
  }
  if (composite >= 40) {
    return `${name} is in a transitional phase with conflicting signals. Existing holders should define clear stop-loss levels, while new investors may want to wait for a more decisive signal — either a breakout above resistance or a flush to oversold levels that creates a better entry.`;
  }
  if (composite >= 25) {
    return `${name} is showing multiple areas of weakness that outweigh its strengths. This is not an environment to add new positions. If you're holding, consider whether the original thesis is still intact and set tight stops to protect capital.`;
  }
  return `${name} is flashing significant warning signs across multiple dimensions. The risk/reward here is unfavorable. Capital preservation should be the priority — either reduce exposure or exit entirely and look for better setups elsewhere.`;
}
