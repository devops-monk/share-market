import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import { useStockData } from './hooks/useStockData';
import { useTheme } from './hooks/useTheme';
import Overview from './pages/Overview';
import Screener from './pages/Screener';
import BearishAlerts from './pages/BearishAlerts';
import NewsSentiment from './pages/NewsSentiment';
import StockDetail from './pages/StockDetail';
import Guide from './pages/Guide';
import BuyTheDip from './pages/BuyTheDip';
import BreakoutDetection from './pages/BreakoutDetection';
import HeatMap from './pages/HeatMap';
import SectorPerformance from './pages/SectorPerformance';
import MinerviniScreen from './pages/MinerviniScreen';
import StockComparison from './pages/StockComparison';
import Watchlist from './pages/Watchlist';
import AlertSettings from './pages/AlertSettings';
import Portfolio from './pages/Portfolio';
import CanSlim from './pages/CanSlim';
import CustomScreen from './pages/CustomScreen';
import Backtest from './pages/Backtest';
import EarningsCalendar from './pages/EarningsCalendar';
import SupportBounce from './pages/SupportBounce';
import YearlyUptrend from './pages/YearlyUptrend';
import InstallPrompt from './components/common/InstallPrompt';

export default function App() {
  const { stocks, summary, bearishAlerts, news, metadata, scoreHistory, loading } = useStockData();
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
        <Routes>
          <Route
            path="/"
            element={
              <Overview
                stocks={stocks}
                summary={summary}
                metadata={metadata}
                bearishCount={bearishAlerts.length}
              />
            }
          />
          <Route path="/screener" element={<Screener stocks={stocks} />} />
          <Route path="/bearish" element={<BearishAlerts alerts={bearishAlerts} />} />
          <Route path="/news" element={<NewsSentiment news={news} />} />
          <Route path="/stock/:ticker" element={<StockDetail stocks={stocks} news={news} />} />
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
          <Route path="/guide" element={<Guide />} />
          <Route path="/alerts" element={<AlertSettings />} />
        </Routes>
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
