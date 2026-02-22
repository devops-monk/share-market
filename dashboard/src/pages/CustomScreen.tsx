import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { StockRecord } from '../types';
import { ScoreBadge, MarketTag, ChangePercent } from '../components/common/Tags';

/* ─── METRIC DEFINITIONS ─── */
interface MetricDef {
  key: string;
  label: string;
  getValue: (s: StockRecord) => number | null | undefined;
  unit?: string;
}

const METRICS: MetricDef[] = [
  { key: 'score', label: 'Composite Score', getValue: s => s.score.composite },
  { key: 'rsi', label: 'RSI', getValue: s => s.rsi },
  { key: 'rs', label: 'RS Percentile', getValue: s => s.rsPercentile },
  { key: 'pe', label: 'P/E Ratio', getValue: s => s.pe },
  { key: 'forwardPe', label: 'Forward P/E', getValue: s => s.forwardPe },
  { key: 'peg', label: 'PEG Ratio', getValue: s => s.pegRatio },
  { key: 'pb', label: 'P/B Ratio', getValue: s => s.priceToBook },
  { key: 'roe', label: 'ROE %', getValue: s => s.returnOnEquity != null ? s.returnOnEquity * 100 : null, unit: '%' },
  { key: 'roa', label: 'ROA %', getValue: s => s.returnOnAssets != null ? s.returnOnAssets * 100 : null, unit: '%' },
  { key: 'grossMargin', label: 'Gross Margin %', getValue: s => s.grossMargins != null ? s.grossMargins * 100 : null, unit: '%' },
  { key: 'profitMargin', label: 'Profit Margin %', getValue: s => s.profitMargins != null ? s.profitMargins * 100 : null, unit: '%' },
  { key: 'de', label: 'Debt/Equity', getValue: s => s.debtToEquity },
  { key: 'currentRatio', label: 'Current Ratio', getValue: s => s.currentRatio },
  { key: 'beta', label: 'Beta', getValue: s => s.beta },
  { key: 'change', label: 'Change %', getValue: s => s.changePercent, unit: '%' },
  { key: 'bearish', label: 'Bearish Score', getValue: s => s.bearishScore },
  { key: 'bullish', label: 'Bullish Score', getValue: s => s.bullishScore },
  { key: 'piotroski', label: 'Piotroski F-Score', getValue: s => s.piotroskiScore },
  { key: 'buffett', label: 'Buffett Score', getValue: s => s.buffettScore },
  { key: 'minervini', label: 'Minervini Checks', getValue: s => s.minerviniChecks.passed },
  { key: 'divYield', label: 'Dividend Yield %', getValue: s => s.dividendYield != null ? s.dividendYield * 100 : null, unit: '%' },
  { key: 'volRatio', label: 'Volume Ratio', getValue: s => s.volumeRatio },
  { key: 'dataQuality', label: 'Data Quality %', getValue: s => s.dataCompleteness, unit: '%' },
  { key: 'return3m', label: '3M Return %', getValue: s => s.priceReturn3m * 100, unit: '%' },
  { key: 'return1y', label: '1Y Return %', getValue: s => s.priceReturn1y * 100, unit: '%' },
];

type Operator = '>' | '>=' | '<' | '<=' | '=';
const OPERATORS: { op: Operator; label: string }[] = [
  { op: '>', label: '>' },
  { op: '>=', label: '>=' },
  { op: '<', label: '<' },
  { op: '<=', label: '<=' },
  { op: '=', label: '=' },
];

interface FilterRule {
  id: number;
  metricKey: string;
  operator: Operator;
  value: string;
}

interface SavedScreen {
  name: string;
  rules: Omit<FilterRule, 'id'>[];
}

const STORAGE_KEY = 'sm-custom-screens';

function loadScreens(): SavedScreen[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}

function saveScreens(screens: SavedScreen[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(screens));
}

let nextId = 1;

