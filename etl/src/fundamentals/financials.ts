import pLimit from 'p-limit';
import { getYahooCrumb } from '../stocks/fetcher.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface AnnualFinancial {
  year: string;           // e.g. "2024"
  endDate: string;        // ISO date
  totalRevenue: number | null;
  netIncome: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalStockholderEquity: number | null;
  longTermDebt: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  operatingCashflow: number | null;
  capitalExpenditures: number | null;
  sharesOutstanding: number | null;
}

export interface FinancialData {
  ticker: string;
  annuals: AnnualFinancial[];
  ppiScore: number;           // Piotroski F-Score (0-9)
  ppiDetails: string[];       // Which criteria passed
  grahamNumber: number | null;  // sqrt(22.5 * EPS * BookValue)
  buffettScore: number;       // 0-5 custom Buffett quality score
  buffettDetails: string[];
}

async function fetchFinancialStatements(ticker: string, auth: { cookie: string; crumb: string }): Promise<AnnualFinancial[]> {
  const encoded = encodeURIComponent(ticker);
  const modules = 'incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory';
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encoded}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Cookie': auth.cookie },
    });
    if (!res.ok) return [];

    const data = await res.json() as any;
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return [];

    const incomeStmts = result.incomeStatementHistory?.incomeStatementHistory ?? [];
    const balanceStmts = result.balanceSheetHistory?.balanceSheetStatements ?? [];
    const cashflowStmts = result.cashflowStatementHistory?.cashflowStatements ?? [];

    // Merge by year
    const years = new Map<string, AnnualFinancial>();

    for (const stmt of incomeStmts) {
      const endDate = stmt.endDate?.fmt ?? '';
      const year = endDate.slice(0, 4);
      if (!year) continue;

      if (!years.has(year)) {
        years.set(year, {
          year, endDate,
          totalRevenue: null, netIncome: null, grossProfit: null,
          operatingIncome: null, totalAssets: null, totalLiabilities: null,
          totalStockholderEquity: null, longTermDebt: null,
          currentAssets: null, currentLiabilities: null,
          operatingCashflow: null, capitalExpenditures: null,
          sharesOutstanding: null,
        });
      }
      const entry = years.get(year)!;
      entry.totalRevenue = stmt.totalRevenue?.raw ?? null;
      entry.netIncome = stmt.netIncome?.raw ?? null;
      entry.grossProfit = stmt.grossProfit?.raw ?? null;
      entry.operatingIncome = stmt.operatingIncome?.raw ?? null;
    }

    for (const stmt of balanceStmts) {
      const year = (stmt.endDate?.fmt ?? '').slice(0, 4);
      if (!year || !years.has(year)) continue;
      const entry = years.get(year)!;
      entry.totalAssets = stmt.totalAssets?.raw ?? null;
      entry.totalLiabilities = stmt.totalLiab?.raw ?? null;
      entry.totalStockholderEquity = stmt.totalStockholderEquity?.raw ?? null;
      entry.longTermDebt = stmt.longTermDebt?.raw ?? null;
      entry.currentAssets = stmt.totalCurrentAssets?.raw ?? null;
      entry.currentLiabilities = stmt.totalCurrentLiabilities?.raw ?? null;
    }

    for (const stmt of cashflowStmts) {
      const year = (stmt.endDate?.fmt ?? '').slice(0, 4);
      if (!year || !years.has(year)) continue;
      const entry = years.get(year)!;
      entry.operatingCashflow = stmt.totalCashFromOperatingActivities?.raw ?? null;
      entry.capitalExpenditures = stmt.capitalExpenditures?.raw ?? null;
    }

    return [...years.values()].sort((a, b) => b.year.localeCompare(a.year));
  } catch {
    return [];
  }
}

function computePiotroski(annuals: AnnualFinancial[]): { score: number; details: string[] } {
  if (annuals.length < 2) return { score: 0, details: ['Insufficient data (need 2+ years)'] };

  const curr = annuals[0];
  const prev = annuals[1];
  const details: string[] = [];
  let score = 0;

  // 1. Positive net income
  if (curr.netIncome != null && curr.netIncome > 0) { score++; details.push('Positive net income'); }

  // 2. Positive ROA (net income / total assets)
  if (curr.netIncome != null && curr.totalAssets != null && curr.totalAssets > 0 && curr.netIncome / curr.totalAssets > 0) {
    score++; details.push('Positive ROA');
  }

  // 3. Positive operating cash flow
  if (curr.operatingCashflow != null && curr.operatingCashflow > 0) { score++; details.push('Positive operating cash flow'); }

  // 4. Cash flow from operations > net income (quality of earnings)
  if (curr.operatingCashflow != null && curr.netIncome != null && curr.operatingCashflow > curr.netIncome) {
    score++; details.push('Cash flow > net income (quality earnings)');
  }

  // 5. Lower long-term debt ratio YoY
  const currDebtRatio = (curr.longTermDebt ?? 0) / (curr.totalAssets ?? 1);
  const prevDebtRatio = (prev.longTermDebt ?? 0) / (prev.totalAssets ?? 1);
  if (currDebtRatio < prevDebtRatio) { score++; details.push('Declining debt ratio'); }

  // 6. Higher current ratio YoY
  const currCR = (curr.currentAssets ?? 0) / (curr.currentLiabilities ?? 1);
  const prevCR = (prev.currentAssets ?? 0) / (prev.currentLiabilities ?? 1);
  if (currCR > prevCR) { score++; details.push('Improving current ratio'); }

  // 7. No new shares issued (shares outstanding didn't increase)
  if (curr.sharesOutstanding != null && prev.sharesOutstanding != null && curr.sharesOutstanding <= prev.sharesOutstanding) {
    score++; details.push('No dilution (shares not increased)');
  }

  // 8. Higher gross margin YoY
  const currGM = curr.grossProfit != null && curr.totalRevenue != null && curr.totalRevenue > 0
    ? curr.grossProfit / curr.totalRevenue : null;
  const prevGM = prev.grossProfit != null && prev.totalRevenue != null && prev.totalRevenue > 0
    ? prev.grossProfit / prev.totalRevenue : null;
  if (currGM != null && prevGM != null && currGM > prevGM) { score++; details.push('Improving gross margin'); }

  // 9. Higher asset turnover YoY
  const currAT = curr.totalRevenue != null && curr.totalAssets != null && curr.totalAssets > 0
    ? curr.totalRevenue / curr.totalAssets : null;
  const prevAT = prev.totalRevenue != null && prev.totalAssets != null && prev.totalAssets > 0
    ? prev.totalRevenue / prev.totalAssets : null;
  if (currAT != null && prevAT != null && currAT > prevAT) { score++; details.push('Improving asset turnover'); }

  return { score, details };
}

