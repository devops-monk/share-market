import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Overview', icon: '◎' },
  { path: '/screener', label: 'Screener', icon: '⊞' },
  { path: '/bearish', label: 'Bearish Alerts', icon: '▼' },
  { path: '/news', label: 'News', icon: '◉' },
  { path: '/guide', label: 'Guide', icon: '?' },
];

export default function Header({ lastUpdated }: { lastUpdated?: string }) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-surface-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-bullish flex items-center justify-center text-white text-sm font-bold">
              SM
            </div>
            <div>
              <span className="text-base font-bold text-white group-hover:text-accent-light transition-colors">
                StockMarket
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/15 text-accent-light border border-accent/20'
                      : 'text-gray-400 hover:text-white hover:bg-surface-hover'
                  }`}
                >
                  <span className="text-xs opacity-60">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Status */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-bullish animate-pulse" />
                {new Date(lastUpdated).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto scrollbar-none">
          {navItems.map(item => {
            const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-accent/15 text-accent-light'
                    : 'text-gray-500'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
