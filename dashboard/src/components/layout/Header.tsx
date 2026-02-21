import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Overview' },
  { path: '/screener', label: 'Screener' },
  { path: '/bearish', label: 'Bearish Alerts' },
  { path: '/news', label: 'News & Sentiment' },
];

export default function Header({ lastUpdated }: { lastUpdated?: string }) {
  const { pathname } = useLocation();

  return (
    <header className="bg-surface-secondary border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-white">
          Stock<span className="text-bullish">Market</span>
        </Link>
        <nav className="hidden md:flex gap-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.path
                  ? 'bg-surface-tertiary text-white'
                  : 'text-gray-400 hover:text-white hover:bg-surface-tertiary/50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>
      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 px-4 pb-3 overflow-x-auto">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              pathname === item.path
                ? 'bg-surface-tertiary text-white'
                : 'text-gray-400'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
