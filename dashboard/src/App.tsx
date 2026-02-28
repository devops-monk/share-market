import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import { useStockData } from './hooks/useStockData';
import { useTheme } from './hooks/useTheme';
import Overview from './pages/Overview';
import InstallPrompt from './components/common/InstallPrompt';

// Lazy-loaded pages
const Screener = lazy(() => import('./pages/Screener'));
const BearishAlerts = lazy(() => import('./pages/BearishAlerts'));
const NewsSentiment = lazy(() => import('./pages/NewsSentiment'));
const StockDetail = lazy(() => import('./pages/StockDetail'));
const Guide = lazy(() => import('./pages/Guide'));
const BuyTheDip = lazy(() => import('./pages/BuyTheDip'));
const BreakoutDetection = lazy(() => import('./pages/BreakoutDetection'));
const HeatMap = lazy(() => import('./pages/HeatMap'));
const SectorPerformance = lazy(() => import('./pages/SectorPerformance'));
const MinerviniScreen = lazy(() => import('./pages/MinerviniScreen'));
const StockComparison = lazy(() => import('./pages/StockComparison'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const AlertSettings = lazy(() => import('./pages/AlertSettings'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const CanSlim = lazy(() => import('./pages/CanSlim'));
const CustomScreen = lazy(() => import('./pages/CustomScreen'));
const Backtest = lazy(() => import('./pages/Backtest'));
const EarningsCalendar = lazy(() => import('./pages/EarningsCalendar'));
const SupportBounce = lazy(() => import('./pages/SupportBounce'));
const YearlyUptrend = lazy(() => import('./pages/YearlyUptrend'));
const MostOwned = lazy(() => import('./pages/MostOwned'));
const SectorRotation = lazy(() => import('./pages/SectorRotation'));
const NLQuery = lazy(() => import('./pages/NLQuery'));
const EconomicCalendar = lazy(() => import('./pages/EconomicCalendar'));
const WeightedScreener = lazy(() => import('./pages/WeightedScreener'));
const WidgetDashboard = lazy(() => import('./pages/WidgetDashboard'));
const AICopilot = lazy(() => import('./pages/AICopilot'));

const PageSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
    </div>
  </div>
);

export default function App() {
  const { stocks, summary, bearishAlerts, news, metadata, scoreHistory, financials, insiderTrades, aiResearchNotes, macroData, socialSentiment, loading } = useStockData();
  const { theme, toggle } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
          <p className="t-tertiary text-sm font-medium">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header lastUpdated={metadata?.lastUpdated} theme={theme} onToggleTheme={toggle} />
      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route
              path="/"
              element={
                <Overview
                  stocks={stocks}
                  summary={summary}
                  metadata={metadata}
                  bearishCount={bearishAlerts.length}
                  macroData={macroData}
                />
              }
            />
            <Route path="/screener" element={<Screener stocks={stocks} />} />
            <Route path="/bearish" element={<BearishAlerts alerts={bearishAlerts} />} />
            <Route path="/news" element={<NewsSentiment news={news} />} />
            <Route path="/stock/:ticker" element={<StockDetail stocks={stocks} news={news} financials={financials} insiderTrades={insiderTrades} aiResearchNotes={aiResearchNotes} socialSentiment={socialSentiment} />} />
            <Route path="/dip" element={<BuyTheDip stocks={stocks} />} />
            <Route path="/breakout" element={<BreakoutDetection stocks={stocks} />} />
            <Route path="/heatmap" element={<HeatMap stocks={stocks} />} />
            <Route path="/sectors" element={<SectorPerformance stocks={stocks} />} />
            <Route path="/minervini" element={<MinerviniScreen stocks={stocks} />} />
            <Route path="/compare" element={<StockComparison stocks={stocks} />} />
            <Route path="/watchlist" element={<Watchlist stocks={stocks} />} />
            <Route path="/portfolio" element={<Portfolio stocks={stocks} />} />
            <Route path="/canslim" element={<CanSlim stocks={stocks} metadata={metadata} />} />
            <Route path="/custom-screen" element={<CustomScreen stocks={stocks} />} />
            <Route path="/backtest" element={<Backtest stocks={stocks} scoreHistory={scoreHistory} />} />
            <Route path="/earnings" element={<EarningsCalendar stocks={stocks} />} />
            <Route path="/support-bounce" element={<SupportBounce stocks={stocks} />} />
            <Route path="/yearly-uptrend" element={<YearlyUptrend stocks={stocks} />} />
            <Route path="/most-owned" element={<MostOwned stocks={stocks} />} />
            <Route path="/sector-rotation" element={<SectorRotation stocks={stocks} />} />
            <Route path="/query" element={<NLQuery stocks={stocks} />} />
            <Route path="/economic-calendar" element={<EconomicCalendar />} />
            <Route path="/weighted-screener" element={<WeightedScreener stocks={stocks} />} />
            <Route path="/dashboard" element={<WidgetDashboard stocks={stocks} news={news} macroData={macroData} metadata={metadata} />} />
            <Route path="/copilot" element={<AICopilot stocks={stocks} metadata={metadata} />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/alerts" element={<AlertSettings />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="border-t border-surface-border py-8 mt-16">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs t-muted">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-accent to-bullish flex items-center justify-center text-white text-[8px] font-bold">
                SM
              </div>
              <span>StockMarket Dashboard</span>
              <span className="t-faint">|</span>
              <span>Educational purposes only</span>
            </div>
            <span>Data updates hourly on weekdays</span>
          </div>
        </div>
      </footer>
      <InstallPrompt />
    </div>
  );
}
