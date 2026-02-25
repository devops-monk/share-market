import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType, type IChartApi, type CandlestickData, type HistogramData, type LineData, type Time } from 'lightweight-charts';

interface Props {
  ticker: string;
  sma50?: number | null;
  sma150?: number | null;
  sma200?: number | null;
}

type TimeRange = '3M' | '6M' | '1Y' | '2Y' | '3Y' | '4Y' | '5Y';

const RANGE_DAYS: Record<TimeRange, number> = {
  '3M': 63,
  '6M': 126,
  '1Y': 252,
  '2Y': 504,
  '3Y': 756,
  '4Y': 1008,
  '5Y': 1260,
};

const BASE = import.meta.env.BASE_URL;

export default function CandlestickChart({ ticker, sma50, sma150, sma200 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rawDataRef = useRef<number[][] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('1Y');
  const [maxRange, setMaxRange] = useState<TimeRange>('3Y');

  const buildChart = useCallback((raw: number[][], selectedRange: TimeRange) => {
    if (!containerRef.current) return;

    // Remove existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = containerRef.current;

    // Filter data by selected range
    const daysToShow = RANGE_DAYS[selectedRange];
    const sliced = raw.length > daysToShow ? raw.slice(-daysToShow) : raw;

    // Read resolved CSS chart vars (lightweight-charts needs hex values)
    const cs = getComputedStyle(document.documentElement);
    const chartBullish = cs.getPropertyValue('--chart-bullish').trim() || '#16a34a';
    const chartBearish = cs.getPropertyValue('--chart-bearish').trim() || '#dc2626';
    const chartGrid = cs.getPropertyValue('--chart-grid').trim() || 'rgba(100,116,139,0.08)';
    const textColor = cs.getPropertyValue('--text-tertiary').trim() || '#6b7280';
    const borderColor = cs.getPropertyValue('--surface-border').trim() || '#d1d5db';

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 350,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: chartGrid },
        horzLines: { color: chartGrid },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: false },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: chartBullish,
      downColor: chartBearish,
      borderUpColor: chartBullish,
      borderDownColor: chartBearish,
      wickUpColor: chartBullish,
      wickDownColor: chartBearish,
    });

    const candles: CandlestickData<Time>[] = sliced.map(d => ({
      time: d[0] as Time,
      open: d[1],
      high: d[2],
      low: d[3],
      close: d[4],
    }));

    const volumeData: HistogramData<Time>[] = sliced.map(d => ({
      time: d[0] as Time,
      value: d[5],
      color: d[4] >= d[1] ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
    }));

    candleSeries.setData(candles);

    // Volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(volumeData);

    // SMA lines as horizontal reference across last 20% of chart
    if (candles.length > 0) {
      const addSmaLine = (value: number | null | undefined, color: string) => {
        if (value == null) return;
        const lineSeries = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        const startIdx = Math.floor(candles.length * 0.8);
        const points: LineData<Time>[] = candles.slice(startIdx).map(c => ({
          time: c.time,
          value: value,
        }));
        if (points.length > 0) lineSeries.setData(points);
      };

      const chartAccentLight = cs.getPropertyValue('--chart-accent-light').trim() || '#60a5fa';
      const chartNeutral = cs.getPropertyValue('--chart-neutral').trim() || '#d97706';
      addSmaLine(sma50, chartAccentLight);
      addSmaLine(sma150, '#38bdf8');
      addSmaLine(sma200, chartNeutral);
    }

    chart.timeScale().fitContent();

    // Resize
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(container);
  }, [sma50, sma150, sma200]);

  // Fetch data once
  useEffect(() => {
    const safeTicker = ticker.replace(/[^a-zA-Z0-9.-]/g, '_');
    let cancelled = false;

    fetch(`${BASE}data/charts/${safeTicker}.json`)
      .then(res => {
        if (!res.ok) throw new Error('No chart data');
        return res.json();
      })
      .then((raw: number[][]) => {
        if (cancelled) return;
        rawDataRef.current = raw;
        setLoading(false);

        // Determine max available range
        const days = raw.length;
        if (days >= 1260) setMaxRange('5Y');
        else if (days >= 1008) setMaxRange('4Y');
        else if (days >= 756) setMaxRange('3Y');
        else if (days >= 504) setMaxRange('2Y');
        else if (days >= 252) setMaxRange('1Y');
        else if (days >= 126) setMaxRange('6M');
        else setMaxRange('3M');

        buildChart(raw, range);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ticker]); // Only refetch on ticker change

  // Rebuild chart when range changes (but not on initial load)
  useEffect(() => {
    if (rawDataRef.current && !loading) {
      buildChart(rawDataRef.current, range);
    }
  }, [range, buildChart, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  const handleRangeChange = (r: TimeRange) => {
    setRange(r);
  };

  if (error) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center">
        <p className="text-sm t-muted">Chart data not available for {ticker}</p>
      </div>
    );
  }

  const ranges: TimeRange[] = ['3M', '6M', '1Y', '2Y', '3Y', '4Y', '5Y'];
  const availableRanges = ranges.filter(r => RANGE_DAYS[r] <= RANGE_DAYS[maxRange]);

  return (
    <div className="relative">
      {/* Time range selector */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {availableRanges.map(r => (
              <button
                key={r}
                onClick={() => handleRangeChange(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  range === r
                    ? 'bg-accent/15 text-accent-light ring-1 ring-accent/30'
                    : 'bg-surface-tertiary t-tertiary hover:t-secondary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs t-muted">
            {sma50 != null && <span><span className="inline-block w-3 h-0.5 bg-accent-light mr-1 align-middle" />SMA 50</span>}
            {sma150 != null && <span><span className="inline-block w-3 h-0.5 bg-sky-400 mr-1 align-middle" />SMA 150</span>}
            {sma200 != null && <span><span className="inline-block w-3 h-0.5 bg-neutral-light mr-1 align-middle" />SMA 200</span>}
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ minHeight: 350 }} />
    </div>
  );
}