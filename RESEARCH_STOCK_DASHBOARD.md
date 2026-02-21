# Stock Dashboard Research: Platforms, Prediction Techniques & Improvements

**Research Date:** February 21, 2026

---

## TABLE OF CONTENTS

1. [Similar Free Stock Analysis Dashboards & Tools](#1-similar-free-stock-analysis-dashboards--tools)
2. [Stock Prediction Techniques Used by Professionals](#2-stock-prediction-techniques-used-by-professionals)
3. [Specific Improvements for the Current Dashboard](#3-specific-improvements-for-the-current-dashboard)

---

## 1. SIMILAR FREE STOCK ANALYSIS DASHBOARDS & TOOLS

### 1.1 TradingView
- **URL:** https://www.tradingview.com
- **Type:** Commercial (Free tier + Paid)
- **Key Features:**
  - Advanced charting with 100+ technical indicators
  - Dedicated screeners for stocks, forex, bonds, ETFs, crypto
  - Pattern recognition features (auto-detect chart patterns)
  - Community-driven ideas and strategies (social trading)
  - Pine Script for custom indicator creation
  - Real-time data and alerts
- **What Makes It Good:** Best-in-class charting, massive community of traders sharing ideas, beginner-friendly UI, cross-asset coverage
- **Pricing:** Free basic plan | Pro $14.95/mo | Pro+ $29.95/mo | Premium $59.95/mo

### 1.2 Finviz (Financial Visualizations)
- **URL:** https://finviz.com
- **Type:** Commercial (Free tier + Paid)
- **Key Features:**
  - Lightning-fast stock screener with 60+ filters
  - Heat maps for market overview (sector, S&P 500, world)
  - Technical chart patterns detection
  - Insider trading data
  - IPO date and outstanding shares filtering (rare feature)
  - News aggregation per stock
  - Futures and forex data
- **What Makes It Good:** Extremely fast screening, powerful visual heat maps, comprehensive filter set including fundamentals + technicals + chart patterns
- **Pricing:** Free (data delayed 3-5 min) | Finviz Elite $39.50/mo or $299.50/yr (real-time data, backtesting, alerts)

### 1.3 OpenBB
- **URL:** https://openbb.co
- **Type:** Open Source (Free)
- **Key Features:**
  - Most popular open-source finance project on GitHub
  - Python-based terminal for financial research
  - Integrates internal and third-party data sources
  - Custom stock screener (uses Finviz under the hood)
  - Can be deployed on-premises or in private cloud
  - Web-based UI to manage configuration and API keys
  - Extensible with custom Python scripts and models
- **What Makes It Good:** Fully open source, incredibly extensible, Python-native (great for quant research), self-hostable for privacy, integrates with dozens of data providers
- **Pricing:** Free and open source

### 1.4 Yahoo Finance
- **URL:** https://finance.yahoo.com
- **Type:** Commercial (Free tier + Paid)
- **Key Features:**
  - Stock screener with fundamental and technical filters
  - ESG/sustainable stock screening (rare free feature)
  - Portfolio tracking
  - Real-time quotes and news
  - Interactive charts with basic technical indicators
  - Earnings calendar, analyst recommendations
- **What Makes It Good:** Clean interface, massive data coverage, ESG screening, widely trusted, good for beginners
- **Pricing:** Free | Yahoo Finance Plus $24.99/mo (enhanced data, advanced charts)

### 1.5 Barchart
- **URL:** https://www.barchart.com
- **Type:** Commercial (Free tier + Paid)
- **Key Features:**
  - Stock screener by sector, fundamentals, technicals, opinions
  - Pre-built screens: "100% Buy Signals" (13 technical indicators) and "100% Sell Signals"
  - Options screener and unusual activity
  - Signal-based ranking system
  - Futures and commodities data
- **What Makes It Good:** Signal aggregation across 13 indicators for bullish/bearish classification, options data included free, comprehensive commodity/futures coverage
- **Pricing:** Free basic | Barchart Premier (paid, advanced features)

### 1.6 Stock Analysis
- **URL:** https://stockanalysis.com
- **Type:** Commercial (Free tier + Paid)
- **Key Features:**
  - Clean, uncluttered stock screener
  - Tooltips explaining complex financial terms
  - Financial statements (income, balance sheet, cash flow)
  - IPO calendar
  - Analyst estimates and ratings
  - ETF screener
- **What Makes It Good:** User-friendly, less cluttered than competitors, great for learning (tooltips), solid fundamental data
- **Pricing:** Free | Pro tier available

### 1.7 Zacks Investment Research
- **URL:** https://www.zacks.com
- **Type:** Commercial (Free tier + Paid)
- **Key Features:**
  - 130+ data points for screening
  - Proprietary Zacks Rank (1-5 scale based on earnings revisions)
  - Earnings estimates, revisions, and surprises data
  - Style scores (Value, Growth, Momentum, VGM)
  - Pre-built screens by strategy
- **What Makes It Good:** Zacks Rank is a proven system focused on earnings revisions (historically one of the strongest predictors of stock performance), deep earnings data
- **Pricing:** Free basic | Zacks Premium $249/yr

### 1.8 SwingTradeBot
- **URL:** https://swingtradebot.com
- **Type:** Commercial (Free tier)
- **Key Features:**
  - Bullish and bearish stock screens
  - Japanese Candlestick pattern detection
  - Moving average cross signals
  - Price breakout detection
  - Consolidation and squeeze detection
  - Alert system for pattern triggers
- **What Makes It Good:** Specifically designed for swing traders, focuses on actionable pattern-based signals rather than raw data, clear bullish/bearish categorization
- **Pricing:** Free basic | Premium available

### 1.9 Intellectia AI
- **URL:** https://intellectia.ai
- **Type:** Commercial (Free tier)
- **Key Features:**
  - AI-driven stock screener
  - Natural language query interface (ask questions in plain English)
  - Real-time market scanning
  - Bullish/bearish predictions for tomorrow, 1 week, 1 month
  - Sentiment analysis integration
- **What Makes It Good:** Natural language interface is revolutionary for non-technical users, AI-driven predictions with time horizons, real-time scanning
- **Pricing:** Free tier available | Premium for advanced features

### 1.10 WallStreetZen
- **URL:** https://www.wallstreetzen.com
- **Type:** Commercial (Free tier + Paid)
- **Key Features:**
  - Stock screener with Pass/Fail criteria system
  - High/Medium/Low qualitative filtering
  - Pre-built "Stock Ideas" library
  - AI stock analysis feature
  - Quantitative and qualitative criteria combined
  - Zen Score (proprietary overall rating)
- **What Makes It Good:** Unique Pass/Fail approach simplifies complex analysis, combines quantitative data with qualitative assessment, clean modern UI
- **Pricing:** Free basic | Premium available

### Notable Open-Source Projects (GitHub)

| Project | Description | Stars |
|---------|-------------|-------|
| **Stocksight** (github.com/shirosaidev/stocksight) | Elasticsearch + Twitter + News sentiment analysis | Popular |
| **Ghostfolio** (github.com/ghostfolio/ghostfolio) | Wealth management (Angular + NestJS + Prisma) | 4k+ |
| **Wealthfolio** (wealthfolio.app) | Private, offline portfolio tracker with built-in AI | Growing |

---

## 2. STOCK PREDICTION TECHNIQUES USED BY PROFESSIONALS

### 2.1 Technical Analysis Methods (Beyond Basic RSI/MACD/SMA)

#### A. Advanced Oscillators & Momentum Indicators

| Indicator | Description | Use Case |
|-----------|-------------|----------|
| **Stochastic Oscillator** | Compares recent close to range of prices over a period; assumes uptrends close near highs, downtrends near lows | Overbought/oversold detection, divergence signals |
| **Commodity Channel Index (CCI)** | Shows stock's variation from its "typical" price | Trend strength and reversal detection |
| **ConnorsRSI** | Composite of RSI + Rate of Change + Up/Down Length | Short-term trade signals (more responsive than standard RSI) |
| **Coppock Curve** | Uses rate-of-change + weighted moving average | Long-term momentum, bottom identification |
| **Price Momentum Oscillator (PMO)** | Tracks rate of change with smoothing | Advanced momentum measurement |
| **True Strength Index (TSI)** | Measures trend direction + overbought/oversold | Trend confirmation with fewer false signals |
| **Vortex Indicator** | Identifies start of new trends | Trend initiation signals |
| **Williams %R** | Similar to stochastic but inverted scale | Fast overbought/oversold readings |

#### B. Volatility & Channel Indicators

| Indicator | Description | Use Case |
|-----------|-------------|----------|
| **Bollinger Bands** | Moving average +/- 2 standard deviations | Volatility measurement, squeeze detection, mean reversion |
| **Keltner Channels** | ATR-based channels around EMA | Volatility breakouts (especially combined with Bollinger) |
| **Average True Range (ATR)** | Measures security volatility | Position sizing, stop-loss placement (2x ATR rule) |
| **Bollinger Band Width** | Measures distance between bands | Squeeze detection (low volatility before breakouts) |
| **Donchian Channels** | Highest high and lowest low over N periods | Breakout trading (used by Turtle Traders) |

#### C. Comprehensive/Multi-Component Indicators

| Indicator | Description | Use Case |
|-----------|-------------|----------|
| **Ichimoku Cloud** | 5 lines defining support/resistance, trend, momentum + future projections | All-in-one: trend, momentum, support/resistance, AND forward-looking levels (unique) |
| **Elder Ray Index** | Combines EMA with Bull/Bear Power | Measures buying/selling pressure relative to trend |
| **TRIX** | Triple-smoothed exponential moving average | Eliminates noise, shows underlying trend momentum |

#### D. Volume-Based Indicators

| Indicator | Description | Use Case |
|-----------|-------------|----------|
| **On-Balance Volume (OBV)** | Cumulative volume flow (up days add, down days subtract) | Confirms price trends with volume; divergences signal reversals |
| **Volume-Weighted Average Price (VWAP)** | Average price weighted by volume | Institutional benchmark, intraday support/resistance |
| **Accumulation/Distribution Line** | Combines price position within range with volume | Detects institutional buying/selling |
| **Chaikin Money Flow (CMF)** | Measures accumulation/distribution over a period | Money flow into/out of a security |
| **Money Flow Index (MFI)** | Volume-weighted RSI | "Volume RSI" - more reliable overbought/oversold signals |
| **Volume Profile** | Volume distribution at each price level | Identifies high-volume nodes (support/resistance) |

#### E. Chart Pattern Recognition (Automated)

- **Head and Shoulders / Inverse H&S** -- Reversal patterns
- **Double Top / Double Bottom** -- Reversal patterns
- **Cup and Handle** -- Continuation pattern
- **Ascending/Descending Triangles** -- Breakout patterns
- **Bull/Bear Flags** -- Continuation patterns
- **Wedges (Rising/Falling)** -- Reversal/continuation patterns
- **Japanese Candlestick Patterns:** Doji, Engulfing, Hammer, Shooting Star, Morning/Evening Star, Three White Soldiers, Three Black Crows

### 2.2 Fundamental Analysis Approaches

#### A. Core Valuation Metrics

| Metric | Formula | Why It Matters |
|--------|---------|----------------|
| **P/E Ratio (Trailing & Forward)** | Price / EPS | Basic valuation; compare against sector peers |
| **PEG Ratio** | P/E / Expected Growth Rate | Peter Lynch's favorite; accounts for growth (PEG < 1 = undervalued) |
| **P/FCF (Price to Free Cash Flow)** | Price / FCF per share | Superior to P/E; professionals prefer it because cash flow can't be easily manipulated like earnings |
| **FCF Yield** | Free Cash Flow / Enterprise Value | Higher = more attractive; best holistic measure of financial health |
| **EV/EBITDA** | Enterprise Value / EBITDA | Better than P/E for comparing companies with different capital structures |
| **P/B (Price to Book)** | Price / Book Value per Share | Value investing staple; P/B < 1 may indicate undervaluation |
| **P/S (Price to Sales)** | Price / Revenue per Share | Useful for unprofitable growth companies |
| **Dividend Yield** | Annual Dividend / Price | Income investing metric |

#### B. Earnings Quality & Growth Metrics

- **Earnings Revisions** -- Zacks' core insight: stocks with upward earnings revisions tend to outperform. Track analyst estimate changes over 30/60/90 days
- **Earnings Surprise History** -- Consistent beats suggest management under-promises and over-delivers
- **Revenue Growth Rate** (YoY, QoQ)
- **EPS Growth Rate** (YoY, QoQ)
- **Operating Margin Trend** -- Expanding margins = improving efficiency
- **Return on Equity (ROE)** -- Measures profitability relative to shareholder equity
- **Return on Invested Capital (ROIC)** -- Measures how well a company generates cash flow relative to all capital invested
- **Debt-to-Equity Ratio** -- Financial health/leverage indicator

#### C. Institutional & Insider Activity

- **Institutional Ownership %** -- High ownership = "smart money" confidence
- **Institutional Buying/Selling** (13F filings) -- Track hedge fund moves quarterly
- **Insider Buying/Selling** (SEC Form 4) -- Insiders buying is a strong bullish signal (they know the company best)
- **Short Interest / Short Float %** -- High short interest = bearish sentiment or potential short squeeze

### 2.3 Quantitative/Algorithmic Strategies

#### A. Core Strategy Categories

**1. Momentum Strategy**
- Buy securities showing upward price trends, sell those in downtrends
- **Time-Series Momentum:** Is the asset doing better than its own past?
- **Cross-Sectional Momentum:** Is the asset outperforming its peer group?
- Works best in 3-12 month timeframes
- Risk: Prone to severe crashes during market reversals

**2. Mean Reversion Strategy**
- Identify assets that deviated significantly from historical average
- Bet on return to the mean
- Works best in short-term (< 3 months)
- Opposite of momentum; the two strategies are often mutually exclusive

**3. Factor Investing**
- Invest based on specific "factors" that drive returns:
  - **Value Factor:** Low P/E, P/B stocks outperform
  - **Size Factor:** Small caps outperform large caps long-term
  - **Quality Factor:** High ROE, low debt companies outperform
  - **Low Volatility Factor:** Less volatile stocks offer better risk-adjusted returns
  - **Momentum Factor:** Recent winners continue winning

**4. Statistical Arbitrage (Pairs Trading)**
- Find two correlated stocks
- When correlation breaks, go long the underperformer, short the outperformer
- Profit from mean reversion of the pair's spread

**5. Event-Driven Strategies**
- Trade around earnings announcements
- Trade around M&A activity
- Insider buying triggers
- FDA approvals (biotech)
- Index rebalancing (forced buying/selling)

#### B. Alternative Data Sources (Quant Edge)

- **Options Flow:** Unusual options activity indicates smart money positioning
- **Dark Pool Prints:** Large block trades in dark pools signal institutional moves; blocks >= 30% of daily average volume are especially significant
- **Social Media Sentiment:** Reddit (WallStreetBets), Twitter/X, StockTwits
- **Satellite Imagery:** Parking lot counts, shipping activity
- **Web Traffic Data:** Website visits as proxy for revenue
- **Credit Card Transaction Data:** Real-time spending trends
- **SEC Filing NLP:** Analyze 10-K, 10-Q filings for tone changes
- **Earnings Call Transcripts:** NLP analysis of management tone and word choice

### 2.4 Sentiment Analysis Approaches

#### A. Lexicon/Dictionary-Based (Simple)

| Method | Description | Limitation |
|--------|-------------|------------|
| **AFINN** | Word-level sentiment scores (-5 to +5) | No financial context; "bull" and "bear" not understood financially |
| **VADER** | Valence Aware Dictionary, handles social media text | Better with slang/emoji but still not finance-specific |
| **Loughran-McDonald Dictionary** | Finance-specific word lists (positive, negative, uncertainty, litigious, constraining) | Designed for SEC filings; much better for financial text than general dictionaries |

#### B. Machine Learning / Deep Learning (Advanced)

| Method | Description | Advantage |
|--------|-------------|-----------|
| **FinBERT** | BERT model fine-tuned on financial corpus (ProsusAI/finbert on HuggingFace) | Understands financial context; outputs positive/negative/neutral probabilities. Domain-specific and far superior to AFINN |
| **GPT-4 / LLM-based** | Use large language models to classify sentiment | Highest contextual understanding; can handle nuance, sarcasm, complex sentences |
| **RoBERTa (Fine-tuned)** | RoBERTa variant trained on financial text | Strong alternative to FinBERT |
| **Graph Neural Networks (GNN)** | Model relationships between entities, sentiments, and stocks | Captures complex interconnections in market data |

#### C. Multi-Source Sentiment Aggregation

- **News Headlines** -- Financial news sentiment (Reuters, Bloomberg, Yahoo Finance)
- **Social Media** -- Twitter/X, Reddit, StockTwits
- **Earnings Call Transcripts** -- Management tone analysis
- **SEC Filings** -- 10-K/10-Q language analysis for risk indicators
- **Analyst Reports** -- Consensus sentiment from Wall Street
- **Google Trends** -- Search interest as proxy for retail sentiment
- **Fear & Greed Index** -- CNN's market-wide sentiment gauge

### 2.5 Machine Learning Approaches for Stock Prediction

#### A. Traditional ML Models

| Model | Use Case | Notes |
|-------|----------|-------|
| **Random Forest** | Classification (up/down) + feature importance | Good baseline; handles non-linear relationships; provides feature importance ranking |
| **Gradient Boosted Trees (XGBoost, LightGBM, CatBoost)** | Classification and regression | Often best-performing traditional ML model for tabular financial data |
| **Support Vector Machines (SVM)** | Classification | Research shows 60.52% excess return in backtesting |
| **Logistic Regression** | Classification | Simple baseline; surprisingly competitive |
| **Naive Bayes** | Sentiment classification | Fast, works well with text data |

#### B. Deep Learning Models

| Model | Use Case | Notes |
|-------|----------|-------|
| **LSTM (Long Short-Term Memory)** | Time-series price prediction | Learns order dependence in sequences; most popular for stock prediction |
| **Attention-LSTM** | Time-series with feature weighting | Superior to standard LSTM; assigns different weights to input features |
| **CNN (1D-Convolutional)** | Pattern recognition in price data | Detects local patterns (similar to chart pattern recognition) |
| **Hybrid CNN-LSTM** | Combined pattern + temporal learning | CNN extracts features, LSTM models temporal dependencies |
| **Transformer Models** | Sequence modeling with self-attention | Can model long-range dependencies better than LSTM |
| **GAN (Generative Adversarial Networks)** | Synthetic data generation + prediction | Can generate realistic market scenarios for training |

#### C. Ensemble & Hybrid Approaches

- **Stacked Models:** Train multiple models, use a meta-learner to combine predictions
- **Anomaly Detection + Prediction:** Detect unusual market behavior, then apply prediction models
- **Multi-Modal Fusion:** Combine price data + sentiment + fundamentals + alternative data in a single model
- **Reinforcement Learning:** Train agents to make buy/sell/hold decisions by maximizing portfolio returns

#### D. Key Research Findings (2025)

- **Advanced deep learning methods did NOT consistently outperform traditional approaches** in comprehensive benchmark studies
- **Momentum-based indicators are the most influential predictors** for stock price movements
- **Hybrid architectures** combining anomaly detection, sentiment analysis, and macroeconomic trends perform best
- **Data quality and model interpretability** remain persistent challenges
- **Overfitting** is the #1 risk -- models that look great on historical data often fail in live trading

---

## 3. SPECIFIC IMPROVEMENTS FOR THE CURRENT DASHBOARD

The current dashboard has: RSI, MACD, SMA 50/200, volume ratio, AFINN sentiment, composite scoring, and basic bearish signals. Here are prioritized improvements:

### 3.1 HIGH-PRIORITY ADDITIONS (Biggest Impact)

#### A. Upgrade Sentiment Analysis from AFINN to FinBERT

**Why:** AFINN is a generic word-sentiment dictionary with no understanding of financial language. "Bear market" scores negatively on "bear" even when just describing conditions. FinBERT (ProsusAI/finbert) is a BERT model fine-tuned on financial text and dramatically outperforms dictionary-based approaches.

**Implementation:**
```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")

def get_finbert_sentiment(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    outputs = model(**inputs)
    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    # Returns: [positive, negative, neutral] probabilities
    return probs.detach().numpy()[0]
```

#### B. Add Bollinger Bands + Squeeze Detection

**Why:** Bollinger Band squeeze (bands narrowing) is one of the most reliable predictors of upcoming large price moves. Combined with volume, it signals when a stock is about to break out.

**Signals to detect:**
- Bollinger Band Squeeze (bandwidth < threshold) -> volatility expansion coming
- Price touching lower band + RSI oversold -> potential bounce
- Price touching upper band + RSI overbought -> potential reversal

#### C. Add On-Balance Volume (OBV) & Volume Divergence

**Why:** Your current volume ratio only looks at relative volume. OBV tracks cumulative volume flow and is one of the most powerful confirmation indicators. Price going up but OBV going down = bearish divergence (distribution).

**Signals:**
- OBV trending up while price flat -> accumulation (bullish)
- OBV trending down while price flat -> distribution (bearish)
- OBV divergence from price -> early warning of reversal

#### D. Add Earnings-Based Scoring

**Why:** Earnings revisions are historically one of the strongest predictors of stock performance (Zacks' entire business is built on this insight).

**Metrics to add:**
- Earnings surprise history (last 4 quarters)
- Analyst estimate revision trend (30/60/90 day)
- Forward P/E vs. sector average
- Revenue growth rate (YoY)

#### E. Add Insider & Institutional Activity Signals

**Why:** Insider buying is among the strongest bullish signals. Insiders know their company better than anyone -- when they buy with their own money, it is very informative.

**Signals:**
- Insider buying cluster (multiple insiders buying in short period) -> strong bullish
- Insider selling (less reliable, could be diversification) -> mild bearish
- Institutional ownership increase -> bullish
- Short interest > 20% -> potential squeeze or strong bearish sentiment

### 3.2 MEDIUM-PRIORITY ADDITIONS (Solid Improvement)

#### F. Add Ichimoku Cloud

**Why:** One of the few indicators that projects future support/resistance levels (forward-looking). It is a complete trading system in one indicator: trend, momentum, support, resistance.

**Signals:**
- Price above cloud -> bullish
- Price below cloud -> bearish
- Cloud twist (Senkou Span A crosses B) -> trend change signal
- Tenkan-Kijun cross -> buy/sell signal

#### G. Add Mean Reversion Scoring

**Why:** Your current system is momentum-heavy. Adding mean reversion metrics captures the other major strategy that works in different market conditions (< 3 months).

**Implementation:**
- Distance from 20-day mean (z-score)
- Bollinger Band %B position
- RSI extreme + reversion probability
- Combine with momentum for adaptive scoring

#### H. Add Multi-Timeframe Analysis

**Why:** A stock might be bullish on the daily chart but bearish on the weekly. Professional traders always confirm across timeframes.

**Implementation:**
- Compute indicators on daily, weekly, and monthly timeframes
- Agreement across timeframes = higher conviction signal
- Divergence across timeframes = caution flag

#### I. Add Stochastic Oscillator

**Why:** Complements RSI with a different calculation method. When RSI and Stochastic both signal overbought/oversold, the signal is much more reliable.

**Signals:**
- Stochastic %K crosses above %D below 20 -> bullish
- Stochastic %K crosses below %D above 80 -> bearish
- RSI + Stochastic agreement -> high-confidence signal

#### J. Improve Composite Score Weights

**Current weights:** Momentum 25%, Technical 25%, Sentiment 15%, Fundamentals 15%, Volume 10%, Risk 10%

**Recommended improved weights:**
```
Momentum:       20%  (slight reduction)
Technical:      20%  (slight reduction)
Sentiment:      15%  (keep, but upgrade to FinBERT)
Fundamentals:   20%  (increase -- earnings revisions are very predictive)
Volume:         10%  (keep)
Risk:           10%  (keep)
Insider/Inst:    5%  (NEW -- insider buying signal)
```

**Consider adaptive weighting:** In trending markets, weight momentum higher. In range-bound markets, weight mean reversion higher. Use ATR or market regime detection to adjust dynamically.

### 3.3 ADVANCED ADDITIONS (Significant Effort, High Value)

#### K. Add Machine Learning Price Direction Prediction

**Why:** An ensemble of XGBoost/LightGBM models trained on your existing indicators can learn non-linear relationships that simple composite scoring misses.

**Approach:**
1. Features: All current indicators + new ones above
2. Label: 5-day forward return (positive/negative)
3. Model: XGBoost or LightGBM (best for tabular data)
4. Train on 2+ years of historical data
5. Walk-forward validation (never peek at future data)
6. Output: Probability of positive 5-day return

#### L. Add Chart Pattern Recognition

**Why:** Automated detection of patterns like Head & Shoulders, Double Top/Bottom, Flag patterns adds a dimension that pure indicator analysis misses.

**Implementation options:**
- Rule-based (identify local min/max, match templates)
- CNN-based (train on labeled chart images)
- Libraries: TA-Lib has some built-in pattern recognition

#### M. Add Options Flow / Unusual Activity (If Data Available)

**Why:** Unusual options activity (large out-of-the-money calls/puts) is one of the strongest signals of informed trading.

**Signals:**
- Unusual call volume -> smart money bullish bet
- Unusual put volume -> smart money bearish bet
- Put/Call ratio extremes -> contrarian signal

#### N. Add Backtesting Framework

**Why:** You need to validate that your signals actually predict stock movements. Without backtesting, you are guessing.

**Implementation:**
- Historical signal generation
- Forward return measurement
- Win rate, profit factor, Sharpe ratio calculation
- Per-signal performance breakdown (which signals work best?)

### 3.4 ADDITIONAL BEARISH SIGNALS TO DETECT

Your current bearish signals: Death Cross, Overbought RSI, MACD Bearish Crossover. Add these:

| Signal | Description | Reliability |
|--------|-------------|-------------|
| **Bearish OBV Divergence** | Price making new highs but OBV declining | High |
| **Bollinger Band Upper Touch + Reversal** | Price hits upper band then reverses with volume | Medium-High |
| **Stochastic Bearish Crossover > 80** | %K crosses below %D above 80 level | Medium |
| **Ichimoku Cloud Breakdown** | Price drops below Ichimoku cloud | High |
| **Volume Climax** | Extreme volume spike on up day (exhaustion) | Medium |
| **Insider Selling Cluster** | Multiple insiders selling within 2 weeks | Medium-High |
| **Earnings Miss + Downward Revision** | Company misses estimates and analysts lower targets | High |
| **Rising Wedge Pattern** | Higher highs and higher lows converging (bearish continuation) | Medium |
| **Bearish Engulfing Candle** | Large red candle engulfs previous green candle | Medium |
| **High Short Interest + Price Drop** | Short interest > 15% and price breaking support | High |
| **VWAP Rejection** | Price fails to hold above VWAP repeatedly | Medium |

### 3.5 ADDITIONAL BULLISH SIGNALS TO DETECT

| Signal | Description | Reliability |
|--------|-------------|-------------|
| **Golden Cross** (already have Death Cross) | SMA 50 crosses above SMA 200 | High |
| **Bullish OBV Divergence** | Price making new lows but OBV rising | High |
| **Bollinger Band Squeeze Breakout Up** | Squeeze resolves with upward price break + volume | High |
| **Ichimoku Cloud Breakout** | Price rises above cloud | High |
| **Insider Buying Cluster** | Multiple insiders buying within 2 weeks | Very High |
| **Earnings Beat + Upward Revision** | Company beats estimates and analysts raise targets | High |
| **Bullish Engulfing Candle** | Large green candle engulfs previous red candle | Medium |
| **Accumulation Day** | Price up > 1% on above-average volume | Medium |
| **Cup and Handle Breakout** | Classic continuation pattern resolving upward | Medium-High |

---

## 4. PRIORITY IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (1-2 weeks)
1. Replace AFINN with FinBERT for sentiment analysis
2. Add Bollinger Bands + squeeze detection
3. Add OBV + divergence detection
4. Add Stochastic Oscillator
5. Expand bearish/bullish signal list

### Phase 2: Fundamental Upgrades (2-4 weeks)
6. Add earnings-based scoring (surprise history, revisions)
7. Add insider/institutional activity signals
8. Add Ichimoku Cloud
9. Implement multi-timeframe analysis
10. Adjust composite score weights

### Phase 3: Advanced Features (1-2 months)
11. Add ML prediction model (XGBoost/LightGBM)
12. Add chart pattern recognition
13. Build backtesting framework
14. Implement adaptive weight system (market regime detection)
15. Add alternative data sources (options flow, social media)

---

## 5. SOURCES & REFERENCES

### Platforms & Tools
- [NerdWallet - Best Stock Screeners](https://www.nerdwallet.com/investing/learn/best-stock-screeners)
- [StockBrokers.com - Best Free Stock Screeners](https://www.stockbrokers.com/guides/best-free-stock-screeners)
- [OpenBB](https://openbb.co/)
- [Finviz](https://finviz.com/)
- [TradingView](https://www.tradingview.com)
- [Yahoo Finance Screeners](https://finance.yahoo.com/research-hub/screener/)
- [Barchart Screeners](https://www.barchart.com/investing-ideas/barchart-screeners)
- [StockAnalysis](https://stockanalysis.com/stocks/screener/)
- [WallStreetZen](https://www.wallstreetzen.com/stock-screener)
- [Intellectia AI](https://intellectia.ai/blog/best-free-stock-screener)
- [SwingTradeBot](https://swingtradebot.com/stock-screens/Bullish)
- [Zacks Stock Screener](https://www.zacks.com/screening/)
- [Stocksight - GitHub](https://github.com/shirosaidev/stocksight)
- [Ghostfolio - GitHub](https://github.com/ghostfolio/ghostfolio)
- [Wealthfolio](https://wealthfolio.app/)

### Technical Analysis
- [StockCharts - Technical Indicators Reference](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays)
- [Ichimoku Cloud - StockCharts](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-overlays/ichimoku-cloud)
- [FTMO Academy - Technical Indicators](https://academy.ftmo.com/lesson/technical-indicators/)

### Machine Learning & Quantitative
- [MDPI - Stock Market Prediction Using ML and Deep Learning](https://www.mdpi.com/2673-9909/5/3/76)
- [Frontiers - AI in Financial Market Prediction](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1696423/full)
- [Stanford CS230 - LSTM in Stock Prediction](https://cs230.stanford.edu/projects_winter_2020/reports/32066186.pdf)
- [ScienceDirect - Deep Learning for Algorithmic Trading](https://www.sciencedirect.com/science/article/pii/S2590005625000177)
- [MDPI - Hybrid ML Models for Stock Forecasting](https://www.mdpi.com/1911-8074/18/4/201)

### Sentiment Analysis
- [FinBERT - HuggingFace](https://huggingface.co/ProsusAI/finbert)
- [FinBERT - GitHub](https://github.com/ProsusAI/finBERT)
- [MDPI - FinBERT, GPT-4 and Logistic Regression](https://www.mdpi.com/2504-2289/8/11/143)
- [ScienceDirect - Loughran-McDonald Dictionary with BERT](https://www.sciencedirect.com/science/article/pii/S1877050925015807)
- [IEEE - Sentiment Analysis in Financial Markets](https://ieeexplore.ieee.org/document/10961060/)

### Quantitative Strategies
- [QuantInsti - Types of Trading Strategies](https://www.quantinsti.com/articles/types-trading-strategies/)
- [QuantifiedStrategies - Mean Reversion](https://www.quantifiedstrategies.com/mean-reversion-trading-strategy/)
- [Hudson & Thames - Combining Mean Reversion and Momentum](https://hudsonthames.org/dynamically-combining-mean-reversion-and-momentum-investment-strategies/)

### Alternative Data
- [InsiderFinance - Options Flow & Dark Pool](https://www.insiderfinance.io/)
- [FlowAlgo - Options Flow](https://www.flowalgo.com/)
