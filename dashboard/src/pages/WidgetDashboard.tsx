import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { StockRecord, NewsItem, MacroData, Metadata } from '../types';

import WatchlistWidget from '../components/widgets/WatchlistWidget';
import ScoreGaugeWidget from '../components/widgets/ScoreGaugeWidget';
import TopMoversWidget from '../components/widgets/TopMoversWidget';
import SectorHeatWidget from '../components/widgets/SectorHeatWidget';
import NewsFeedWidget from '../components/widgets/NewsFeedWidget';
import SignalsSummaryWidget from '../components/widgets/SignalsSummaryWidget';
import MacroWidget from '../components/widgets/MacroWidget';
import CustomChartWidget from '../components/widgets/CustomChartWidget';

interface Props {
  stocks: StockRecord[];
  news: NewsItem[];
  macroData: MacroData | null;
  metadata: Metadata | null;
}

type WidgetType = 'watchlist' | 'scoreGauge' | 'topMovers' | 'sectorHeat' | 'newsFeed' | 'signals' | 'macro' | 'customChart';

interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
}

const WIDGET_TYPES: Record<WidgetType, { label: string; defaultW: number; defaultH: number; minW: number; minH: number }> = {
  watchlist: { label: 'Watchlist', defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
  scoreGauge: { label: 'Score Gauge', defaultW: 2, defaultH: 3, minW: 2, minH: 3 },
  topMovers: { label: 'Top Movers', defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
  sectorHeat: { label: 'Sector Heat', defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
  newsFeed: { label: 'News Feed', defaultW: 4, defaultH: 5, minW: 3, minH: 3 },
  signals: { label: 'Signals', defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
  macro: { label: 'Macro Indicators', defaultW: 4, defaultH: 3, minW: 2, minH: 2 },
  customChart: { label: 'Custom Chart', defaultW: 4, defaultH: 4, minW: 3, minH: 3 },
};

const STORAGE_KEY = 'widget-dashboard-layouts';
const WIDGETS_KEY = 'widget-dashboard-widgets';

function loadWidgets(): WidgetConfig[] {
  try {
    const saved = localStorage.getItem(WIDGETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [
    { id: 'w1', type: 'watchlist', title: 'Watchlist' },
    { id: 'w2', type: 'topMovers', title: 'Top Movers' },
    { id: 'w3', type: 'signals', title: 'Signals' },
    { id: 'w4', type: 'macro', title: 'Macro Indicators' },
    { id: 'w5', type: 'sectorHeat', title: 'Sector Heat' },
  ];
}

function loadLayouts(): Record<string, any[]> | undefined {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return undefined;
}

let nextId = 100;

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(ref.current);
    setWidth(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export default function WidgetDashboard({ stocks, news, macroData, metadata }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadWidgets);
  const [layouts, setLayouts] = useState<Record<string, any[]> | undefined>(loadLayouts);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const saveWidgets = useCallback((w: WidgetConfig[]) => {
    setWidgets(w);
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(w));
  }, []);

  const onLayoutChange = useCallback((_: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  const addWidget = useCallback((type: WidgetType) => {
    const config = WIDGET_TYPES[type];
    const id = `w${++nextId}`;
    const newWidget: WidgetConfig = { id, type, title: config.label };
    saveWidgets([...widgets, newWidget]);
    setShowAddMenu(false);
  }, [widgets, saveWidgets]);

  const removeWidget = useCallback((id: string) => {
    saveWidgets(widgets.filter(w => w.id !== id));
  }, [widgets, saveWidgets]);

  const defaultLayouts = useMemo(() => {
    if (layouts) return layouts;
    const lg: any[] = widgets.map((w, i) => {
      const cfg = WIDGET_TYPES[w.type];
      return {
        i: w.id,
        x: (i * cfg.defaultW) % 12,
        y: Math.floor((i * cfg.defaultW) / 12) * cfg.defaultH,
        w: cfg.defaultW,
        h: cfg.defaultH,
        minW: cfg.minW,
        minH: cfg.minH,
      };
    });
    return { lg };
  }, [widgets, layouts]);

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'watchlist': return <WatchlistWidget stocks={stocks} />;
      case 'scoreGauge': return <ScoreGaugeWidget stocks={stocks} />;
      case 'topMovers': return <TopMoversWidget stocks={stocks} />;
      case 'sectorHeat': return <SectorHeatWidget stocks={stocks} />;
      case 'newsFeed': return <NewsFeedWidget news={news} />;
      case 'signals': return <SignalsSummaryWidget stocks={stocks} />;
      case 'macro': return <MacroWidget macroData={macroData} />;
      case 'customChart': return <CustomChartWidget stocks={stocks} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-primary">Dashboard</h1>
          <p className="text-sm t-muted mt-1">Drag, resize, and customize your market view.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(v => !v)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Widget
          </button>
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface-secondary border border-surface-border rounded-xl shadow-xl z-50 py-1">
              {(Object.entries(WIDGET_TYPES) as [WidgetType, typeof WIDGET_TYPES[WidgetType]][]).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => addWidget(type)}
                  className="w-full text-left px-4 py-2 text-sm t-secondary hover:bg-surface-hover transition-colors"
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef}>
        {widgets.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="t-muted text-sm">No widgets added. Click "Add Widget" to get started.</p>
          </div>
        ) : (
          <ResponsiveGridLayout
            {...{
              className: 'widget-grid',
              layouts: defaultLayouts,
              breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
              cols: { lg: 12, md: 10, sm: 6, xs: 4 },
              rowHeight: 60,
              width: containerWidth,
              onLayoutChange,
              draggableHandle: '.widget-drag-handle',
              compactType: 'vertical',
            } as any}
          >
            {widgets.map(widget => (
              <div key={widget.id} className="card overflow-hidden flex flex-col">
                <div className="widget-drag-handle flex items-center justify-between px-3 py-2 border-b border-surface-border bg-surface-tertiary/30 cursor-grab active:cursor-grabbing">
                  <span className="text-xs font-semibold t-secondary">{widget.title}</span>
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-bearish/20 transition-colors"
                    title="Remove widget"
                  >
                    <svg className="w-3 h-3 t-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {renderWidget(widget)}
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
