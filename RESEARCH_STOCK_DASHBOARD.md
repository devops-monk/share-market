# Research & Feature Roadmap — StockMarket Dashboard

> **Date**: 2026-02-27 | **Live**: [share.devops-monk.com](https://share.devops-monk.com)
> **Last research update**: February 2026

---

## Table of Contents

1. [What We Have Today](#1-what-we-have-today)
2. [Competitive Analysis](#2-competitive-analysis)
3. [Expert Techniques Gap Analysis](#3-expert-techniques-gap-analysis)
4. [Current Weaknesses & Improvements](#4-current-weaknesses--improvements)
5. [Prioritised Feature Roadmap](#5-prioritised-feature-roadmap)
6. [New Feature Ideas from 2026 Research](#6-new-feature-ideas-from-2026-research)

---

## 1. What We Have Today

### Pages (29 total)
| Page | Purpose |
|------|---------|
| Overview | Market snapshot — top/bottom performers, avg score, bearish count, market regime |
| Screener | Sortable/filterable table (TanStack React Table) with 10 range sliders, URL state |
| Bearish Alerts | Stocks with bearish score >= 4, signal severity badges |
| Buy the Dip | Value reversals (RSI < 35, Stochastic oversold, OBV bullish divergence) |
| Breakout Detection | Bollinger squeeze + volume spike candidates (4-signal scoring) |
| News & Sentiment | Google News + FinViz headlines with FinBERT AI sentiment + lexicon fallback |
| Stock Detail | Per-stock deep dive — gauge, radar, candlestick chart, AI research notes, signals, insider trades, dividends, financials, S/R levels |
| Minervini Screen | 8-criteria SEPA trend template filter |
| CAN SLIM Screen | William O'Neil 7-point methodology with market regime integration |
| Sector Performance | Per-sector aggregates: avg score, returns, RSI, RS percentile |
| Sector Rotation | RRG-style scatter plot (Leading/Weakening/Lagging/Improving quadrants) |
| Heat Map | Treemap of all stocks (3 modes: change/score/RS) |
| Watchlist | localStorage-persisted starred stocks |
| Portfolio | Holdings tracker with P&L, allocation pie chart, correlation heatmap, paper trading |
| AI Copilot | Chat interface for stock Q&A — client-side engine + HuggingFace LLM fallback |
| Stock Comparison | Side-by-side 2–8 stocks with sparklines, 5 metric groups |
| Custom Screen | 25-metric rule builder with AND/OR logic, save/load, CSV export |
| Earnings Calendar | Calendar view with upcoming/recent/all, highlights today |
| Strategy Backtest | 8 built-in strategies with returns, win rate, score distribution |
| Buy the Dip | Mean-reversion 5-criteria screening |
| Support Bounce | Near-support with bullish signals (6-criteria) |
| Yearly Uptrend | Multi-year positive return streaks + distance to resistance |
| Most Owned | Top 200 institutional stocks with drop-from-high analysis |
| Guide | 4-tab educational resource (Basics, Dashboard Tour, Indicators, Strategies) |
| Alert Settings | 11 rule types, edge-triggered, JSON export/import |
| NL Query | Natural language stock search — parse plain English queries into filters |
| Economic Calendar | FOMC, CPI, NFP, GDP, earnings seasons, quad-witching dates with impact ratings |
| Chart Replay | Step through historical candles with SMA/RSI overlays, practice trading decisions |
| AI Indicator Builder | Natural language to stock filter — AI generates JS functions, run against all stocks |

### Composite Score (0–100)
| Factor | Weight | Inputs |
|--------|--------|--------|
| Momentum | 25% | 3-month + 6-month price returns |
| Technical Signals | 25% | Net bullish − bearish signal severity |
| Sentiment | 15% | FinBERT AI (fallback: finance lexicon) |
| Fundamentals | 15% | Inverted P/E + earnings growth |
| Volume Trend | 10% | Current volume / 20-day average |
| Risk (inverse) | 10% | 1 − (Beta × 0.5 + Volatility × 0.5) |

### Technical Indicators
RSI (14), MACD (12/26/9), SMA 20/50/150/200, SMA 200 slope, Bollinger Bands (20, 2σ) with squeeze/bandwidth/%B, Stochastic (14) K/D, OBV trend + divergence, Volatility (30-day annualised), Volume Ratio, Weighted Alpha (exponential decay), Accumulation/Distribution Rating (A–E), Support & Resistance levels (swing-point algo), **ADX/DI+/DI-** (trend strength), **Williams %R** (momentum), **Chaikin Money Flow** (volume-price), **Sharpe Ratio** (risk-adjusted return), **Sortino Ratio** (downside risk), **Max Drawdown** (1Y worst peak-to-trough).

### Signal Types (24 total)
MA crosses (death/golden cross, MA alignment), RSI overbought/oversold, MACD bullish/bearish, Bollinger squeeze/upper+RSI/lower+RSI, Stochastic bullish/bearish/combo, OBV divergence (bull/bear)/uptrend confirm, volume spike decline/accumulation day, strong/weak momentum, near 52W high/low. Each tagged with `timeframe: short|medium|long`.

### Fundamental Metrics (35+)
P/E, Forward P/E, PEG, P/B, EPS (trailing/forward), Earnings Growth, Revenue Growth, ROE, ROA, Gross/Operating/Profit margins, D/E, Current Ratio, Dividend Yield, Book Value, Enterprise Value, EBITDA, FCF, Operating Cash Flow, Shares Outstanding, Insider/Institutional Ownership %, Short Float %, Analyst Target Price, Analyst Rating.

### Expert Screens
Piotroski F-Score (0–9), Graham Number, Buffett Quality Score (0–5), DCF Lite Valuation, Minervini Trend Template (8 checks), CAN SLIM (7 criteria), Style Classification (Value/Blend/Growth), **Altman Z-Score** (bankruptcy prediction — safe/grey/distress zones), **Factor Grades** (A+ to F across Value/Growth/Profitability/Momentum/Safety), **SMR Rating** (IBD-style A–E: Sales growth + Margins + ROE), **Post-Earnings Drift** (1/5/20-day returns after last earnings).

### Data Sources
Yahoo Finance v8 (5-year OHLCV daily + dividends), Yahoo Finance v7 (fundamentals — batch), Yahoo quoteSummary (financials, balance sheet, cash flow), FinViz scraper (EPS Q/Q, Sales Q/Q for US stocks), Google News RSS + FinViz News, HuggingFace FinBERT (sentiment), HuggingFace Qwen 2.5 7B (AI research notes), SEC EDGAR Form 4 (insider trades), S&P 500 + FTSE 100 (market regime). ETL runs hourly via GitHub Actions (weekdays 7am–9pm UTC).

---

## 2. Competitive Analysis

### 2.1 TradingView

**Key Features**: 400+ built-in indicators, Pine Script custom indicator language, 21 chart types (Renko, Kagi, Point & Figure, Heikin Ashi), multi-chart layouts (up to 16 synced), social community (trade ideas, scripts, live streams), server-side alerts on any condition, broker integration for live trading, replay mode for backtesting, stock screener + sector heat maps, fundamental data overlay on price charts.

**2025–2026 Updates**: Alerts on rectangle drawings for tracking price zones, cross-tab synchronization for watchlists/intervals. AI-powered Pine Script generation via OctoBot and Pineify. Community-built AI indicators (LuxAlgo suite: volume flow analysis, dynamic S/R, divergence spotting, predictive signals). AI-Signals script analyzing market structure, options flow, and insider volume.

| Gap | Severity | Status |
|-----|----------|--------|
| ~~No interactive charting~~ | ~~Critical~~ | **DONE** — lightweight-charts v5 |
| No custom indicator builder / formula engine | High | Open |
| No chart pattern recognition (cup-with-handle, H&S, etc.) | High | Open |
| ~~No heat map visualisation~~ | ~~Medium~~ | **DONE** |
| ~~No alert system~~ | ~~Medium~~ | **DONE** — Telegram + ntfy.sh |
| ~~No candlestick chart~~ | ~~Medium~~ | **DONE** |
| No replay / backtest with historical charts | Medium | Open |
| No social features / idea sharing | Low | Open |
| No AI-powered Pine Script-style indicator builder | Medium | New gap |

---

### 2.2 Finviz

**Key Features**: S&P 500 treemap heat map (by sector, cap, performance), market themes heatmap (AI, clean energy), insider trading map, 52W highs/lows map, 60+ screener filters, snapshot ticker pages, backtesting (Elite), futures heat map.

**2025–2026 Updates**: New 52-Week Highs/Lows Maps showing stocks pulling back from highs with relative comparison. Theme-based screening for market-moving themes (AI, clean energy, etc.) via Theme/Sub-theme fields. Dedicated heatmap views added to Groups feature for aggregate sector/category performance tracking. Push alerts for news, ratings, insider trading, SEC filings, and price movements.

| Gap | Severity | Status |
|-----|----------|--------|
| ~~No market heat map~~ | ~~High~~ | **DONE** |
| ~~No insider trading data~~ | ~~High~~ | **DONE** — SEC EDGAR |
| No short interest / short float data | Medium | Have `shortPercentOfFloat` from Yahoo |
| ~~No analyst recommendations~~ | ~~Medium~~ | **DONE** — `averageAnalystRating` |
| No theme-based screening (AI, clean energy, etc.) | Medium | New gap |
| No 52W highs/lows map visualisation | Low | New gap |
| ~~No screener export~~ | ~~Low~~ | **DONE** |

---

### 2.3 Stock Rover

**Key Features**: 700+ screening criteria with 10 years historical data, weighted ranked screener (user-defined weights), custom freeform equation filters, built-in Piotroski F-Score / Altman Z-Score / Beneish M-Score, 150+ pre-built screeners (Buffett, Graham, etc.), 10-year backtesting, portfolio analytics (correlation, diversification), fair value / DCF estimates, auto-generated research reports.

**2025–2026 Updates**: Stock Rover V11 released May 2025 with improved UX and navigation. New beta feature for individual analyst ratings and price target history per stock. Research reports include margin of safety, fair value, and proprietary scoring (Growth, Quality, Sentiment, Piotroski, Altman Z-score). Rated 9/10 satisfaction by financial advisors in Kitces 2025 study.

| Gap | Severity | Status |
|-----|----------|--------|
| ~~No historical fundamental data~~ | ~~Critical~~ | **DONE** — multi-year financials |
| ~~No Piotroski F-Score~~ | ~~High~~ | **DONE** — 0–9 |
| ~~No DCF / intrinsic value~~ | ~~High~~ | **DONE** — DCF Lite |
| No weighted multi-factor screener (user-defined weights) | High | Open |
| ~~No portfolio tracking~~ | ~~Medium~~ | **DONE** |
| ~~No backtest capability~~ | ~~Medium~~ | **DONE** — 8 strategies |
| ~~No pre-built strategy screeners~~ | ~~Medium~~ | **DONE** — Minervini, CAN SLIM |
| No Altman Z-Score (bankruptcy prediction) | Medium | New gap |
| No Beneish M-Score (earnings manipulation detection) | Medium | New gap |
| No individual analyst tracking per stock | Low | New gap |

---

### 2.4 Seeking Alpha

**Key Features**: Quant Ratings (1.0–5.0: Strong Buy → Strong Sell) based on 100+ metrics per stock, Factor Grades (A+ to F) across Value/Growth/Profitability/Momentum/EPS Revisions, three rating systems side-by-side, EPS revision tracking, dividend grades, earnings call transcripts, stock comparison tool.

**2025–2026 Updates**: "Ask Seeking Alpha" AI tool for PRO subscribers (Nov 2025) — filter stocks by Quant grade duration (e.g. "Show me stocks that have been Quant Strong Buy for 150+ days"), find latest Top Analyst picks via natural language. Quant Ratings track duration a stock maintains each rating, adding persistence as a signal.

| Gap | Severity | Status |
|-----|----------|--------|
| No factor-grade system (letter grades per dimension) | **High** | Open |
| No EPS revision tracking (estimate changes over time) | High | Open |
| ~~No peer/sector-relative scoring~~ | ~~High~~ | **DONE** — z-scores + rank |
| ~~No dividend analysis~~ | ~~Medium~~ | **DONE** — 5yr CAGR, streak |
| ~~No stock comparison view~~ | ~~Medium~~ | **DONE** |
| ~~No profitability metrics~~ | ~~Medium~~ | **DONE** — ROE, ROA, margins |
| No natural language stock querying (AI copilot) | High | New gap |
| No rating duration tracking | Medium | New gap |

---

### 2.5 Simply Wall St

**Key Features**: Snowflake model (5-axis visual: Value, Future Growth, Past Performance, Health, Dividends), 30 binary checks (6 per axis), infographic-based reports, DCF-based intrinsic value with visual discount display, portfolio Snowflake, ownership breakdown, global 100K+ stock coverage, peer comparison with Snowflake overlays.

**2025–2026 Updates**: Portfolio Snowflake upgraded to aggregate risks and rewards across all holdings. Transaction-based portfolios (Feb 2025) auto-factoring buys/sells/dividends/splits for true performance. AI-powered CSV portfolio import. New table views (Income, Growth, Value, Snowflake Scores, Fundamentals). Weekly Picks highlighting top narratives. Screener now filters by Snowflake score thresholds.

| Gap | Severity | Status |
|-----|----------|--------|
| ~~No multi-axis visual scoring model~~ | ~~High~~ | **DONE** — 6-axis radar chart |
| ~~No DCF / fair value estimate~~ | ~~High~~ | **DONE** — DCF Lite + Graham |
| No ownership breakdown data (institutional vs insider pie chart) | Medium | Partial — have %, no visualization |
| No infographic-style stock reports | Medium | Open |
| ~~No portfolio-level scoring~~ | ~~Medium~~ | **DONE** — Portfolio avg score |
| No portfolio-level Snowflake aggregation | Medium | New gap |
| No AI-powered portfolio import | Low | New gap |

---

### 2.6 Morningstar

**Key Features**: Economic Moat rating (Wide/Narrow/None) based on 5 competitive advantage sources, analyst-driven Fair Value (3-stage DCF), Star Rating (1–5: price vs. fair value with uncertainty adjustment), Uncertainty Rating, Style Box (3×3 Value/Blend/Growth × Large/Mid/Small), Stewardship & Capital Allocation ratings, fund/ETF medalist system.

| Gap | Severity | Status |
|-----|----------|--------|
| ~~No fair value / intrinsic value estimate~~ | ~~High~~ | **DONE** — DCF + Graham |
| No qualitative moat assessment (heuristic proxy needed) | Medium | Open |
| ~~No style box classification~~ | ~~Medium~~ | **DONE** — Value/Blend/Growth |
| No uncertainty/confidence rating for our scores | Medium | Open |
| No management quality indicators | Low | Open |

---

### 2.7 Zacks

**Key Features**: Zacks Rank (1–5) based purely on earnings estimate revision trends, Style Scores (A–F) across Value/Growth/Momentum/VGM composite, Earnings ESP (Expected Surprise Prediction), Industry Rank (265 industries), Rank + Style Combo strategy.

| Gap | Severity | Status |
|-----|----------|--------|
| No earnings estimate revision tracking | **High** | Open |
| No industry/sector ranking system | High | Partial — have sector performance |
| No earnings surprise prediction (ESP) | Medium | Open |
| No style scores (letter grade system) | Medium | Open |

---

### 2.8 IBD (Investor's Business Daily)

**Key Features**: Composite Rating (1–99: EPS + RS + Industry + SMR + Acc/Dist), EPS Rating (1–99: 3-year earnings growth + stability), Relative Strength Rating (1–99: 12-month price performance vs. all stocks), Accumulation/Distribution Rating (A–E: institutional buying/selling 13 weeks), SMR Rating (A–E: Sales/Margins/ROE), Industry Group Ranking (197 groups), MarketSmith chart pattern recognition, Market Pulse market direction assessment.

| Gap | Severity | Status |
|-----|----------|--------|
| ~~No relative strength ranking~~ | ~~High~~ | **DONE** — RS Percentile 1–99 |
| ~~No market direction / regime indicator~~ | ~~High~~ | **DONE** |
| ~~No accumulation/distribution rating~~ | ~~High~~ | **DONE** — A–E |
| No chart pattern recognition (cup-with-handle, bases) | High | Open |
| No industry group strength ranking | Medium | Partial — sector only |
| No SMR composite (Sales, Margins, ROE) | Medium | Have individual metrics |

---

### 2.9 Barchart

**Key Features**: Barchart Opinion (13 indicators across 3 timeframes → aggregate signal), Weighted Alpha (recent-biased 1-year momentum), options analytics suite (IV Rank, Greeks, unusual activity), Van Meerten proprietary indicators, futures & commodities depth, Barchart for Excel.

| Gap | Severity | Status |
|-----|----------|--------|
| ~~No multi-timeframe signal aggregation~~ | ~~High~~ | **DONE** — short/medium/long |
| ~~No weighted alpha~~ | ~~Medium~~ | **DONE** |
| No options data integration | Low | Open (no free data source) |

---

### 2.10 Yahoo Finance Premium

**Key Features**: Peter Lynch PEG-based fair value estimate, Morningstar research reports & star ratings, Argus Research reports, portfolio tracking with risk metrics, company outlook (bull/bear case), enhanced charting.

| Gap | Severity | Status |
|-----|----------|--------|
| No PEG-based fair value calculation | Medium | Have PEG ratio, need fair value formula |
| No bull/bear case narrative generation | Medium | AI research note covers this partially |
| ~~No portfolio tracking~~ | ~~Medium~~ | **DONE** |

---

### 2.11 Koyfin (NEW)

**Key Features**: Bloomberg-style experience for retail. 5,900+ screening criteria, 10-year financial statements, analyst estimates & earnings transcripts, customizable multi-widget dashboards, global coverage 100K+ securities, advanced charting with fundamentals overlay, spreadsheet-style data views. Ranked #1 Financial Analytics and Investment Portfolio Management on G2 Winter 2026. Rated 9/10 by financial advisors (Kitces 2025).

| Gap | Severity |
|-----|----------|
| No customizable multi-widget dashboard layout | **High** |
| No analyst estimates or earnings transcripts | High |
| No 10-year historical financial statements | Medium (have 3–5 years) |
| No spreadsheet-style data views (Excel-like) | Medium |
| No fundamentals overlay on price charts | Medium |
| No global coverage (we have US + UK only) | Low |

---

### 2.12 Danelfin (NEW — AI-Native)

**Key Features**: AI Score (1–10) per stock analyzing 10,000 features daily across 600+ technical, 150+ fundamental, and 150+ sentiment indicators. Explainable AI — no black box. Rates probability of beating the market in next 3 months. Best Stocks strategy returned +376% (Jan 2017 – Jun 2025) vs +166% S&P 500. Stocks with AI Score 10/10 outperformed market by +21% (annualised alpha).

| Gap | Severity |
|-----|----------|
| No predictive scoring (probability of beating market) | **High** |
| No AI explainability layer (which features drive each score) | High |
| No forward-looking scoring (our score is current state only) | Medium |
| No 10,000-feature daily analysis | Low (compute budget) |

---

### 2.13 TrendSpider (NEW — Automation)

**Key Features**: Auto-drawn trendlines, S/R zones, Fibonacci levels. 200+ indicators. Multi-timeframe analysis (overlay indicators from different timeframes). 123 candlestick patterns + 28 chart patterns auto-detected. No-code trading bots with broker integration. AI Strategy Lab for ML model training. "Sidekick" AI assistant for chart analysis. Market Scanner across all conditions. Backtesting across 123 candlestick + 28 chart patterns.

| Gap | Severity |
|-----|----------|
| No automated trendline / Fibonacci detection | **High** |
| No chart pattern recognition (28 patterns) | **High** |
| No candlestick pattern detection (123 patterns) | High |
| No multi-timeframe chart overlay | Medium |
| No AI assistant for chart interpretation | Medium |
| No no-code trading bot builder | Low |

---

### 2.14 OpenBB Platform (NEW — Open Source)

**Key Features**: Open-source modular financial ecosystem. ~100 data source integrations. Python API + REST API + Web Workspace + Excel plugin. OpenBB Copilot AI agent for research. "Connect once, consume everywhere" architecture. SOC 2 Type II Enterprise certification (2025). MCP servers for AI agent integration. Standardized data model across providers.

| Gap | Severity |
|-----|----------|
| No multi-data-source integration architecture | Medium |
| No Python/API interface for programmatic access | Low |
| No AI copilot for natural language research | High |
| No Excel/spreadsheet export integration | Low |

---

## 3. Expert Techniques Gap Analysis

### 3.1 CAN SLIM (William O'Neil)

| Criterion | Rule | Status | Notes |
|-----------|------|--------|-------|
| **C** — Current Quarterly EPS | >= 25% YoY | **Partial** | Have earningsGrowth from Yahoo |
| **A** — Annual Earnings Growth | >= 25% for 3–5 years | **Partial** | Have multi-year financials |
| **N** — New High | Near 52W high + catalyst | **YES** | 52W range % + signals |
| **S** — Supply & Demand | Low float, volume on up days | **YES** | Volume ratio + sharesOutstanding |
| **L** — Leader (Relative Strength) | RS >= 80 percentile | **YES** | RS Percentile 1–99 |
| **I** — Institutional Sponsorship | 3–10 quality institutions | **Partial** | Have % owned, not # quality |
| **M** — Market Direction | Confirmed uptrend | **YES** | Market regime detection |

**Status**: 4/7 fully computable, 3/7 partial. CAN SLIM screen implemented.

---

### 3.2 Piotroski F-Score (0–9) — **IMPLEMENTED**

**Status**: All 9 criteria computed from Yahoo quoteSummary financial statements (2-year comparison). Scores 0–9 shown on StockDetail and used in Backtest.

---

### 3.3 Benjamin Graham — **PARTIALLY IMPLEMENTED**

**Status**: Graham Number computed from `√(22.5 × EPS × BookValue)`. Shown on StockDetail with over/undervalued indicator. Full 7-criteria defensive investor screen not yet built as a dedicated page.

---

### 3.4 Warren Buffett Approach — **IMPLEMENTED**

**Status**: Buffett Quality Score (0–5) implemented using ROE, D/E, earnings consistency, margins, and valuation. Shown on StockDetail and used in Backtest.

---

### 3.5 Peter Lynch — PEG Ratio — **PARTIALLY IMPLEMENTED**

**Status**: PEG ratio available from Yahoo API. Shown in StockDetail fundamentals. Full Lynch classification (Slow/Stalwart/Fast/Cyclical/Turnaround/Asset) not implemented.

---

### 3.6 Joel Greenblatt — Magic Formula

| Criterion | Formula | Status | Notes |
|-----------|---------|--------|-------|
| Earnings Yield | EBIT / Enterprise Value | **Partial** | Have EBITDA + EV; need EBIT specifically |
| Return on Capital | EBIT / (NWC + Net Fixed Assets) | **No** | Need detailed balance sheet |
| Combined Rank | Sum of EY rank + ROC rank | **No** | Depends on above |

---

### 3.7 Mark Minervini — SEPA Trend Template — **FULLY IMPLEMENTED**

**Status**: All 8 criteria computed. Dedicated `/minervini` page. Adjustable minimum checks. Integrated with RS Percentile.

---

### 3.8 Martin Zweig (GARP)

| Criterion | Status | Notes |
|-----------|--------|-------|
| Annual EPS Growth >= 20% | **Partial** | Have multi-year financials |
| Quarterly EPS Growth YoY | **Partial** | Have Q/Q |
| Revenue confirms earnings | **Yes** | Have revenue growth |
| P/E < 2× market avg | **Partial** | Have P/E; need market avg |
| D/E below industry avg | **No** | Need industry averages |
| Relative price strength | **Yes** | RS Percentile |
| Insider activity | **Yes** | SEC EDGAR Form 4 |

---

### 3.9 Jesse Livermore — **MOSTLY IMPLEMENTED**

| Principle | Status | Notes |
|-----------|--------|-------|
| Trade with trend | **Yes** | 52W signals, MA alignment |
| Breakout from consolidation | **Yes** | Bollinger squeeze + S/R |
| Volume confirmation | **Yes** | Volume ratio + OBV |
| Normal reaction (pullback) | **Yes** | Support Bounce page |
| Pivotal points | **Yes** | Support & Resistance algo |

---

### Updated Gap Summary Matrix

| Methodology | Criteria | Fully | Partial | Missing | Readiness |
|-------------|----------|-------|---------|---------|-----------|
| **Minervini SEPA** | 8 | 8 | 0 | 0 | **100%** |
| **Livermore** | 5 | 5 | 0 | 0 | **100%** |
| **Piotroski** | 9 | 9 | 0 | 0 | **100%** |
| **Buffett** | 5 | 5 | 0 | 0 | **100%** |
| **CAN SLIM** | 7 | 4 | 3 | 0 | **79%** |
| **Zweig** | 7 | 3 | 3 | 1 | **64%** |
| **Lynch PEG** | 5 | 1 | 2 | 2 | **40%** |
| **Graham** | 7 | 2 | 2 | 3 | **43%** |
| **Magic Formula** | 3 | 0 | 1 | 2 | **17%** |

---

## 4. Current Weaknesses & Improvements

### 4.1 UI/UX Gaps (Updated)

| Issue | Description | Impact | Status |
|-------|-------------|--------|--------|
| ~~No interactive charts~~ | ~~Static price levels~~ | ~~Critical~~ | **DONE** |
| ~~No stock comparison~~ | ~~Can't compare stocks~~ | ~~Medium~~ | **DONE** |
| ~~No watchlist~~ | ~~No saved list~~ | ~~Medium~~ | **DONE** |
| ~~No URL state~~ | ~~Filters lost on refresh~~ | ~~Medium~~ | **DONE** |
| ~~**Mobile responsiveness**~~ | ~~Tables and charts need better mobile layouts~~ | ~~Medium~~ | **DONE** — N28 PWA: pull-to-refresh, swipe nav, offline banner, safe-area padding |
| **No loading skeletons** | Single spinner; no progressive content loading | Low | Open |
| **No keyboard shortcuts** | No k/j navigation, quick search, or shortcut overlay | Low | Open |
| **No stock search on all pages** | Global search bar missing on non-screener pages | Medium | Open |
| **No recently viewed** | No way to quickly return to previously viewed stocks | Low | Open |

### 4.2 Scoring System Improvements (Updated)

| Issue | Status | Notes |
|-------|--------|-------|
| ~~Absolute not relative~~ | **DONE** | Sector z-scores + ranks |
| ~~Style-blind~~ | **DONE** | Value/Blend/Growth classification |
| ~~No confidence indicator~~ | **DONE** | Data completeness % |
| ~~Shallow sentiment~~ | **DONE** | FinBERT AI + finance lexicon |
| ~~No score history~~ | **DONE** | 90-day daily tracking |
| **Risk too simple** | Open | Beta + Volatility misses drawdown, Sharpe, Sortino |
| ~~No sector rotation~~ | **DONE** | RRG-style quadrant chart |
| **No forward-looking component** | Open | Score is current state; need predictive element |
| **No score confidence interval** | Open | No uncertainty band on composite score |

### 4.3 Missing Fundamental Metrics (Updated)

Most metrics from the original gap list are now **DONE**. Remaining gaps:

| Metric | Why It Matters | Status |
|--------|---------------|--------|
| **ROIC** | Capital allocation quality (Buffett, Greenblatt) | Not computed |
| **Altman Z-Score** | Bankruptcy prediction (Stock Rover feature) | Not computed |
| **Beneish M-Score** | Earnings manipulation detection | Not computed |
| **Earnings Quality Score** | Accruals ratio, cash vs reported earnings | Not computed |
| **Industry-relative metrics** | Metrics relative to industry avg (not just sector) | Not computed |

---

## 5. Prioritised Feature Roadmap

### All Previously Planned Items — Completion Status

#### Priority 1 (Quick Wins) — ALL DONE
Q1 RS Percentile, Q2 Minervini Screen, Q3 Radar Chart, Q4 Heat Map, Q5 Sector Performance, Q6 Watchlist, Q7 URL State, Q8 Data Completeness, Q9 Stock Comparison, Q10 Multi-Timeframe Labels, Q11 Score Sparkline, Q12 CSV Export — **ALL SHIPPED**.

#### Priority 2 (Medium Effort) — ALL DONE
M1 SMA 150, M2 Expanded Fundamentals, M3 PEG Ratio, M4 Enterprise Value, M5 CAN SLIM, M6 Style Classification, M7 Sector-Relative Scoring, M8 Market Regime, M9 Acc/Dist Rating, M10 52W Range, M11 Consolidation Detection, M12 S/R Levels, M13 Candlestick Chart, M14 Weighted Alpha, M15 Score History — **ALL SHIPPED**.

#### Priority 3 (Large Effort) — Mostly Done
| # | Feature | Status |
|---|---------|--------|
| L1 | Financial Statements API | **DONE** |
| L2 | Piotroski F-Score | **DONE** |
| L3 | Graham Number & DCF Lite | **DONE** |
| L4 | Custom Screen Builder | **DONE** |
| L5 | Insider Trading (SEC EDGAR) | **DONE** |
| L6 | Strategy Backtest | **DONE** |
| L7 | Options Flow | Skipped — no free data |
| L8 | Dividend History + AI Summaries | **DONE** |
| L9 | Alert System (Telegram) | **DONE** |
| L10 | Portfolio Tracker | **DONE** |
| L11 | Backtest Engine | **DONE** |
| L12 | Pre-Built Screens | **DONE** (Minervini, CAN SLIM) |
| L13 | AI-Enhanced Sentiment (FinBERT) | **DONE** |
| L14 | Short Interest | Partial — have shortPercentOfFloat |

### Recently Shipped (February 2026 — Batch 8)

| Feature | Status | Notes |
|---------|--------|-------|
| **AI Research Notes (HuggingFace)** | **DONE** | ETL generates AI research notes for top 100 stocks via Qwen 2.5 7B Instruct. Stored in `ai-research-notes.json`. Dashboard shows "AI-Generated" badge (accent) or "Rule-Based" badge (grey). Falls back to rule-based generator when unavailable. |

---

## 6. New Feature Ideas from 2026 Research

Based on competitive analysis and expert technique research conducted February 2026.

### Tier 1 — High Impact, Achievable (Next Sprint)

| # | Feature | Description | Why | Effort |
|---|---------|-------------|-----|--------|
| **N1** | ~~Natural Language Stock Query~~ | **DONE** — Client-side keyword parser on `/query` page. 10 example queries, covers cap/sector/fundamentals/technicals/expert screens. | Seeking Alpha Ask AI, Koyfin, Intellectia.ai all offer this. | ~~Medium~~ |
| **N2** | ~~Factor Grades (A+ to F)~~ | **DONE** — Percentile-based A+ to F across 5 factors + overall. Displayed as grade card on StockDetail. | Seeking Alpha's most-loved feature. | ~~Low~~ |
| **N3** | ~~Altman Z-Score~~ | **DONE** — Computed from financial statements. Safe/grey/distress zones in Expert Screens. | Stock Rover has it. | ~~Low~~ |
| **N4** | ~~Risk-Adjusted Returns~~ | **DONE** — Sharpe ratio, Sortino ratio, max drawdown (1Y) from daily OHLCV. New section on StockDetail. | Every serious platform offers this. | ~~Low~~ |
| **N5** | ~~Position Sizing Calculator~~ | **DONE** — Fixed-% and Half-Kelly criterion calculators on Portfolio page. Input: capital, risk %, entry/stop or win rate/avg win/loss. | TradingView has this. Common retail request. | ~~Low~~ |
| **N6** | ~~Additional Technical Indicators~~ | **DONE** — ADX/DI+/DI- (14), Williams %R (14), Chaikin Money Flow (20). Uses real OHLCV highs/lows. Shown in Advanced Indicators. | IBD uses ADX heavily. | ~~Medium~~ |
| **N7** | ~~Earnings Post-Drift Analysis~~ | **DONE** — 1/5/20-day returns after last earnings date. Separate card on StockDetail. | Earnings Whispers charges for this. | ~~Medium~~ |
| **N8** | ~~SMR Rating (IBD-style)~~ | **DONE** — Sales growth + Operating Margin + ROE → A–E rating. Shown in Expert Screens. | IBD feature. | ~~Low~~ |

### Tier 2 — Medium Impact, Medium Effort (Backlog)

| # | Feature | Description | Why | Effort |
|---|---------|-------------|-----|--------|
| **N9** | ~~Chart Pattern Recognition~~ | **DONE** — Swing-point analysis on 60-day data. Detects double top/bottom, ascending/descending triangles, bull/bear flags with confidence scores. | TrendSpider has 28 patterns. ChartPatterns.ai has 16. | ~~High~~ |
| **N10** | ~~Candlestick Pattern Detection~~ | **DONE** — 13 candlestick patterns via `technicalindicators` library: engulfing, doji, hammer, shooting star, morning/evening star, harami, marubozu. Shown as badges on StockDetail. | TrendSpider has 123 patterns. | ~~Medium~~ |
| **N11** | ~~AI Copilot Chat~~ | **DONE** — Hybrid chat on StockDetail + standalone `/copilot` page. Client-side Q&A engine (~20 query types: score, signals, compare, valuation, risk, technicals, fundamentals) with HuggingFace Mistral-7B LLM fallback for open-ended questions. API key stored in localStorage. | OpenBB Copilot, Seeking Alpha Ask AI, StockyPie. Growing expectation in 2026. | ~~High~~ |
| **N12** | ~~Predictive Scoring~~ | **DONE** — ETL pipeline computes predicted score (0-100) using linear regression on score history, acceleration, mean reversion, and technical support factors (RSI, MACD, volume, SMA alignment). Direction (improving/stable/declining) + confidence (low/medium/high) with R² metric. PredictiveScoreCard on StockDetail. | Danelfin's core feature. | ~~High~~ |
| **N13** | ~~Theme/Sector Tagging~~ | **DONE** — Static ticker-to-theme mapping: AI, Cloud, Cybersecurity, Clean Energy, EV, Semiconductors, Fintech, Biotech, etc. + sector fallback. Theme badges shown in stock header. | Finviz 2026 feature. | ~~Medium~~ |
| **N14** | ~~Ichimoku Cloud~~ | **DONE** — Full Ichimoku system (Tenkan-sen 9, Kijun-sen 26, Senkou A/B, displacement 26) with signal detection (above/below/in cloud). Displayed as 5-column card on StockDetail. | Standalone trading system. | ~~Medium~~ |
| **N15** | **Multi-Widget Dashboard** ✅ | Customisable dashboard layout: drag-and-drop cards for score, chart, news, signals | Koyfin's signature feature. Bloomberg-style. | High |
| **N16** | **Volume Profile** ✅ | VPOC (Volume Point of Control), Value Area High/Low from OHLCV | Used by professional traders. Shows where most volume traded. Extends S/R analysis. | Medium |
| **N17** | ~~Beneish M-Score~~ | **DONE** — 8-variable M-Score (DSRI, GMI, AQI, SGI, DEPI, SGAI, TATA, LVGI) from financial statements. Zones: unlikely/possible/likely manipulator. In Expert Screens. | Stock Rover feature. | ~~Low~~ |

### Tier 3 — Lower Priority / High Effort (Future)

| # | Feature | Description | Why | Effort |
|---|---------|-------------|-----|--------|
| **N18** | **Social Sentiment (Reddit)** ✅ | Aggregate social buzz: r/wallstreetbets, r/stocks, r/investing | Reddit JSON API. FinBERT sentiment scoring on post titles. | High |
| **N19** | **Macro Overlay** ✅ | VIX, 10Y/2Y Treasury, yield spread, DXY, Fed Funds Rate on Overview. FRED API. | Professional feature. FRED API (free) for macro data. | Medium |
| **N20** | **Options Sentiment Proxy** | Put/Call ratio per stock from available sources. Max pain calculations. | No free real-time source. Could scrape Yahoo Options chain periodically. | High |
| **N21** | ~~Economic Calendar~~ | **DONE** — Hardcoded FOMC, CPI, NFP, GDP, earnings season, quad-witching dates for 2025-2026. Color-coded by category with impact indicators. New `/economic-calendar` page. | Free standalone page. | ~~Medium~~ |
| **N22** | ~~Global Coverage Expansion~~ | **DONE** — Added 5 new markets: India (NSE+BSE, ~58 stocks), Germany (DAX 40), France (CAC 40, ~30), Japan (Nikkei 225 top ~40), Hong Kong (Hang Seng top ~30). Multi-currency support (₹, €, ¥, HK$). Market regime for Nifty 50, DAX, Nikkei 225. Market filter expansion in Screener. Color-coded MarketTags per market. | 7 markets, ~870 stocks total. | ~~High~~ |
| **N23** | ~~Paper Trading Mode~~ | **DONE** — Tab on Portfolio page with $100K virtual cash. Buy/sell trades, open positions with close button, closed trades history, performance metrics (win rate, profit factor, avg win/loss, max drawdown). localStorage persistence, ticker search with auto-fill prices. | TradingView has this. Educational value. | ~~Medium~~ |
| **N24** | **Weighted Screener** | User-defined weights for multi-factor screening (like Stock Rover) | Stock Rover's #1 feature for power users. | Medium |
| **N25** | ~~ESG Scores~~ | **DONE** — ESG risk scores from Yahoo Finance `esgScores` quoteSummary module. Total ESG, Environmental, Social, Governance sub-scores with color-coded bars. ESG percentile. ESG card on StockDetail page. ESG column in Screener. ESG fields in AI Builder reference and Copilot context. | Lower = better risk. 0-10 Negligible, 10-20 Low, 20-30 Medium, 30-40 High, 40+ Severe. | ~~Medium~~ |
| **N26** | ~~Trade Journal & Analytics~~ | **DONE** — Strategy tags, emotional state tracking, entry/exit reasoning on paper trades. Post-trade review with rating system. Journal Analytics dashboard with recharts: win rate by strategy, P&L by emotional state, trade frequency, win/loss streaks, strategy distribution. | Professional trading practice. | ~~Medium~~ |
| **N27** | ~~Real-Time Price Streaming~~ | **DONE** — Finnhub WebSocket integration for live US market prices. Encrypted API key storage, connection status badge in header, price flash animations (green/red), batched state updates (500ms), exponential backoff reconnection, market hours detection. | Core trading feature. | ~~High~~ |
| **N28** | ~~PWA Mobile Enhancement~~ | **DONE** — Stale-while-revalidate service worker (v2), offline banner with cached data age, pull-to-refresh gesture, swipe navigation between tabs, safe-area padding for notched devices, manifest shortcuts, maskable icons. | Mobile-first trading experience. | ~~Medium~~ |
| **N29** | ~~Chart Replay / Historical Backtest~~ | **DONE** — New `/chart-replay` page. Step through daily candles one at a time with SMA 20/50/200 overlays and RSI sub-panel updating live. Buy/Sell/Skip decision buttons with notes, decision log, auto-play with 1x/2x/5x speed. Summary modal shows user return vs buy-and-hold, win rate, completed trades. | Educational practice tool. TradingView has similar. | ~~High~~ |
| **N30** | ~~AI-Powered Indicator Builder~~ | **DONE** — New `/indicator-builder` page. Describe screening rules in plain English, AI generates a JavaScript filter function via configured LLM provider (Groq/OpenAI/Gemini/Anthropic/etc.). Runs filter against all stocks with results table. Edit mode for manual tweaks. Save/load custom indicators to localStorage. Field reference panel. Example quick-click suggestions. | Differentiator vs TradingView/Finviz. | ~~High~~ |
| **N31** | ~~Portfolio Risk Analytics~~ | **DONE** — New "Risk Analytics" tab on Portfolio page. Summary cards: VaR (95%/99%), CVaR, Portfolio Beta, Sharpe Ratio, Max Drawdown. Monte Carlo fan chart (500 sims × 252 days with p5/p25/p50/p75/p95 bands). Sector concentration pie chart. Drawdown chart (recharts AreaChart). Risk contribution table per holding (weight, volatility, beta). Beginner explanations toggle. | Professional portfolio analytics. | ~~Medium~~ |

---

### Updated Implementation Priority Map

```
DONE (Shipped Feb 2026)             DONE (Batch 5–6, Mar 2026)           DONE (Batch 7) / LATER
───────────────────                 ──────────────────────               ──────────────
✅ N1  NL Stock Query             ✅ N11 AI Copilot Chat                ✅ N22 Global Expansion (7 markets)
✅ N2  Factor Grades              ✅ N12 Predictive Scoring             ✅ N25 ESG Scores
✅ N3  Altman Z-Score             ✅ N23 Paper Trading                  N20 Options Sentiment
✅ N4  Risk-Adjusted Returns      ✅ N26 Trade Journal & Analytics
✅ N5  Position Sizing Calculator ✅ N27 Real-Time Price Streaming
✅ N6  ADX/Williams/CMF           ✅ N28 PWA Mobile Enhancement
✅ N7  Earnings Post-Drift        ✅ N29 Chart Replay
✅ N8  SMR Rating                 ✅ N30 AI Indicator Builder
✅ N9  Chart Pattern Recognition  ✅ N31 Portfolio Risk Analytics
✅ N10 Candlestick Patterns
✅ N13 Theme Tagging
✅ N14 Ichimoku Cloud
✅ N15 Multi-Widget Dashboard
✅ N16 Volume Profile
✅ N17 Beneish M-Score
✅ N18 Social Sentiment
✅ N19 Macro Overlay
✅ N21 Economic Calendar
✅ N24 Weighted Screener
```

---

### Updated Impact vs Effort Matrix

```
                        LOW EFFORT ◄──────────────────────► HIGH EFFORT
                        │                                          │
  HIGH IMPACT           │  ✅ N22 Global Expansion (DONE)          │
                        │  ✅ N25 ESG Scores (DONE)                │
  MEDIUM IMPACT         │                                          │  N20 Options Sentiment
                        │                                          │

All N-series through N31 are now DONE except N20.
```

---

### Recommended Next Actions

> **Batches 1–7 shipped Feb–Mar 2026.** Batch 7 added N22 Global Coverage (7 markets, ~870 stocks) and N25 ESG Scores. Only 1 N-series feature remains (N20).

1. **N20 — Options Sentiment** — Put/call ratio, unusual options activity, max pain price from options chain data. Scrape Yahoo Options chain or use CBOE data. **Medium effort, requires options data source.**

---

### Shipped Features Summary

| Category | Shipped | Total Planned | Completion |
|----------|---------|---------------|------------|
| Quick Wins (Q-series) | 14 | 14 | **100%** |
| Medium Effort (M-series) | 17 | 17 | **100%** |
| Large Effort (L-series) | 12 | 14 | **86%** |
| Expert Methodologies | 5 of 9 | 9 | **56%** |
| New Features (N-series) | 30 of 31 | 31 | **97%** |
| **Total features shipped** | **77+** | — | — |

---

### Research Sources

- [TradingView What's New](https://www.tradingview.com/support/whats-new/)
- [Top AI Trading Tools 2026 — Pragmatic Coders](https://www.pragmaticcoders.com/blog/top-ai-tools-for-traders)
- [Koyfin Best Stock Screeners 2026](https://www.koyfin.com/blog/best-stock-screeners/)
- [Koyfin vs Finviz Elite 2026 — TraderHQ](https://traderhq.com/koyfin-vs-finviz/)
- [Stock Rover Review 2026 — StockBrokers.com](https://www.stockbrokers.com/review/tools/stockrover)
- [Seeking Alpha Quant Ratings FAQ](https://seekingalpha.com/article/4263303-quant-ratings-and-factor-grades-faq)
- [Seeking Alpha Ask AI Updates Nov 2025](https://seekingalpha.com/article/4846603-new-updates-to-ask-seeking-alpha)
- [Simply Wall St What's New](https://support.simplywall.st/hc/en-us/articles/7894830045199-What-s-New)
- [Simply Wall St Review 2026 — The Stock Dork](https://www.thestockdork.com/simply-wall-st-review/)
- [Finviz New Maps Feature](https://finviz.com/blog/new-stock-market-maps-for-market-cap-52-week-highs-lows-themes-and-insider-trading/)
- [Danelfin How It Works](https://danelfin.com/how-it-works)
- [Danelfin Review 2026 — WallStreetZen](https://www.wallstreetzen.com/blog/danelfin-review/)
- [TrendSpider Automated Technical Analysis](https://trendspider.com/product/)
- [TrendSpider Chart Pattern Recognition](https://help.trendspider.com/kb/automated-technical-analysis/automated-chart-pattern-recognition)
- [OpenBB Platform — GitHub](https://github.com/OpenBB-finance/OpenBB)
- [OpenBB Terminal Features](https://www.openbb.co/products/terminal)
- [ChartPatterns.ai Pattern Recognition](https://chartpatterns.ai/)
- [Top Chart Pattern Recognition Tools 2026 — Liberated Stock Trader](https://www.liberatedstocktrader.com/candlestick-pattern-analysis-recognition-software/)
- [AI Stock Screeners 2026 — WallStreetZen](https://www.wallstreetzen.com/blog/best-ai-stock-screener/)
- [Best AI Stock Research Tools 2026 — WallStreetZen](https://www.wallstreetzen.com/blog/best-ai-stock-research-tools/)
- [Intellectia.ai AI Screener](https://intellectia.ai/features/ai-screener)
- [Earnings Whispers — Post-Earnings Drift](https://www.earningswhispers.com/about-pead)
- [Factor Investing — Alpha Architect](https://alphaarchitect.com/momentum-factor-investing/)
- [Q3 2025 Factor Performance — Confluence](https://www.confluence.com/q3-2025-factor-performance-analysis/)
- [Kelly Criterion for Trading — BacktestBase](https://www.backtestbase.com/education/how-much-risk-per-trade)
- [UnusualWhales Scanner — LuxAlgo](https://www.luxalgo.com/blog/unusualwhales-scanner-sweeps-flow-and-edge/)
- [BlackBox Stocks AI Features](https://www.pragmaticcoders.com/blog/top-ai-tools-for-traders)
- [YOLOv8 Stock Pattern Detection — HuggingFace](https://huggingface.co/foduucom/stockmarket-pattern-detection-yolov8)

---

*This document should be reviewed and updated quarterly as features are shipped and new competitive features emerge.*
