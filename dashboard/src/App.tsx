import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import { useStockData } from './hooks/useStockData';
import Overview from './pages/Overview';
import Screener from './pages/Screener';
import BearishAlerts from './pages/BearishAlerts';
import NewsSentiment from './pages/NewsSentiment';
import StockDetail from './pages/StockDetail';
import Guide from './pages/Guide';

export default function App() {
  const { stocks, summary, bearishAlerts, news, metadata, loading } = useStockData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
          <p className="text-gray-400 text-sm font-medium">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header lastUpdated={metadata?.lastUpdated} />
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
          <Route path="/guide" element={<Guide />} />
        </Routes>
      </main>
      <footer className="border-t border-surface-border py-6 mt-12">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 flex items-center justify-between text-xs text-gray-600">
          <span>StockMarket Dashboard — Educational purposes only</span>
          <span>Data updates hourly on weekdays</span>
        </div>
      </footer>
    </div>
  );
}
