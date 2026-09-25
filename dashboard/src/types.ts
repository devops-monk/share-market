// Online Picks
export interface OnlinePick {
  id: string;
  ticker: string;
  name: string | null;
  market: string;
  source: string;
  sourceUrl: string;
  sourceType: 'analyst' | 'broker' | 'community' | 'screener' | 'news';
  date: string;
  callType: string;
  analyst: string | null;
  priceTarget: number | null;
  upside: number | null;
  headline: string;
  fetchedAt: string;
}

export interface OnlinePicksData {
  updatedAt: string;
  picks: OnlinePick[];
}

// Big Investors — 13F superinvestor holdings + congressional trades
export type HoldingChange = 'new' | 'add' | 'trim' | 'hold' | 'exit';

export interface InvestorHolding {
  cusip: string;
  ticker: string | null;
  issuer: string;
  value: number;
  shares: number;
  pctOfPortfolio: number;
  changeType: HoldingChange;
  sharesChange: number;
  sharesChangePct: number | null;
  inUniverse: boolean;
}

export interface Superinvestor {
  id: string;
  manager: string;
  firm: string;
  cik: string;
  style: string;
  quarter: string;
  periodOfReport: string;
  filedAt: string;
  filingUrl: string;
  portfolioValue: number;
  holdingsCount: number;
  topHoldings: InvestorHolding[];
  newBuys: InvestorHolding[];
  addedTo: InvestorHolding[];
  trimmed: InvestorHolding[];
  soldOut: InvestorHolding[];
  stale: boolean;
}

export interface PoliticianTrade {
  ticker: string;
  assetName: string;
  transaction: string;
  tradedDate: string;
  filedDate: string;
  amountRange: string;
  amountEstimate: number | null;
  assetType: string;
  sector: string | null;
  description: string;
  inUniverse: boolean;
}

export interface Politician {
  id: string;
  name: string;
  chamber: string;
  party: string;
  image: string | null;
  profileUrl: string;
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  volumeEstimate: number;
  lastTraded: string | null;
  trades: PoliticianTrade[];
}

// Executive branch — cabinet and White House periodic transaction reports
export interface ExecutiveTransaction {
  assetName: string;
  transaction: string;
  tradedDate: string;
  filedDate: string;
  amountRange: string;
  amountEstimate: number | null;
  /** False when the figure was read from a scanned filing and may be misread. */
  confident: boolean;
  sourceUrl: string;
}

export interface ExecutiveOfficial {
  id: string;
  name: string;
  role: string;
  profileUrl: string;
  transactionCount: number;
  lastFiled: string | null;
  transactions: ExecutiveTransaction[];
}

/** How much ground the upstream source covers, so the page can say it plainly. */
export interface Filing45Coverage {
  trades: number;
  members: number;
  funds: number;
  fundHoldings: number;
  executiveTransactions: number;
  medianDisclosureDays: number | null;
  latestFiling: string | null;
}

export interface BigInvestorsData {
  updatedAt: string;
  superinvestors: Superinvestor[];
  politicians: Politician[];
  executive?: ExecutiveOfficial[];
  coverage?: Filing45Coverage | null;
  source?: 'filing45' | 'scraped';
}

// N23: Paper Trading
export interface PaperTrade {
  id: string;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  date: string;
  notes?: string;
  // N26: Trade Journal fields (optional for backward compat)
  entryReasoning?: string;
  exitReasoning?: string;
  strategy?: string;
  emotionalState?: string;
}

// N26: Trade Review
export interface TradeReview {
  tradeId: string;
  ticker: string;
  lessonsLearned: string;
  rating: 1 | 2 | 3 | 4 | 5;
  wouldRepeat: boolean;
  reviewDate: string;
}

export interface PaperPortfolio {
  startingCapital: number;
  cash: number;
  trades: PaperTrade[];
  createdAt: string;
}

// N12: Predictive Scoring
export interface PredictiveScore {
  predicted: number;
  direction: 'improving' | 'stable' | 'declining';
  confidence: 'low' | 'medium' | 'high';
  slope: number;
  r2: number;
  factors: {
    trendMomentum: number;
    meanReversion: number;
    technicalSupport: number;
  };
}

