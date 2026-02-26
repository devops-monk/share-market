/**
 * Central tooltip definitions for all metrics across the dashboard.
 * Import and use with InfoTooltip or HelpLabel components.
 */
export const TIPS: Record<string, string> = {
  // Scores
  'Composite Score': 'Overall stock rating (0-100) combining 6 factors: Momentum, Technical, Sentiment, Fundamentals, Volume, and Risk.',
  'Score': 'Overall stock rating (0-100) combining 6 factors: Momentum, Technical, Sentiment, Fundamentals, Volume, and Risk.',
  'Avg Score': 'Average composite score across all tracked stocks. Above 50 = market is generally healthy.',

  // Price & Change
  'Price': 'Current market price per share in the stock\'s local currency ($ for US, £ for UK).',
  'Change': 'Price change today as a percentage. Green = up, Red = down.',
  'Change %': 'Price change today as a percentage. Green = up, Red = down.',
  'Avg Change': 'Average daily change across all stocks. Positive = overall market is up today.',

  // Classification
  'Market': 'US = NYSE/NASDAQ (prices in $). UK = London Stock Exchange (prices in £/pence).',
  'Cap': 'Market capitalisation category. Large (>$10B) = safer. Mid ($2-10B) = balanced. Small (<$2B) = higher risk/reward.',
  'Style': 'Investment style. Value = low P/E, slow growth. Growth = high earnings growth, higher P/E. Blend = mix of both.',

  // Technical Indicators
  'RSI': 'Relative Strength Index (0-100). >70 = overbought (may drop). <30 = oversold (may bounce). 30-70 = normal range.',
  'RS': 'Relative Strength Percentile (1-99). Ranks price performance vs all stocks. >80 = top performer. Used by CAN SLIM & Minervini.',
  'RS %ile': 'Relative Strength Percentile (1-99). Ranks price performance vs all stocks. >80 = top performer.',
  'RS Percentile': 'Relative Strength Percentile (1-99). Ranks price performance vs all stocks. >80 = top performer.',
  'SMA 50': '50-day Simple Moving Average. Price above = short-term uptrend.',
  'SMA 150': '150-day SMA. Key level in Minervini\'s trend template.',
  'SMA 200': '200-day SMA. Price above = long-term uptrend. Below = downtrend.',
  'Vol Ratio': 'Today\'s volume divided by 20-day average. >1.5x = unusual activity. >2x = major event.',
  'Volume Ratio': 'Today\'s volume divided by 20-day average. >1.5x = unusual activity. >2x = major event.',

  // Sentiment
  'Sentiment': 'Average news sentiment score (-1 to +1). Positive = good press. Negative = bad press. 0 = neutral.',

  // Fundamentals
  'P/E': 'Price-to-Earnings ratio. Lower = cheaper relative to profits. <15 = value. >30 = growth/expensive.',
  'Forward P/E': 'P/E based on estimated future earnings. Lower than P/E = analysts expect growth.',
  'PEG': 'P/E divided by growth rate. <1 = undervalued. <0.5 = strong value. >2 = expensive for its growth.',
  'P/B': 'Price-to-Book ratio. <1.5 preferred by Graham. <1 = potential deep value.',
  'ROE': 'Return on Equity. >15% = good (Buffett). Measures how efficiently the company uses shareholder capital.',
  'ROA': 'Return on Assets. Measures profit efficiency relative to total assets. Higher = better.',
  'Gross Margin': 'Revenue minus cost of goods, as %. >40% = durable competitive advantage (Buffett).',
  'Op. Margin': 'Operating profit as % of revenue. Higher = more efficient operations.',
  'Profit Margin': 'Net profit as % of revenue. >20% = highly profitable.',
  'D/E': 'Debt-to-Equity ratio. <50% = healthy. >200% = highly leveraged / risky.',
  'Debt/Equity': 'Debt-to-Equity ratio. <50% = healthy. >200% = highly leveraged / risky.',
  'Current Ratio': 'Current assets / current liabilities. >2 = strong. >1 = can pay short-term debts. <1 = liquidity risk.',
  'Div. Yield': 'Annual dividend as % of share price. Higher = more income.',
  'Beta': 'Volatility vs market. 1.0 = same as market. >1.5 = very volatile. <0.5 = defensive.',
  'Volatility': 'Historical price volatility. Higher = more unpredictable price swings.',

  // Expert Scores
  'Piotroski': 'Piotroski F-Score (0-9). Financial health check using 9 fundamental criteria. 7-9 = strong. <4 = weak.',
  'Graham #': 'Graham Number = sqrt(22.5 x EPS x Book Value). If price < Graham Number, stock may be undervalued.',
  'Buffett': 'Buffett Quality Score (0-5). Measures consistent profitability, high ROE, low debt, revenue growth, and positive free cash flow.',

  // Signals
  'Bearish Score': 'Count of active warning signals. 0-2 = safe. 3-4 = caution. 5+ = danger zone.',
  'Bullish Score': 'Count of active positive signals. Higher = more bullish indicators aligned.',
  'Bearish': 'Count of active warning signals. 0-2 = safe. 3-4 = caution. 5+ = danger zone.',

  // Data
  'Data %': 'Percentage of fundamental data fields available (0-100%). Higher = more reliable analysis.',
  'Data Quality': 'Percentage of fundamental data fields available. Higher = more reliable analysis.',

  // Sector
  'Sector Z-Score': 'How many standard deviations from the sector average. +1 = well above peers. -1 = below peers.',
  'Sector Rank': 'Stock\'s rank within its sector by composite score. 1 = best in sector.',

  // Minervini
  'Minervini Checks': 'How many of Minervini\'s 8 trend template criteria are met. 8/8 = perfect Stage 2 uptrend.',

  // Market Regime
  'Distribution Days': 'Days in the last 25 sessions with >0.2% drop on above-average volume. 6+ = selling pressure building.',
  'From 52W High': 'How far the index is from its 52-week high. >-10% = correction territory. >-20% = bear market.',

  // Overview specific
  'Total Stocks': 'Number of stocks tracked across US and UK markets.',
  'Bearish Alerts': 'Stocks with bearish score >= 4 (multiple warning signals active).',

  // Support/Resistance
  'Support': 'Price level where the stock has historically bounced up. More touches = stronger support.',
  'Resistance': 'Price level where the stock has historically stalled. More touches = stronger resistance.',

  // Comparison-specific labels
  'PEG Ratio': 'P/E divided by growth rate. <1 = undervalued. <0.5 = strong value. >2 = expensive for its growth.',
  'Operating Margin': 'Operating profit as % of revenue. Higher = more efficient operations.',
  'Dividend Yield': 'Annual dividend as % of share price. Higher = more income.',
  'SMA 50 vs Price': 'Price distance from 50-day moving average. Positive = above SMA 50 (bullish).',
  'SMA 200 vs Price': 'Price distance from 200-day moving average. Positive = above SMA 200 (long-term bullish).',
  'Data Completeness': 'Percentage of fundamental data fields available. Higher = more reliable analysis.',
  'Bullish': 'Count of active positive signals. Higher = more bullish indicators aligned.',
  'Wtd Alpha': 'Exponentially-weighted 1-year return (%). Recent price action weighted more heavily. Positive = trending up.',
};
