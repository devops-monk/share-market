# Research & Feature Roadmap — StockMarket Dashboard

> **Date**: 2026-02-22 | **Live**: [share.devops-monk.com](https://share.devops-monk.com)

---

## Table of Contents

1. [What We Have Today](#1-what-we-have-today)
2. [Competitive Analysis](#2-competitive-analysis)
3. [Expert Techniques Gap Analysis](#3-expert-techniques-gap-analysis)
4. [Current Weaknesses & Improvements](#4-current-weaknesses--improvements)
5. [Prioritised Feature Roadmap](#5-prioritised-feature-roadmap)

---

## 1. What We Have Today

### Pages
| Page | Purpose |
|------|---------|
| Overview | Market snapshot — top/bottom performers, avg score, bearish count |
| Screener | Sortable/filterable table (TanStack React Table) of all 689 stocks |
| Bearish Alerts | Stocks with bearish score >= 4 |
| Buy the Dip | Value reversals (RSI < 35, OBV bullish divergence) |
| Breakout Detection | Bollinger squeeze + volume spike candidates |
| News & Sentiment | Google News + FinViz headlines with AFINN sentiment |
| Stock Detail | Per-stock deep dive — gauge, score breakdown, signals, news |
| Guide | Educational content (4 tabs) |

### Composite Score (0–100)
| Factor | Weight | Inputs |
|--------|--------|--------|
| Momentum | 25% | 3-month + 6-month price returns |
| Technical Signals | 25% | Net bullish − bearish signal count |
| Sentiment | 15% | Average AFINN headline score |
| Fundamentals | 15% | Inverted P/E + earnings growth |
| Volume Trend | 10% | Current volume / 20-day average |
| Risk (inverse) | 10% | 1 − (Beta × 0.5 + Volatility × 0.5) |

### Technical Indicators
RSI (14), MACD (12/26/9), SMA 20/50/200, Bollinger Bands (20, 2σ), Stochastic (14), OBV, Volatility (30-day annualised), Volume Ratio.

### Signal Types (24 total)
MA crosses (death/golden cross, MA alignment), RSI overbought/oversold, MACD bullish/bearish, Bollinger squeeze/upper+RSI/lower+RSI, Stochastic bullish/bearish/combo, OBV divergence (bull/bear)/uptrend confirm, volume spike decline/accumulation day, strong/weak momentum, near 52W high/low.

### Fundamental Metrics
P/E, Forward P/E, Earnings Growth (EPS Q/Q), Revenue Growth (Sales Q/Q), Beta, Market Cap, Avg Volume.

### Data Sources
Yahoo Finance v8 (OHLCV, 6-month daily), Yahoo Finance v7 (fundamentals — batch), FinViz scraper (EPS Q/Q, Sales Q/Q for US stocks), Google News RSS + FinViz News (sentiment via AFINN). ETL runs hourly via GitHub Actions (weekdays 7am–9pm UTC).

---

## 2. Competitive Analysis

### 2.1 TradingView

**Key Features**: 400+ built-in indicators, Pine Script custom indicator language, 21 chart types (Renko, Kagi, Point & Figure, Heikin Ashi), multi-chart layouts (up to 16 synced), social community (trade ideas, scripts, live streams), server-side alerts on any condition, broker integration for live trading, replay mode for backtesting, stock screener + sector heat maps, fundamental data overlay on price charts.

| Gap | Severity |
|-----|----------|
| No interactive charting (we show static price levels only) | **Critical** |
| No custom indicator builder / formula engine | High |
| No chart pattern recognition (cup-with-handle, H&S, etc.) | High |
| No heat map visualisation (sector/market-cap treemap) | Medium |
| No alert system (price, indicator, or score-based) | Medium |
| No multiple chart types (candlestick, Heikin Ashi) | Medium |
| No replay / backtest mode | Low |
| No social features / idea sharing | Low |

---

### 2.2 Finviz

**Key Features**: S&P 500 treemap heat map (by sector, cap, performance), market themes heatmap (AI, clean energy), insider trading map, 52W highs/lows map, 60+ screener filters, snapshot ticker pages, backtesting (Elite), futures heat map.

| Gap | Severity |
|-----|----------|
| No market heat map / treemap visualisation | **High** |
| No insider trading data | High |
| No short interest / short float data | Medium |
| No analyst recommendations aggregate | Medium |
| No sector/industry drill-down navigation | Medium |
| No screener export / share URL | Low |

---

### 2.3 Stock Rover

**Key Features**: 700+ screening criteria with 10 years historical data, weighted ranked screener (user-defined weights), custom freeform equation filters, built-in Piotroski F-Score / Altman Z-Score / Beneish M-Score, 150+ pre-built screeners (Buffett, Graham, etc.), 10-year backtesting, portfolio analytics (correlation, diversification), fair value / DCF estimates, auto-generated research reports.

| Gap | Severity |
|-----|----------|
| No historical fundamental data (current quarter only) | **Critical** |
| No Piotroski F-Score, Altman Z-Score, Beneish M-Score | High |
| No DCF / intrinsic value calculation | High |
| No weighted multi-factor screener (user-defined weights) | High |
| No portfolio tracking and analytics | Medium |
| No backtest capability for scoring model | Medium |
| No pre-built strategy screeners (Buffett, Graham templates) | Medium |

---

### 2.4 Seeking Alpha

**Key Features**: Quant Ratings (1.0–5.0: Strong Buy → Strong Sell) based on 100+ metrics per stock, Factor Grades (A+ to F) across Value/Growth/Profitability/Momentum/EPS Revisions, three rating systems side-by-side, EPS revision tracking, dividend grades, earnings call transcripts, stock comparison tool.

| Gap | Severity |
|-----|----------|
| No factor-grade system (letter grades per dimension) | **High** |
| No EPS revision tracking (estimate changes over time) | High |
| No peer/sector-relative scoring (our scores are absolute) | High |
| No dividend analysis (yield, growth, payout ratio, safety) | Medium |
| No stock comparison view (side-by-side) | Medium |
| No profitability metrics (ROE, ROA, ROIC, margins) | Medium |

---

### 2.5 Simply Wall St

**Key Features**: Snowflake model (5-axis visual: Value, Future Growth, Past Performance, Health, Dividends), 30 binary checks (6 per axis), infographic-based reports, DCF-based intrinsic value with visual discount display, portfolio Snowflake, ownership breakdown, global 100K+ stock coverage, peer comparison with Snowflake overlays.

| Gap | Severity |
|-----|----------|
| No multi-axis visual scoring model (radar/snowflake chart) | **High** |
| No DCF / fair value estimate with visual discount display | High |
| No ownership breakdown data | Medium |
| No infographic-style stock reports | Medium |
| No portfolio-level aggregated scoring | Medium |

---

### 2.6 Morningstar

**Key Features**: Economic Moat rating (Wide/Narrow/None) based on 5 competitive advantage sources, analyst-driven Fair Value (3-stage DCF), Star Rating (1–5: price vs. fair value with uncertainty adjustment), Uncertainty Rating, Style Box (3×3 Value/Blend/Growth × Large/Mid/Small), Stewardship & Capital Allocation ratings, fund/ETF medalist system.

| Gap | Severity |
|-----|----------|
| No fair value / intrinsic value estimate | **High** |
| No qualitative moat assessment (heuristic proxy needed) | Medium |
| No style box classification (Value/Blend/Growth) | Medium |
| No uncertainty/confidence rating for our scores | Medium |
| No management quality indicators | Low |

---

### 2.7 Zacks

**Key Features**: Zacks Rank (1–5) based purely on earnings estimate revision trends, Style Scores (A–F) across Value/Growth/Momentum/VGM composite, Earnings ESP (Expected Surprise Prediction), Industry Rank (265 industries), Rank + Style Combo strategy.

| Gap | Severity |
|-----|----------|
| No earnings estimate revision tracking | **High** |
| No industry/sector ranking system | High |
| No earnings surprise prediction | Medium |
| No style scores (letter grade system) | Medium |

---

### 2.8 IBD (Investor's Business Daily)

**Key Features**: Composite Rating (1–99: EPS + RS + Industry + SMR + Acc/Dist), EPS Rating (1–99: 3-year earnings growth + stability), Relative Strength Rating (1–99: 12-month price performance vs. all stocks), Accumulation/Distribution Rating (A–E: institutional buying/selling 13 weeks), SMR Rating (A–E: Sales/Margins/ROE), Industry Group Ranking (197 groups), MarketSmith chart pattern recognition, Market Pulse market direction assessment.

| Gap | Severity |
|-----|----------|
| No relative strength ranking (vs. all stocks, percentile) | **High** |
| No market direction / regime indicator | **High** |
| No accumulation/distribution rating (inst. buying/selling) | High |
| No chart pattern recognition (cup-with-handle, bases) | High |
| No industry group strength ranking | Medium |
| No SMR composite (Sales, Margins, ROE) | Medium |

---

### 2.9 Barchart

**Key Features**: Barchart Opinion (13 indicators across 3 timeframes → aggregate signal), Weighted Alpha (recent-biased 1-year momentum), options analytics suite (IV Rank, Greeks, unusual activity), Van Meerten proprietary indicators, futures & commodities depth, Barchart for Excel.

| Gap | Severity |
|-----|----------|
| No multi-timeframe signal aggregation (short/medium/long) | **High** |
| No weighted alpha (decay-weighted momentum) | Medium |
| No options data integration | Low (different audience) |

---

### 2.10 Yahoo Finance Premium

**Key Features**: Peter Lynch PEG-based fair value estimate, Morningstar research reports & star ratings, Argus Research reports, portfolio tracking with risk metrics, company outlook (bull/bear case), enhanced charting.

| Gap | Severity |
|-----|----------|
| No PEG-based fair value calculation | **High** |
| No bull/bear case narrative generation | Medium |
| No portfolio tracking | Medium |

---

## 3. Expert Techniques Gap Analysis

### 3.1 CAN SLIM (William O'Neil)

| Criterion | Rule | Can We Compute? | Gap |
|-----------|------|----------------|-----|
| **C** — Current Quarterly EPS | >= 25% YoY | **Partial** — have EPS Q/Q from FinViz | Need YoY quarterly comparison, not just sequential |
| **A** — Annual Earnings Growth | >= 25% for 3–5 years | **No** | Need multi-year annual EPS history |
| **N** — New High | Near 52W high + catalyst | **Yes** — near 52W high signal exists | Add new product/IPO flags (qualitative) |
| **S** — Supply & Demand | Low float, volume on up days | **Partial** — volume ratio exists | Need shares outstanding, float, up-volume vs down-volume |
| **L** — Leader (Relative Strength) | RS >= 80 percentile | **No** | Need percentile ranking of 12-month price perf across all stocks |
| **I** — Institutional Sponsorship | 3–10 quality institutions, increasing | **No** | Need institutional ownership data |
| **M** — Market Direction | Confirmed uptrend | **No** | Need market regime detection (index trend, distribution days) |

**Data Requirements**: Multi-year EPS history, float/shares outstanding, institutional ownership, market-wide breadth indicators.

---

### 3.2 Piotroski F-Score (0–9)

| # | Criterion | Can We Compute? | Gap |
|---|-----------|----------------|-----|
| 1 | Net Income > 0 (ROA positive) | **No** | Need net income and total assets |
| 2 | Operating Cash Flow > 0 | **No** | Need cash flow from operations |
| 3 | ROA improving YoY | **No** | Need prior year ROA |
| 4 | Cash Flow > Net Income (quality of earnings) | **No** | Need both CFO and net income |
| 5 | Long-term debt ratio decreased | **No** | Need current + prior year LT debt / total assets |
| 6 | Current ratio increased | **No** | Need current assets and liabilities (2 years) |
| 7 | No new shares issued (no dilution) | **No** | Need shares outstanding history |
| 8 | Gross margin increased | **No** | Need gross margin (2 years) |
| 9 | Asset turnover increased | **No** | Need revenue and total assets (2 years) |

**Score**: 0/9 criteria computable today. **Requires**: Full income statement, balance sheet, cash flow — at least 2 years.

---

### 3.3 Benjamin Graham — Defensive Investor (7 Criteria)

| # | Criterion | Rule | Can Compute? | Gap |
|---|-----------|------|-------------|-----|
| 1 | Adequate Size | Revenue >= $500M | **No** | Need annual revenue |
| 2 | Strong Financial Condition | Current Ratio >= 2.0; LT debt <= net current assets | **No** | Need balance sheet |
| 3 | Earnings Stability | Positive earnings each of past 10 years | **No** | Need 10-year EPS history |
| 4 | Dividend Record | Uninterrupted dividends 20 years | **No** | Need dividend history |
| 5 | Earnings Growth | >= 33% increase over 10 years | **No** | Need 10-year EPS |
| 6 | Moderate P/E | P/E <= 15 × 3-year avg earnings | **Partial** | Have trailing P/E; need 3-year avg |
| 7 | Moderate P/B | P/B <= 1.5 or P/E × P/B <= 22.5 | **No** | Need Price-to-Book |

**Graham Intrinsic Value Formula**: `V = EPS × (8.5 + 2g) × 4.4 / Y` where g = expected growth, Y = AAA bond yield.

---

### 3.4 Warren Buffett Approach

| Criterion | Rule | Can Compute? | Gap |
|-----------|------|-------------|-----|
| ROE >= 20% (10-year avg) | | **No** | Need net income + shareholders' equity |
| ROIC >= 15% | | **No** | Need NOPAT + invested capital |
| Gross Margin > 40% | | **No** | Need gross profit + revenue |
| Net Margin > 20% | | **No** | Need net income + revenue |
| Debt payoff < 5 years | | **No** | Need total debt + net income |
| Earnings consistency 10yr | | **No** | Need EPS history |
| P/E < 15 | | **Yes** | Already available |

---

### 3.5 Peter Lynch — PEG Ratio

| Criterion | Rule | Can Compute? | Gap |
|-----------|------|-------------|-----|
| PEG Ratio | P/E / EPS Growth | **Partial** | Have P/E and EPS Q/Q; need annualised forward growth |
| Stock Classification | Slow/Stalwart/Fast/Cyclical/Turnaround/Asset | **No** | Need multi-year growth rate history |
| Debt-to-Equity < 33% | | **No** | Need D/E ratio |
| Inventory vs Sales growth | | **No** | Need inventory data |
| Free Cash Flow positive | | **No** | Need FCF |

**Lynch Rules**: PEG < 1.0 = buy, PEG < 0.5 = strong buy, PEG > 2.0 = overpriced.

---

### 3.6 Joel Greenblatt — Magic Formula

| Criterion | Formula | Can Compute? | Gap |
|-----------|---------|-------------|-----|
| Earnings Yield | EBIT / Enterprise Value | **No** | Need EBIT and EV |
| Return on Capital | EBIT / (NWC + Net Fixed Assets) | **No** | Need balance sheet items |
| Combined Rank | Sum of EY rank + ROC rank | **No** | Depends on above |

**Rules**: Market cap > $100M, exclude financials/utilities, buy top 20–30, hold 1 year, rebalance annually.

---

### 3.7 Mark Minervini — SEPA Trend Template (8 Criteria)

| # | Criterion | Can Compute? | Gap |
|---|-----------|-------------|-----|
| 1 | Price > 150-day & 200-day SMA | **Partial** | Need SMA 150 |
| 2 | SMA 150 > SMA 200 | **No** | Need SMA 150 |
| 3 | SMA 200 trending up 1+ month | **Partial** | Need SMA 200 slope over time |
| 4 | SMA 50 > SMA 150 & SMA 200 | **Partial** | Need SMA 150 |
| 5 | Price > SMA 50 | **Yes** | Computable now |
| 6 | Price >= 30% above 52W low | **Yes** | Have 52W low |
| 7 | Price within 25% of 52W high | **Yes** | Have 52W high |
| 8 | RS Rating >= 70 | **No** | Need RS percentile |

**Additional**: EPS growth >= 20% YoY, Volatility Contraction Pattern (VCP), volume dry-up during contractions.

---

### 3.8 Martin Zweig (Growth at Reasonable Price)

| Criterion | Rule | Can Compute? | Gap |
|-----------|------|-------------|-----|
| Annual EPS Growth >= 20% (4–5yr) | | **No** | Need multi-year EPS |
| Quarterly EPS Growth YoY | | **Partial** | Have Q/Q not YoY |
| Revenue confirms earnings | | **Partial** | Have Sales Q/Q |
| P/E < 2× market avg | | **Partial** | Have P/E; need market avg P/E |
| Debt/Equity below industry avg | | **No** | Need D/E + industry avgs |
| Relative price strength | | **No** | Need RS percentile |
| Insider activity | | **No** | Need insider transaction data |

---

### 3.9 Jesse Livermore (Quantifiable Principles)

| Principle | Rule | Can Compute? | Gap |
|-----------|------|-------------|-----|
| Trade with trend | New 52W highs | **Yes** | Have 52W signals |
| Breakout from consolidation | Break > 6-week range on 2× volume | **Partial** | Have volume spike; need range detection |
| Volume confirmation | Breakout on high volume | **Yes** | Have volume ratio |
| Normal reaction (pullback) | Pullback on declining volume | **No** | Need multi-day volume trend |
| Pivotal points | Key support/resistance levels | **No** | Need S/R calculation |

---

### Gap Summary Matrix

| Methodology | Criteria | Computable | Partial | Missing | Readiness |
|-------------|----------|------------|---------|---------|-----------|
| **Minervini SEPA** | 8 | 3 | 2 | 3 | **50%** |
| **Livermore** | 5 | 2 | 1 | 2 | **50%** |
| **Zweig** | 7 | 0 | 3 | 4 | 21% |
| **CAN SLIM** | 7 | 1 | 2 | 4 | 14% |
| **Buffett** | 7 | 1 | 0 | 6 | 14% |
| **Lynch PEG** | 5 | 0 | 1 | 4 | 10% |
| **Graham** | 7 | 0 | 1 | 6 | 7% |
| **Piotroski** | 9 | 0 | 0 | 9 | 0% |
| **Magic Formula** | 2 | 0 | 0 | 2 | 0% |

**Minervini SEPA and Livermore are closest to implementation** — both rely heavily on technical/price data we already have.

---

## 4. Current Weaknesses & Improvements

### 4.1 UI/UX Gaps

| Issue | Description | Impact |
|-------|-------------|--------|
| **No interactive charts** | Stock Detail shows price levels as text — no candlestick or line chart | Critical |
| **No stock comparison** | Can't compare two stocks side-by-side | Medium |
| **No watchlist / favourites** | No way to save or track a personal list | Medium |
| **No URL state for filters** | Screener filters lost on refresh; not shareable | Medium |
| **Mobile table overflow** | Screener tables may overflow on narrow screens | Medium |
| **No loading skeletons** | Single spinner; no progressive content loading | Low |
| **No export** | Can't export screener results to CSV from UI | Low |
| **No multi-column sort** | Can't do composite sort (score DESC then P/E ASC) | Low |

### 4.2 Scoring System Improvements

| Issue | Recommendation |
|-------|---------------|
| **Absolute not relative** | Scores normalised to fixed ranges (P/E 5–60). Should score relative to sector peers like Seeking Alpha. |
| **Style-blind** | A utility and a growth stock scored identically. Need style-aware scoring (value vs growth vs income). |
| **No confidence indicator** | Score of 72 with full data ≠ 72 with missing fundamentals. Add data completeness %. |
| **Shallow sentiment** | AFINN on headlines is low-fidelity. Weight by source credibility and recency. |
| **No score history** | Can't see if a stock's score is improving or declining over time. |
| **Risk too simple** | Beta + Volatility misses drawdown, correlation, and tail risk. |
| **No sector rotation** | No indication of which sectors are strengthening/weakening. |
| **Fundamentals underweighted** | At 15%, fundamentals barely move the needle. Consider rebalancing for different horizons. |

### 4.3 Missing Fundamental Metrics

| Metric | Why It Matters | Used By |
|--------|---------------|---------|
| **P/B (Price-to-Book)** | Core value metric | Graham, Buffett |
| **P/S (Price-to-Sales)** | Valuation for unprofitable companies | Lynch |
| **P/FCF (Price-to-FCF)** | Cash-flow-based valuation | Buffett |
| **ROE** | Profitability / moat indicator | Buffett, CAN SLIM, Piotroski |
| **ROA** | Asset efficiency | Piotroski |
| **ROIC** | Capital allocation quality | Buffett, Greenblatt |
| **Debt-to-Equity** | Financial health | Graham, Lynch, Zweig |
| **Current Ratio** | Liquidity | Graham, Piotroski |
| **Gross Margin** | Competitive advantage | Buffett |
| **Net Margin** | Profitability | Buffett |
| **Operating Margin** | Operational efficiency | Greenblatt |
| **Free Cash Flow** | Cash generation | Buffett, Lynch |
| **Dividend Yield** | Income potential | Graham, Lynch |
| **Payout Ratio** | Dividend sustainability | Graham |
| **EPS (TTM)** | Earnings per share | All methodologies |
| **Book Value per Share** | Tangible net worth | Graham |
| **Enterprise Value** | Debt-adjusted market value | Greenblatt |
| **Shares Outstanding** | Dilution tracking | CAN SLIM, Piotroski |
| **Insider Ownership %** | Skin in the game | Zweig, Lynch |
| **Institutional Ownership %** | Smart money presence | CAN SLIM |
| **Short Float %** | Crowded shorts / squeeze risk | Finviz |
| **Analyst Target Price** | Consensus expectations | Multiple |

---

## 5. Prioritised Feature Roadmap

### Priority 1 — Quick Wins (Client-Side Only, No New Data)

Frontend changes only, using data already in `latest.json`.

| # | Feature | Description | Enables | Implementation |
|---|---------|-------------|---------|----------------|
| **Q1** | **Relative Strength Percentile** | Rank all stocks by `priceReturn3m` (40%) + `priceReturn6m` (60%), assign percentile 1–99 | CAN SLIM (L), Minervini (RS), Zweig | Sort all stocks in `computeScore()`, assign rank |
| **Q2** | **Minervini Trend Template Screen** | New page filtering stocks passing SEPA criteria (price > SMA50/200, 52W position, RS rank) | Minervini SEPA | Filter in frontend; display pass/fail per criterion |
| **Q3** | **Score Radar Chart** | 6-axis radar chart showing each score dimension | Simply Wall St snowflake | Recharts `RadarChart` — data already exists |
| **Q4** | **Market Heat Map** | Treemap of all stocks, sized by market cap, coloured by daily change or score | Finviz overview | `recharts` Treemap or `d3-treemap` |
| **Q5** | **Sector Performance View** | Aggregate scores and returns by sector, show rotation | Zweig, sector analysis | Group by `sector`, compute averages |
| **Q6** | **Watchlist (Local Storage)** | Star stocks, view filtered watchlist | UX essential | `localStorage` array of tickers |
| **Q7** | **URL State for Screener** | Persist sort/filters/pagination in URL search params | UX — shareable views | Sync TanStack state with `URLSearchParams` |
| **Q8** | **Data Completeness Badge** | Show % of metrics available per stock, flag low-confidence scores | Scoring transparency | Count non-null fields / expected fields |
| **Q9** | **Stock Comparison View** | Side-by-side comparison of 2–4 stocks | Seeking Alpha comparison | New page with multi-select |
| **Q10** | **Multi-Timeframe Signal Labels** | Label existing signals as short/medium/long-term; show aggregate per timeframe | Barchart Opinion concept | Tag 24 signal types with timeframe |
| **Q11** | **Score Trend Sparkline** | Store last 7 daily composite scores, show sparkline | Score trajectory | Add `scoreHistory: number[]` to ETL output |
| **Q12** | **Screener CSV Export** | Download filtered/sorted screener results as CSV | Data portability | Generate CSV blob from table state |

---

### Priority 2 — Medium Effort (New ETL Calculations from Existing Yahoo Finance Data)

ETL changes to fetch additional data from Yahoo Finance endpoints we already call, or trivial new endpoints.

| # | Feature | Description | Enables | Implementation |
|---|---------|-------------|---------|----------------|
| **M1** | **SMA 150** | Add 150-day Simple Moving Average | Minervini SEPA (criteria 1–4) | Add to `computeTechnicals()`; extend chart fetch to `period=1y` |
| **M2** | **Expanded Fundamentals from Yahoo v7** | Fetch: P/B, P/S, ROE, profit margins, dividend yield, payout ratio, D/E, book value, EPS TTM | Graham, Buffett, Lynch, Piotroski (partial) | Yahoo v7 `quote` already returns many — add fields to `QuoteData` |
| **M3** | **PEG Ratio** | P/E / forward earnings growth rate | Lynch PEG system | Yahoo v7 provides `pegRatio` or compute from Forward P/E + growth |
| **M4** | **Enterprise Value** | Market Cap + Total Debt − Cash | Greenblatt Magic Formula | Yahoo v7 provides `enterpriseValue` directly |
| **M5** | **Earnings Yield & Return on Capital** | EBIT / EV and EBIT / (NWC + Fixed Assets) | Greenblatt Magic Formula | Need EBIT from financials endpoint; EV from M4 |
| **M6** | **Style Classification** | Value / Blend / Growth based on P/E, P/B, growth rates | Morningstar Style Box | Rule-based classifier using M2 metrics |
| **M7** | **Sector-Relative Scoring** | Score each stock vs. sector peers (z-scores) instead of absolute ranges | Seeking Alpha approach | Group by sector → z-scores within sector → normalise |
| **M8** | **Market Regime Indicator** | Track S&P 500/FTSE 100 trend (SMA, distribution days) → "Uptrend" vs "Correction" | CAN SLIM (M), Zweig | Fetch SPY data; count distribution days; display status |
| **M9** | **Accumulation/Distribution Rating** | 13-week ratio of up-volume to down-volume days | CAN SLIM, IBD | Compute from existing 6-month OHLCV; sum (volume × direction) over 65 days |
| **M10** | **52-Week Range Metrics** | Price as % of 52W range; distance from high/low as % | Minervini (criteria 6–7) | `(price − low) / (high − low)` from existing data |
| **M11** | **Consolidation/Base Detection** | Detect stocks in tight ranges (< 15% range over 6+ weeks) | Livermore breakout, Minervini VCP | 30-day range narrowing from OHLCV |
| **M12** | **Support & Resistance Levels** | Key S/R from recent swing highs/lows | Livermore pivotal points | Swing-point algo on OHLCV; identify local min/max |
| **M13** | **Interactive Candlestick Chart** | TradingView Lightweight Charts on Stock Detail page | Core UX | `lightweight-charts` (TradingView OSS, 40KB); pass OHLCV |
| **M14** | **Weighted Alpha** | 1-year return weighted towards recent price (exponential decay) | Barchart momentum | 0.5 decay factor over 252 days |
| **M15** | **Score History** | Store daily composite scores in time-series file; chart 30/90-day trend | Score trajectory | Append to `score-history.json` each ETL run; line chart on Detail |

---

### Priority 3 — Large Effort (New Data Sources or Major Systems)

New API integrations, significant backend work, or new infrastructure.

| # | Feature | Description | Enables | Implementation |
|---|---------|-------------|---------|----------------|
| **L1** | **Financial Statements API** | Fetch income statement, balance sheet, cash flow (3–5 years) | Piotroski (9/9), Graham (7/7), Buffett, Greenblatt | **A**: Yahoo Finance `financials` endpoint (free, unreliable). **B**: [Financial Modeling Prep](https://financialmodelingprep.com/) free tier (250 req/day). **C**: SEC EDGAR XBRL. |
| **L2** | **Piotroski F-Score** | Implement all 9 criteria scoring | Piotroski | Depends on L1. Compare current vs prior year across 9 metrics. |
| **L3** | **Graham Number & Intrinsic Value** | `V = EPS × (8.5 + 2g) × 4.4/Y` + 7 criteria screen | Graham Defensive | Depends on L1 (book value, 10-year EPS). Bond yield from FRED API. |
| **L4** | **DCF Fair Value Calculator** | 5-year projected FCF + terminal value | Morningstar/Simply Wall St valuation | Depends on L1 (FCF history). Need growth assumptions. |
| **L5** | **Insider Trading Data** | Recent insider buys/sells with amounts | Zweig, Finviz feature | SEC EDGAR Form 4 (free, XML) or OpenInsider scraping. |
| **L6** | **Institutional Ownership** | % of institutional holders; QoQ change | CAN SLIM (I) | SEC 13F filings (quarterly) or Yahoo `holders` endpoint. |
| **L7** | **Analyst Estimates & Revisions** | Consensus EPS estimates, revision trends (30/60/90 day) | Zacks-style rank, Seeking Alpha, CAN SLIM | Yahoo `earnings` endpoint or Estimize. Track changes across ETL runs. |
| **L8** | **Dividend History** | 10+ year payment history, growth rate, CAGR | Graham (criterion 4), income investing | Yahoo `dividends` endpoint or EOD Historical Data. |
| **L9** | **Alert System** | User-configurable alerts: score threshold, signal trigger, price level | TradingView-style alerts | User accounts or email-only; background checker; notification service. Cloudflare Workers + D1. |
| **L10** | **Portfolio Tracker** | Input holdings (ticker + shares + cost); portfolio score, allocation, P&L | Simply Wall St portfolio, Stock Rover | `localStorage` for MVP → backend. Portfolio score = weighted avg. |
| **L11** | **Backtest Engine** | Test scoring strategies against historical performance | Stock Rover backtesting, validation | Archive daily `latest.json` snapshots. Compare top-N scored stocks vs benchmark. |
| **L12** | **Pre-Built Strategy Screens** | One-click: "CAN SLIM", "Graham Value", "Minervini Trend", "Magic Formula Top 30", "Piotroski 8-9" | Multiple methodologies | Depends on M1–M7, L1–L3. Each = predefined filter combo. |
| **L13** | **AI-Enhanced Sentiment** | Replace AFINN with LLM-based (GPT/Claude API) or FinBERT for nuanced analysis | Better sentiment | LLM per headline batch or FinBERT (HuggingFace, free). ~$0.01/100 headlines for LLM. |
| **L14** | **Short Interest Data** | Short float %, days to cover | Squeeze detection, contrarian | FINRA (delayed), Ortex (paid), or FinViz Elite scrape. |

---

### Implementation Priority Map

```
NOW (Sprint 1–2)                    NEXT (Sprint 3–5)                   LATER (Sprint 6+)
─────────────────                   ──────────────────                   ─────────────────
Q1  RS Percentile Rank              M1  SMA 150                         L1  Financial Statements API
Q2  Minervini Screen (partial)      M2  Expanded Fundamentals           L2  Piotroski F-Score
Q3  Radar Chart                     M3  PEG Ratio                       L3  Graham Intrinsic Value
Q4  Market Heat Map                 M4  Enterprise Value                L4  DCF Fair Value
Q5  Sector Performance              M7  Sector-Relative Scoring         L5  Insider Trading Data
Q6  Watchlist                       M8  Market Regime Indicator         L7  Analyst Estimates
Q7  URL State                       M9  Acc/Dist Rating                 L9  Alert System
Q8  Data Completeness Badge         M13 Interactive Candlestick Chart   L10 Portfolio Tracker
Q12 CSV Export                      M15 Score History                   L11 Backtest Engine
                                    M11 Consolidation Detection         L12 Strategy Screens
                                    M12 Support/Resistance              L13 AI Sentiment
```

---

### Impact vs Effort Matrix

```
                        LOW EFFORT ◄──────────────────────► HIGH EFFORT
                        │                                          │
  HIGH IMPACT           │  Q1 RS Percentile ★                     │  L1 Financials API ★
                        │  Q4 Heat Map                             │  L2 Piotroski
                        │  Q6 Watchlist                            │  L7 Analyst Estimates
                        │  M8 Market Regime ★                     │  L4 DCF Fair Value
                        │  M13 Candlestick Chart ★                │  L12 Strategy Screens
                        │  M2 Expanded Fundamentals ★             │
                        │  M7 Sector-Relative Scoring              │
                        │                                          │
  MEDIUM IMPACT         │  Q3 Radar Chart                          │  L5 Insider Trading
                        │  Q5 Sector View                          │  L6 Institutional Ownership
                        │  Q7 URL State                            │  L10 Portfolio Tracker
                        │  Q8 Data Completeness                    │  L9 Alert System
                        │  M1 SMA 150                              │  L11 Backtest Engine
                        │  M3 PEG Ratio                            │
                        │  M9 Acc/Dist Rating                      │
                        │                                          │
  LOW IMPACT            │  Q12 CSV Export                           │  L14 Short Interest
                        │  Q10 Multi-Timeframe Labels              │  L8 Dividend History
                        │  M14 Weighted Alpha                      │  L13 AI Sentiment
                        │                                          │

★ = Recommended first priorities (highest impact-to-effort ratio)
```

---

### Recommended Immediate Actions

1. ~~**Start archiving daily `latest.json`**~~ — **DONE**. ETL workflow now copies `data/latest.json` to `data/archive/YYYY-MM-DD.json` each run (90-day retention).

2. ~~**Extend Yahoo v7 fetch**~~ — **DONE**. Added ~25 fields from v7 quote + v10 quoteSummary: P/B, ROE, ROA, margins (gross/operating/profit), D/E, current ratio, dividend yield, EPS, book value, enterprise value, EBITDA, FCF, insider/institutional ownership, short float, analyst target, PEG ratio.

3. ~~**Add RS Percentile**~~ — **DONE**. Computed in ETL (40% 3M + 30% 6M + 30% 1Y returns, ranked 1-99). Displayed in Screener, StockDetail, and Minervini Screen.

4. ~~**Add SMA 150**~~ — **DONE**. Chart period extended to 1 year. SMA 150, SMA200 slope, and full Minervini 8-criteria trend template implemented.

5. ~~**Add candlestick chart**~~ — **DONE**. Using `lightweight-charts` v5 (TradingView OSS). Per-stock OHLCV data written to `data/charts/`, loaded lazily on StockDetail page. Includes volume histogram and SMA 50/150/200 overlays.

### Additional Features Shipped

| Feature | Status | Notes |
|---------|--------|-------|
| **Q2** Minervini Trend Template Screen | **DONE** | New `/minervini` page with 8-criteria filter |
| **Q4** Market Heat Map | **DONE** | New `/heatmap` page, 3 color modes (change/score/RS) |
| **Q5** Sector Performance View | **DONE** | New `/sectors` page with per-sector aggregates |
| **Q6** Watchlist (localStorage) | **DONE** | New `/watchlist` page, persisted in browser |
| **Q8** Data Completeness Badge | **DONE** | Shown on StockDetail and Screener |
| **Q9** Stock Comparison View | **DONE** | New `/compare` page, side-by-side 2-4 stocks |
| **Q12** Screener CSV Export | **DONE** | Export button on Screener page |
| **M1** SMA 150 | **DONE** | Added to technicals, powers Minervini |
| **M2** Expanded Fundamentals | **DONE** | 25+ fields from Yahoo quoteSummary |
| **M3** PEG Ratio | **DONE** | From Yahoo API |
| **M4** Enterprise Value | **DONE** | From Yahoo API |
| **M6** Style Classification | **DONE** | Value/Blend/Growth rule-based |
| **M9** Acc/Dist Rating | **DONE** | A-E rating from 13-week volume |
| **M10** 52-Week Range Metrics | **DONE** | Price as % of 52W range |
| **M11** Consolidation Detection | **DONE** | 30-day high-low range % |
| **M13** Interactive Candlestick Chart | **DONE** | lightweight-charts v5 + OHLCV pipeline |

### Recently Shipped (February 2026 — Batch 3)

| Feature | Status | Notes |
|---------|--------|-------|
| **Q3** Score Radar Chart | **DONE** | 6-axis Recharts RadarChart on StockDetail (Momentum, Technical, Sentiment, Fundamentals, Volume, Risk) |
| **Q7** URL State for Screener | **DONE** | Filters, sort, pagination synced with URL search params. Bookmarkable/shareable |
| **M7** Sector-Relative Scoring | **DONE** | Z-score within sector + rank. `sectorZScore`, `sectorRank`, `sectorCount` fields |
| **M8** Market Regime Indicator | **DONE** | S&P 500 + FTSE 100 regime detection (bull/correction/bear). SMA analysis + distribution day counting. Shown on Overview |
| **M12** Support & Resistance Levels | **DONE** | Swing-point algorithm on OHLCV data. Top 3 support + 3 resistance levels per stock on StockDetail |
| **M15** Score History | **DONE** | Daily composite scores stored in `score-history.json`. 30/90-day SVG trend chart on StockDetail |
| **L1** Financial Statements API | **DONE** | Yahoo quoteSummary incomeStatement/balanceSheet/cashflow. Piotroski F-Score (0-9), Graham Number, Buffett Quality Score (0-5) |
| **Alerts** Telegram Notifications | **DONE** | Edge-triggered alerts via Telegram Bot + ntfy.sh fallback. 8 default rules for all stocks |
| **Guide** Updated | **DONE** | All new features documented with explanations and strategy guides |

### Recently Shipped (February 2026 — Batch 4)

| Feature | Status | Notes |
|---------|--------|-------|
| **Q1** Advanced Screener Filters | **DONE** | Collapsible "Filters" panel with 10 range sliders: Score, RSI, RS Percentile, P/E, Piotroski, Buffett, Bearish, Minervini, Change %, Beta. All synced to URL for sharing. Active filter count badge. |
| **Q10** PWA Support | **DONE** | manifest.json, service worker (cache-first for app shell, network-first for data), Apple meta tags, SVG icons, install prompt banner with dismiss. Enables "Add to Home Screen" and offline viewing. |
| **UX** Tooltips Everywhere | **DONE** | InfoTooltip component + central TIPS definitions (~80 entries). Added to Overview, Screener, SectorPerformance, StockComparison, Watchlist, and StockDetail. |
| **UX** Section Descriptions | **DONE** | Added "how to use" descriptions to Score Breakdown, Support & Resistance, and Expert Screens sections on StockDetail. |
| **Fix** Graham Number | **DONE** | Was always N/A — financial statements API lacked sharesOutstanding. Fixed to use quote-level trailingEps + bookValue instead. |

### Recently Shipped (February 2026 — Batch 5)

| Feature | Status | Notes |
|---------|--------|-------|
| **Q11** Portfolio Tracker | **DONE** | Full portfolio management with localStorage persistence. Add/remove holdings with ticker search autocomplete. P&L calculation per position and total. SVG pie chart for allocation. Summary cards (Total Value, P&L, Cost, Avg Score). |
| **M5** CAN SLIM Screen | **DONE** | William O'Neil's 7-point growth methodology. Evaluates C-A-N-S-L-I-M criteria per stock using available data proxies. Minimum passing filter (4-7). Per-stock expandable cards with pass/fail details. Market regime integration for "M" criterion. |
| **M14** Earnings Calendar | **DONE** | Calendar view grouped by date with upcoming/recent/all views. Highlights today and this week. Sort by date, score, or ticker. ETL now fetches earningsDate from Yahoo v7. |
| **L4** Custom Screening Builder | **DONE** | 25 metric definitions with dynamic AND/OR filter rules. Operators: >, >=, <, <=, =. Save/load named screens to localStorage. Results table with dynamic columns based on active rules. |
| **L6** Strategy Backtest | **DONE** | 8 built-in strategies (High Score, Momentum, Minervini, Value+Growth, Piotroski, Buffett, Oversold, Breakout). Aggregate stats (avg return, win rate, median, best/worst). Score history integration. Sortable results table. |
| **Nav** Reorganised Navigation | **DONE** | Added Portfolio to primary nav. New "Screens" dropdown (Minervini, CAN SLIM, Custom Screen, Earnings). Backtest added to Analysis group. |
| **L3** DCF Lite Valuation | **DONE** | 5-year DCF model using operating cash flow, growth rate (capped 30%), 10% discount, 15x terminal. Per-share intrinsic value on StockDetail alongside Graham Number with under/overvalued indicator. |
| **L5** Finance-Specific Sentiment | **DONE** | Replaced generic AFINN with ~200-word finance lexicon (unigrams + 100+ bigram phrases). Negation handling ("not good" flips score). Positional weighting (headline start matters more). Covers beat/miss estimates, guidance raised/lowered, SEC investigation, dividend changes, etc. |
| **M14b** Earnings Date ETL | **DONE** | Added `earningsDate` field from Yahoo v7 `earningsTimestamp`. Flows through to frontend Earnings Calendar and StockDetail fundamentals grid. |
| **L8** AI Stock Summaries | **DONE** | Rule-based NLG generating analyst-style research notes per stock. 5 sections: opening assessment, technical setup, fundamentals & valuation, signals & catalysts, closing verdict. Expandable card on StockDetail page. Uses all available data (scores, RSI, MAs, Bollinger, volume, P/E, ROE, debt, Graham, DCF, Piotroski, Buffett, signals, OBV, Minervini, RS). |

### Recently Shipped (February 2026 — Batch 6)

| Feature | Status | Notes |
|---------|--------|-------|
| **Q13** Custom Screen CSV Export | **DONE** | Export button on Custom Screen Builder. Headers include Ticker, Name, Market, Price, Change%, Score + dynamic columns for each active filter rule metric. |
| **L2** Multi-Year Revenue/Earnings Charts | **DONE** | ETL writes `data/financials.json` with annual Revenue, Net Income, Gross Profit, Operating Income per stock. Recharts grouped BarChart on StockDetail with large-number formatting ($383B). |
| **Q12** Stock Comparison Sparklines | **DONE** | Shared `useOhlcvData` hook (module-level cache). `MiniSparkline` component (200x60 Recharts AreaChart, 6-month close prices). Auto-colored by trend (green up, red down). Shown below each stock's ScoreGauge on Compare page. |
| **M16** Sector Rotation Model | **DONE** | New `/sector-rotation` page. Groups stocks by sector, computes avg RS percentile and momentum acceleration (3M−6M return delta). RRG-style Recharts ScatterChart with 4 quadrants (Leading/Weakening/Lagging/Improving). Sortable sector table below. Added to Analysis nav group. |
| **M17** Correlation Matrix | **DONE** | `computeCorrelationMatrix()` using daily log returns with Pearson correlation. SVG heatmap with diverging color scale (red↔white↔green). Shown on Portfolio page when 2+ holdings exist. Uses shared `useOhlcvData` hook. |
| **Q14** Dark/Light Chart Themes | **DONE** | 6 CSS variables (`--chart-bullish/bearish/neutral/accent/accent-light/grid`) in both `:root` and `.dark`. Updated ScoreGauge, ScoreRadarChart, SentimentBar, ScoreHistoryChart, CandlestickChart (via `getComputedStyle`), and new FinancialsBarChart. Brighter variants for dark mode. |

### Remaining Next Priorities

1. **L7 — Options Flow Integration** — Surface unusual options activity data to identify institutional positioning ahead of moves. (Skipped in Batch 6 — no free data source available.)
2. **L5 — Insider Trading Data** — Recent insider buys/sells with amounts from SEC EDGAR Form 4.
3. **L8 — Dividend History** — 10+ year payment history, growth rate, CAGR for income investing analysis.
4. **L13 — AI-Enhanced Sentiment** — Replace rule-based sentiment with FinBERT or LLM-based analysis for nuanced headline scoring.
5. **Q10 — Multi-Timeframe Signal Labels** — Tag existing 24 signal types with short/medium/long-term timeframe; show aggregate per timeframe (Barchart Opinion style).
6. **M14 — Weighted Alpha** — 1-year return with exponential decay weighting towards recent prices (Barchart-style momentum metric).
7. **UX — Performance Optimisation** — Code-split large pages (SectorRotation, Backtest) with `React.lazy()`. Consider manual chunks in Vite config to reduce main bundle below 500KB.

---

*This document should be reviewed and updated quarterly as features are shipped and new competitive features emerge.*