export interface StockRecord {
  ticker: string;
  name: string;
  market: 'US' | 'UK' | 'IN' | 'DE' | 'FR' | 'JP' | 'HK';
  sector: string;
  trading212: boolean;
  currency: string;
  price: number;
  changePercent: number;
  marketCap: number;
  capCategory: 'Small' | 'Mid' | 'Large';
  pe: number | null;
  forwardPe: number | null;
  earningsGrowth: number | null;
  revenueGrowth: number | null;
  beta: number | null;
  volume: number;
  avgVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  rsi: number | null;
  macdHistogram: number | null;
  sma50: number | null;
  sma150: number | null;
  sma200: number | null;
  sma20: number | null;
  sma200Slope: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
  bollingerBandwidth: number | null;
  bollingerPercentB: number | null;
  bollingerSqueeze: boolean;
  stochasticK: number | null;
  stochasticD: number | null;
  obvTrend: string | null;
  obvDivergence: string | null;
  volumeRatio: number;
  priceReturn3m: number;
  priceReturn6m: number;
  priceReturn1y: number;
  priceReturn2y: number;
  priceReturn3y: number;
  priceReturn4y: number;
  yearlyReturns: number[];       // per-year returns [year1, year2, year3, year4] most recent first
  yearlyUptrendYears: number;    // total positive-return years (0-4)
  weightedAlpha: number | null;       // exponentially-weighted 1-year return %
  pctBelowResistance: number | null;  // how far below nearest resistance (%)
  volatility: number;
  signals: Signal[];
  timeframeSentiment?: TimeframeSentiment;
  bearishScore: number;
  bullishScore: number;
  sentimentAvg: number;
  score: ScoreBreakdown;
  // Expanded fundamentals
  priceToBook: number | null;
  pegRatio: number | null;
  enterpriseValue: number | null;
  profitMargins: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  dividendYield: number | null;
  trailingEps: number | null;
  forwardEps: number | null;
  bookValue: number | null;
  sharesOutstanding: number | null;
  heldPercentInsiders: number | null;
  heldPercentInstitutions: number | null;
  institutionsCount: number | null;
  shortPercentOfFloat: number | null;
  targetMeanPrice: number | null;
  freeCashflow: number | null;
  totalRevenue: number | null;
  totalDebt: number | null;
  ebitda: number | null;
  totalCash: number | null;
  operatingCashflow: number | null;
  averageAnalystRating: string | null;
  // Computed metrics
  rsPercentile: number;
  fiftyTwoWeekRangePercent: number;
  weeklyHighLowRange: number | null;
  accDistRating: string;
  styleClassification: string;
  dataCompleteness: number;
  minerviniChecks: {
    priceAbove150and200: boolean;
    sma150Above200: boolean;
    sma200Trending: boolean;
    sma50Above150and200: boolean;
    priceAbove50: boolean;
    price30PctAboveLow: boolean;
    priceWithin25PctOfHigh: boolean;
    rsAbove70: boolean;
    passed: number;
  };
  // Sector-relative scoring
  sectorZScore: number | null;  // z-score within sector
  sectorRank: number;           // rank within sector (1=best)
  sectorCount: number;          // total in sector
  // Support & resistance levels
  supportResistance?: { price: number; strength: number; type: 'support' | 'resistance' }[];
  // Expert screens (Piotroski, Graham, Buffett)
  piotroskiScore: number | null;
  piotroskiDetails: string[];
  grahamNumber: number | null;
  buffettScore: number | null;
  buffettDetails: string[];
  // N6: Additional Technical Indicators
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
  williamsR: number | null;
  chaikinMoneyFlow: number | null;
  // N4: Risk-Adjusted Returns
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number | null;
  // N3: Altman Z-Score
  altmanZScore: number | null;
  altmanZone: 'safe' | 'grey' | 'distress' | null;
  // N2: Factor Grades
  factorGrades: {
    value: string;
    growth: string;
    profitability: string;
    momentum: string;
    safety: string;
    overall: string;
  } | null;
  // N8: SMR Rating
  smrRating: string | null;
  // N7: Earnings Drift
  earningsDrift: {
    lastEarningsDate: string;
    return1d: number | null;
    return5d: number | null;
    return20d: number | null;
  } | null;
  // Earnings & valuation
  earningsDate: string | null;
  dcfValue: number | null;
  dividendMetrics?: DividendMetrics | null;
  // Dividend schedule & sustainability (optional until the ETL has run again)
  payoutRatio?: number | null;
  exDividendDate?: string | null;
  dividendPayDate?: string | null;
  fiveYearAvgDividendYield?: number | null;
  trailingAnnualDividendRate?: number | null;
  // N17: Beneish M-Score
  beneishMScore: number | null;
  beneishZone: 'unlikely' | 'possible' | 'likely' | null;
  // N14: Ichimoku Cloud
  ichimoku: {
    tenkan: number;
    kijun: number;
    senkouA: number;
    senkouB: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  } | null;
  // N10: Candlestick Patterns
  candlestickPatterns?: { name: string; direction: 'bullish' | 'bearish' | 'neutral'; }[];
  // N9: Chart Patterns
  chartPatterns?: { name: string; direction: 'bullish' | 'bearish' | 'neutral'; confidence: number; }[];
  // N13: Theme/Sector Tags
  themes?: string[];
  // N12: Predictive Score
  predictiveScore?: PredictiveScore | null;
  // N16: Volume Profile
  volumeProfile?: {
    bins: { price: number; volume: number }[];
    vpoc: number;
    valueAreaHigh: number;
    valueAreaLow: number;
  } | null;
  // N25: ESG Scores
  esgScore: number | null;
  esgEnvironment: number | null;
  esgSocial: number | null;
  esgGovernance: number | null;
  esgPercentile: number | null;
}

