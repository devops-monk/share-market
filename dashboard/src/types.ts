export interface StockRecord {
  ticker: string;
  name: string;
  market: 'US' | 'UK';
  sector: string;
  trading212: boolean;
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
  sma200: number | null;
  sma20: number | null;
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
  volatility: number;
  signals: Signal[];
  bearishScore: number;
  bullishScore: number;
  sentimentAvg: number;
  score: ScoreBreakdown;
}

export interface Signal {
  type: string;
  direction: 'bullish' | 'bearish';
  severity: number;
  description: string;
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
}

export interface Metadata {
  lastUpdated: string;
  stockCount: number;
  bearishAlerts: number;
  newsCount: number;
}
