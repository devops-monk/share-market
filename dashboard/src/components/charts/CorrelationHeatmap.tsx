interface Props {
  tickers: string[];
  matrix: number[][];
}

function correlationColor(r: number): string {
  // Diverging: red(-1) → white(0) → green(+1)
  if (r >= 0) {
    const t = Math.min(r, 1);
    const g = Math.round(100 + 155 * t);
    const rb = Math.round(255 - 155 * t);
    return `rgb(${rb}, ${g}, ${rb})`;
  } else {
    const t = Math.min(-r, 1);
    const red = Math.round(100 + 155 * t);
    const gb = Math.round(255 - 155 * t);
    return `rgb(${red}, ${gb}, ${gb})`;
  }
}

export default function CorrelationHeatmap({ tickers, matrix }: Props) {
  const n = tickers.length;
  const cellSize = Math.min(60, Math.max(40, 300 / n));
  const labelWidth = 60;
  const totalW = labelWidth + n * cellSize;
  const totalH = labelWidth + n * cellSize;

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`}>
        {/* Column headers */}
        {tickers.map((ticker, j) => (
          <text
            key={`col-${j}`}
            x={labelWidth + j * cellSize + cellSize / 2}
            y={labelWidth - 6}
            textAnchor="middle"
            fontSize={10}
            fontWeight="600"
            fill="var(--text-tertiary)"
          >
            {ticker.length > 6 ? ticker.slice(0, 6) : ticker}
          </text>
        ))}

        {/* Rows */}
        {tickers.map((ticker, i) => (
          <g key={`row-${i}`}>
            {/* Row label */}
            <text
              x={labelWidth - 6}
              y={labelWidth + i * cellSize + cellSize / 2 + 3}
              textAnchor="end"
              fontSize={10}
              fontWeight="600"
              fill="var(--text-tertiary)"
            >
              {ticker.length > 6 ? ticker.slice(0, 6) : ticker}
            </text>

            {/* Cells */}
            {matrix[i].map((val, j) => (
              <g key={`${i}-${j}`}>
                <rect
                  x={labelWidth + j * cellSize}
                  y={labelWidth + i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={correlationColor(val)}
                  stroke="var(--surface)"
                  strokeWidth={1}
                  opacity={0.85}
                >
                  <title>{`${tickers[i]} vs ${tickers[j]}: ${val.toFixed(2)}`}</title>
                </rect>
                <text
                  x={labelWidth + j * cellSize + cellSize / 2}
                  y={labelWidth + i * cellSize + cellSize / 2 + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="500"
                  fill={Math.abs(val) > 0.5 ? '#fff' : 'var(--text-primary)'}
                >
                  {val.toFixed(2)}
                </text>
              </g>
            ))}
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-2 mt-3 text-[10px] t-muted">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: correlationColor(-1) }} />
        <span>-1 (inverse)</span>
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: correlationColor(0) }} />
        <span>0 (none)</span>
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: correlationColor(1) }} />
        <span>+1 (perfect)</span>
      </div>
    </div>
  );
}
