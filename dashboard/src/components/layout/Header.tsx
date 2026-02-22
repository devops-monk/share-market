import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Overview', icon: '◎' },
  { path: '/screener', label: 'Screener', icon: '⊞' },
  { path: '/bearish', label: 'Bearish Alerts', icon: '▼' },
  { path: '/dip', label: 'Buy the Dip', icon: '▲' },
  { path: '/news', label: 'News', icon: '◉' },
  { path: '/guide', label: 'Guide', icon: '?' },
];

interface HeaderProps {
  lastUpdated?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Header({ lastUpdated, theme, onToggleTheme }: HeaderProps) {
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
            <span className="text-base font-bold t-primary group-hover:text-accent-light transition-colors">
              StockMarket
            </span>
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
                      : 't-tertiary hover:t-primary hover:bg-surface-hover'
                  }`}
                >
                  <span className="text-xs opacity-60">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: theme toggle + status */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-tertiary border border-surface-border hover:border-accent/30 transition-all"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 t-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 t-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-2 text-xs t-muted">
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
                    : 't-muted'
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