// N19: Macro Overlay
export interface MacroData {
  vix: number | null;
  treasury10y: number | null;
  treasury2y: number | null;
  yieldSpread: number | null;
  dxy: number | null;
  fedFundsRate: number | null;
  lastUpdated: string;
}

// N18: Social Sentiment (ApeWisdom — aggregated Reddit mentions)
export interface SocialSentiment {
  mentions: number;
  upvotes: number;
  rank: number | null;
  mentionChange: number | null;
  topPosts: { title: string; score: number; url: string }[];
  avgSentiment: number;
}

export type SocialSentimentMap = Record<string, SocialSentiment>;

export interface InsiderTrade {
  ticker: string;
  filingDate: string;
  insiderName: string;
  insiderTitle: string;
  transactionType: string;
  transactionDate: string;
  shares: number;
  pricePerShare: number | null;
  totalValue: number | null;
}

export interface InsiderSummary {
  trades: InsiderTrade[];
  netShares90d: number;
  buyCount90d: number;
  sellCount90d: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export type InsiderTradesMap = Record<string, InsiderSummary>;

export interface DividendPayment {
  date: string;   // ex-dividend date, YYYY-MM-DD
  amount: number;
}

export interface DividendMetrics {
  annualDividends: { year: number; totalDPS: number; payments?: number }[];
  currentAnnualDPS: number | null;
  fiveYearCAGR: number | null;
  growthStreak: number;
  payoutConsistency: number;
  // Payment schedule — added by a later ETL version, so optional
  ttmDPS?: number | null;
  paymentsPerYear?: number;
  frequency?: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'irregular' | 'unknown';
  recentPayments?: DividendPayment[];
  lastExDate?: string | null;
  nextExDateEstimate?: string | null;
}

export interface Signal {
  type: string;
  direction: 'bullish' | 'bearish';
  severity: number;
  description: string;
  timeframe?: 'short' | 'medium' | 'long';
}

export interface TimeframeSentiment {
  short: { opinion: 'Buy' | 'Hold' | 'Sell'; signalCount: number };
  medium: { opinion: 'Buy' | 'Hold' | 'Sell'; signalCount: number };
  long: { opinion: 'Buy' | 'Hold' | 'Sell'; signalCount: number };
}

export interface ScoreBreakdown {
  priceMomentum: number;
  technicalSignals: number;
  newsSentiment: number;
  fundamentals: number;
  volumeTrend: number;
  riskInverse: number;
  composite: number;
}

export interface SummaryData {
  topOverall: SummaryStock[];
  bottomOverall: SummaryStock[];
  topLargeCap: SummaryStock[];
  topMidCap: SummaryStock[];
  topSmallCap: SummaryStock[];
  totalStocks: number;
  avgScore: number;
  bearishAlertCount: number;
}

export interface SummaryStock {
  ticker: string;
  name: string;
  score: number;
  market: string;
  capCategory?: string;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  ticker: string;
  sentimentScore: number;
  sentimentLabel: 'positive' | 'negative' | 'neutral';
  finbertScore?: number | null;
}

export interface RegimeData {
  index: string;
  price: number;
  sma50: number;
  sma200: number;
  changeFromHigh: number;
  distributionDays: number;
  regime: 'bull' | 'correction' | 'bear';
  signal: string;
}

export interface MarketRegime {
  us: RegimeData;
  uk: RegimeData;
  in: RegimeData;
  eu: RegimeData;
  asia: RegimeData;
  overall: 'bull' | 'correction' | 'bear';
  summary: string;
}

export interface Metadata {
  lastUpdated: string;
  stockCount: number;
  bearishAlerts: number;
  newsCount: number;
  marketRegime: MarketRegime | null;
}