function computeGrahamNumber(eps: number | null, bookValue: number | null): number | null {
  if (eps == null || bookValue == null || eps <= 0 || bookValue <= 0) return null;
  return +Math.sqrt(22.5 * eps * bookValue).toFixed(2);
}

function computeBuffettScore(annuals: AnnualFinancial[]): { score: number; details: string[] } {
  if (annuals.length < 2) return { score: 0, details: ['Insufficient data'] };

  const curr = annuals[0];
  const details: string[] = [];
  let score = 0;

  // 1. Consistent profitability (net income positive for all available years)
  const allProfitable = annuals.every(a => a.netIncome != null && a.netIncome > 0);
  if (allProfitable) { score++; details.push('Consistently profitable'); }

  // 2. High ROE (>15%)
  if (curr.netIncome != null && curr.totalStockholderEquity != null && curr.totalStockholderEquity > 0) {
    const roe = curr.netIncome / curr.totalStockholderEquity;
    if (roe > 0.15) { score++; details.push(`High ROE (${(roe * 100).toFixed(1)}%)`); }
  }

  // 3. Low debt (debt/equity < 0.5)
  if (curr.longTermDebt != null && curr.totalStockholderEquity != null && curr.totalStockholderEquity > 0) {
    const de = curr.longTermDebt / curr.totalStockholderEquity;
    if (de < 0.5) { score++; details.push('Low debt-to-equity'); }
  }

  // 4. Growing revenue
  if (annuals.length >= 2 && curr.totalRevenue != null && annuals[1].totalRevenue != null && annuals[1].totalRevenue > 0) {
    const growth = (curr.totalRevenue - annuals[1].totalRevenue) / annuals[1].totalRevenue;
    if (growth > 0) { score++; details.push('Revenue growing'); }
  }

  // 5. Positive free cash flow
  if (curr.operatingCashflow != null && curr.capitalExpenditures != null) {
    const fcf = curr.operatingCashflow + curr.capitalExpenditures; // capex is negative
    if (fcf > 0) { score++; details.push('Positive free cash flow'); }
  }

  return { score, details };
}

export async function fetchFinancials(tickers: string[]): Promise<Map<string, FinancialData>> {
  const result = new Map<string, FinancialData>();
  const auth = await getYahooCrumb();
  if (!auth) {
    console.warn('  Financial statements: Failed to get Yahoo auth');
    return result;
  }

  const limit = pLimit(5);
  console.log(`  Fetching financial statements for ${tickers.length} stocks...`);

  await Promise.all(
    tickers.map((ticker, idx) =>
      limit(async () => {
        const annuals = await fetchFinancialStatements(ticker, auth);
        if (annuals.length === 0) return;

        const ppi = computePiotroski(annuals);
        const buffett = computeBuffettScore(annuals);

        // For Graham number, we need EPS and book value -- get from the latest annual
        const latestEquity = annuals[0]?.totalStockholderEquity;
        const latestShares = annuals[0]?.sharesOutstanding;
        const latestNetIncome = annuals[0]?.netIncome;
        const eps = latestNetIncome != null && latestShares != null && latestShares > 0
          ? latestNetIncome / latestShares : null;
        const bookValue = latestEquity != null && latestShares != null && latestShares > 0
          ? latestEquity / latestShares : null;

        result.set(ticker, {
          ticker,
          annuals,
          ppiScore: ppi.score,
          ppiDetails: ppi.details,
          grahamNumber: computeGrahamNumber(eps, bookValue),
          buffettScore: buffett.score,
          buffettDetails: buffett.details,
        });

        if ((idx + 1) % 25 === 0) console.log(`    Financials: ${idx + 1}/${tickers.length}`);
        await delay(200);
      })
    )
  );

  console.log(`  Financial statements: ${result.size}/${tickers.length} fetched`);
  return result;
}