export default function CustomScreen({ stocks }: { stocks: StockRecord[] }) {
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>(loadScreens);
  const [screenName, setScreenName] = useState('');
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');

  const addRule = useCallback(() => {
    setRules(prev => [...prev, { id: nextId++, metricKey: 'score', operator: '>=', value: '60' }]);
  }, []);

  const removeRule = useCallback((id: number) => {
    setRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const updateRule = useCallback((id: number, field: keyof FilterRule, val: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }, []);

  const saveScreen = useCallback(() => {
    if (!screenName.trim() || rules.length === 0) return;
    const newScreen: SavedScreen = {
      name: screenName.trim(),
      rules: rules.map(({ metricKey, operator, value }) => ({ metricKey, operator, value })),
    };
    const updated = [...savedScreens.filter(s => s.name !== newScreen.name), newScreen];
    setSavedScreens(updated);
    saveScreens(updated);
    setScreenName('');
  }, [screenName, rules, savedScreens]);

  const loadScreen = useCallback((screen: SavedScreen) => {
    setRules(screen.rules.map(r => ({ ...r, id: nextId++ })));
  }, []);

  const deleteScreen = useCallback((name: string) => {
    const updated = savedScreens.filter(s => s.name !== name);
    setSavedScreens(updated);
    saveScreens(updated);
  }, [savedScreens]);

  const filtered = useMemo(() => {
    if (rules.length === 0) return [];

    return stocks.filter(s => {
      const results = rules.map(rule => {
        const metric = METRICS.find(m => m.key === rule.metricKey);
        if (!metric) return false;
        const val = metric.getValue(s);
        if (val == null) return false;
        const target = parseFloat(rule.value);
        if (isNaN(target)) return false;
        switch (rule.operator) {
          case '>': return val > target;
          case '>=': return val >= target;
          case '<': return val < target;
          case '<=': return val <= target;
          case '=': return Math.abs(val - target) < 0.01;
          default: return false;
        }
      });

      return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
    });
  }, [stocks, rules, logic]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold t-primary">Custom Screen Builder</h1>
        <p className="text-sm t-muted mt-1">Create custom screens by combining any metrics with AND/OR logic</p>
      </div>

      {/* Saved screens */}
      {savedScreens.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-3">Saved Screens</h3>
          <div className="flex flex-wrap gap-2">
            {savedScreens.map(screen => (
              <div key={screen.name} className="flex items-center gap-1">
                <button
                  onClick={() => loadScreen(screen)}
                  className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 hover:bg-accent/25 transition-colors cursor-pointer text-xs px-3 py-1.5"
                >
                  {screen.name} ({screen.rules.length})
                </button>
                <button
                  onClick={() => deleteScreen(screen.name)}
                  className="text-xs t-muted hover:text-bearish transition-colors px-1"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules builder */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Filter Rules</h3>
            <div className="flex gap-1 bg-surface-tertiary rounded-lg p-0.5">
              {(['AND', 'OR'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLogic(l)}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all ${
                    logic === l ? 'bg-accent/20 text-accent-light' : 't-muted hover:t-secondary'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={addRule}
            className="badge bg-bullish/15 text-bullish ring-1 ring-bullish/20 hover:bg-bullish/25 transition-colors cursor-pointer text-xs px-3 py-1.5"
          >
            + Add Rule
          </button>
        </div>

        {rules.length === 0 && (
          <p className="text-sm t-muted py-4 text-center">Click "Add Rule" to start building your screen.</p>
        )}

        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-surface-tertiary/30 border border-surface-border">
              {idx > 0 && (
                <span className="text-xs font-semibold text-accent-light w-8">{logic}</span>
              )}
              {idx === 0 && <span className="text-xs font-semibold t-muted w-8">IF</span>}
              <select
                value={rule.metricKey}
                onChange={e => updateRule(rule.id, 'metricKey', e.target.value)}
                className="input-field text-xs py-1"
              >
                {METRICS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
              <select
                value={rule.operator}
                onChange={e => updateRule(rule.id, 'operator', e.target.value)}
                className="input-field text-xs py-1 w-16"
              >
                {OPERATORS.map(o => (
                  <option key={o.op} value={o.op}>{o.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={rule.value}
                onChange={e => updateRule(rule.id, 'value', e.target.value)}
                className="input-field text-xs py-1 w-24 font-mono"
                step="any"
              />
              <button
                onClick={() => removeRule(rule.id)}
                className="t-muted hover:text-bearish transition-colors text-sm font-bold px-2"
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* Save */}
        {rules.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-border">
            <input
              type="text"
              value={screenName}
              onChange={e => setScreenName(e.target.value)}
              placeholder="Screen name..."
              className="input-field text-xs py-1 w-40"
            />
            <button
              onClick={saveScreen}
              className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 hover:bg-accent/25 transition-colors cursor-pointer text-xs px-3 py-1.5"
            >
              Save Screen
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {rules.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="badge bg-surface-tertiary t-secondary ring-1 ring-surface-border">{filtered.length} matches</span>
          </div>

          {filtered.length > 0 ? (
            <div className="card-flat overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="px-4 py-3 text-left table-header">Ticker</th>
                      <th className="px-4 py-3 text-left table-header">Name</th>
                      <th className="px-4 py-3 text-left table-header">Market</th>
                      <th className="px-4 py-3 text-right table-header">Price</th>
                      <th className="px-4 py-3 text-right table-header">Change</th>
                      <th className="px-4 py-3 text-center table-header">Score</th>
                      {rules.map(r => {
                        const m = METRICS.find(md => md.key === r.metricKey);
                        return <th key={r.id} className="px-4 py-3 text-right table-header">{m?.label ?? r.metricKey}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map(s => (
                      <tr key={s.ticker} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link to={`/stock/${s.ticker}`} className="font-semibold text-accent-light hover:t-primary transition-colors">
                            {s.ticker}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 t-secondary text-xs truncate max-w-[120px]">{s.name}</td>
                        <td className="px-4 py-2.5"><MarketTag market={s.market} /></td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums t-primary">
                          {s.market === 'UK' ? '\u00a3' : '$'}{s.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right"><ChangePercent value={s.changePercent} /></td>
                        <td className="px-4 py-2.5 text-center"><ScoreBadge score={s.score.composite} /></td>
                        {rules.map(r => {
                          const m = METRICS.find(md => md.key === r.metricKey);
                          const val = m?.getValue(s);
                          return (
                            <td key={r.id} className="px-4 py-2.5 text-right font-mono tabular-nums text-xs t-secondary">
                              {val != null ? (typeof val === 'number' ? val.toFixed(1) : val) : '--'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > 100 && (
                <p className="text-xs t-muted p-3 text-center">Showing first 100 of {filtered.length} matches</p>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="t-muted text-sm">No stocks match your criteria. Try adjusting the rules.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
