import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import { useStockData } from './hooks/useStockData';
import Overview from './pages/Overview';
import Screener from './pages/Screener';
import BearishAlerts from './pages/BearishAlerts';
import NewsSentiment from './pages/NewsSentiment';
import StockDetail from './pages/StockDetail';

export default function App() {
  const { stocks, summary, bearishAlerts, news, metadata, loading } = useStockData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bullish mx-auto mb-4" />
          <p className="text-gray-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header lastUpdated={metadata?.lastUpdated} />
      <main className="max-w-7xl mx-auto px-4 py-6">
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
        </Routes>
      </main>
    </div>
  );
}
