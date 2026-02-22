import { useState, useEffect } from 'react';

interface AlertRule {
  id: string;
  type: string;
  ticker: string;
  threshold: number;
  enabled: boolean;
  note?: string;
}

interface AlertConfig {
  rules: AlertRule[];
}

const ALERT_TYPES = [
  { value: 'price_above', label: 'Price Above', desc: 'Alert when price goes above threshold' },
  { value: 'price_below', label: 'Price Below', desc: 'Alert when price drops below threshold' },
  { value: 'score_above', label: 'Score Above', desc: 'Alert when composite score rises above threshold' },
  { value: 'score_below', label: 'Score Below', desc: 'Alert when composite score drops below threshold' },
  { value: 'bearish_score_above', label: 'Bearish Score Above', desc: 'Alert when bearish score exceeds threshold' },
  { value: 'rsi_above', label: 'RSI Above', desc: 'Alert when RSI goes above threshold (overbought)' },
  { value: 'rsi_below', label: 'RSI Below', desc: 'Alert when RSI goes below threshold (oversold)' },
  { value: 'minervini_pass', label: 'Minervini Checks >=', desc: 'Alert when stock passes N+ Minervini criteria' },
  { value: 'daily_summary', label: 'Daily Summary', desc: 'Send a daily market summary at first ETL run' },
];

const STORAGE_KEY = 'sm-alert-rules';

export default function AlertSettings() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loadingRules, setLoadingRules] = useState(true);
  const [newRule, setNewRule] = useState<Omit<AlertRule, 'id'>>({
    type: 'price_above',
    ticker: '',
    threshold: 0,
    enabled: true,
    note: '',
  });
  const [copied, setCopied] = useState(false);

  // Load rules: try repo's data/alerts.json first, fallback to localStorage
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/alerts.json`);
        if (res.ok) {
          const config: AlertConfig = await res.json();
          if (config.rules?.length) {
            setRules(config.rules);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config.rules));
            setLoadingRules(false);
            return;
          }
        }
      } catch { /* fall through */ }
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setRules(JSON.parse(saved));
      } catch { /* ignore */ }
      setLoadingRules(false);
    })();
  }, []);

  // Save to localStorage on changes (after initial load)
  useEffect(() => {
    if (!loadingRules) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    }
  }, [rules, loadingRules]);

  const addRule = () => {
    if (!newRule.ticker && newRule.type !== 'daily_summary') return;
    const rule: AlertRule = {
      ...newRule,
      id: `rule-${Date.now()}`,
      ticker: newRule.type === 'daily_summary' ? '*' : newRule.ticker.toUpperCase(),
    };
    setRules(prev => [...prev, rule]);
    setNewRule({ type: 'price_above', ticker: '', threshold: 0, enabled: true, note: '' });
    setShowAdd(false);
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const exportConfig = () => {
    const config: AlertConfig = { rules };
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isDailySummary = newRule.type === 'daily_summary';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold t-primary">Alert Settings</h1>
        <p className="text-sm t-muted mt-1">
          Configure price, score, and signal alerts. Notifications are sent via Telegram when the ETL pipeline runs.
        </p>
      </div>

      {/* Setup Guide */}
      <div className="card p-5 border-accent/20 bg-accent/5">
        <h2 className="text-sm font-semibold text-accent-light mb-3">Setup Guide</h2>
        <div className="space-y-3 text-xs t-tertiary">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-accent-light font-bold text-xs">1</span>
            <div>
              <p className="t-secondary font-medium">Create a Telegram Bot</p>
              <p className="mt-0.5">Open Telegram, search for <code className="text-accent-light bg-accent/10 px-1 rounded">@BotFather</code>, send <code className="text-accent-light bg-accent/10 px-1 rounded">/newbot</code>, and follow the prompts. Copy the bot token.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-accent-light font-bold text-xs">2</span>
            <div>
              <p className="t-secondary font-medium">Get your Chat ID</p>
              <p className="mt-0.5">Start a chat with your bot, then visit <code className="text-accent-light bg-accent/10 px-1 rounded text-[10px]">api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> to find your chat ID.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-accent-light font-bold text-xs">3</span>
            <div>
              <p className="t-secondary font-medium">Add GitHub Secrets</p>
              <p className="mt-0.5">In your repo: Settings → Secrets → Actions → Add <code className="text-accent-light bg-accent/10 px-1 rounded">TELEGRAM_BOT_TOKEN</code> and <code className="text-accent-light bg-accent/10 px-1 rounded">TELEGRAM_CHAT_ID</code>.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-accent-light font-bold text-xs">4</span>
            <div>
              <p className="t-secondary font-medium">Configure rules below, then copy to <code className="text-accent-light bg-accent/10 px-1 rounded">data/alerts.json</code></p>
              <p className="mt-0.5">The ETL pipeline checks these rules hourly and sends alerts for newly triggered conditions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider">Alert Rules</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportConfig}
              className="badge bg-surface-tertiary t-secondary ring-1 ring-surface-border hover:bg-surface-hover transition-colors cursor-pointer text-xs px-3 py-1.5"
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 hover:bg-accent/25 transition-colors cursor-pointer text-xs px-3 py-1.5"
            >
              + Add Rule
            </button>
          </div>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-8">
            <p className="t-muted text-sm">No alert rules configured yet.</p>
            <p className="t-faint text-xs mt-1">Click "Add Rule" to create your first alert.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  rule.enabled
                    ? 'bg-surface-hover/50 border-surface-border'
                    : 'bg-surface-tertiary/30 border-surface-border/50 opacity-60'
                }`}
              >
                {/* Toggle */}
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${
                    rule.enabled ? 'bg-bullish' : 'bg-surface-border'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                    rule.enabled ? 'left-[18px]' : 'left-0.5'
                  }`} />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold t-primary">{rule.ticker === '*' ? 'ALL' : rule.ticker}</span>
                    <span className="badge bg-surface-tertiary t-secondary ring-1 ring-surface-border text-[10px]">
                      {rule.type.replace(/_/g, ' ')}
                    </span>
                    {rule.type !== 'daily_summary' && (
                      <span className="text-xs font-mono t-muted">{rule.threshold}</span>
                    )}
                  </div>
                  {rule.note && <p className="text-xs t-muted mt-0.5 truncate">{rule.note}</p>}
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeRule(rule.id)}
                  className="text-sm t-muted hover:text-bearish transition-colors flex-shrink-0 w-7 h-7 rounded-lg hover:bg-bearish/10 flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Rule Form */}
      {showAdd && (
        <div className="card p-5 border-accent/20">
          <h3 className="text-sm font-semibold t-primary mb-4">New Alert Rule</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs t-muted block mb-1">Alert Type</label>
              <select
                value={newRule.type}
                onChange={e => setNewRule(prev => ({ ...prev, type: e.target.value }))}
                className="input-field w-full"
              >
                {ALERT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                ))}
              </select>
            </div>

            {!isDailySummary && (
              <>
                <div>
                  <label className="text-xs t-muted block mb-1">Ticker (or * for all stocks)</label>
                  <input
                    type="text"
                    value={newRule.ticker}
                    onChange={e => setNewRule(prev => ({ ...prev, ticker: e.target.value }))}
                    placeholder="e.g. AAPL or *"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-xs t-muted block mb-1">Threshold</label>
                  <input
                    type="number"
                    value={newRule.threshold || ''}
                    onChange={e => setNewRule(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                    placeholder="e.g. 200"
                    className="input-field w-full"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs t-muted block mb-1">Note (optional)</label>
              <input
                type="text"
                value={newRule.note || ''}
                onChange={e => setNewRule(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Reminder for why you set this alert"
                className="input-field w-full"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={addRule}
                className="badge bg-accent/15 text-accent-light ring-1 ring-accent/20 hover:bg-accent/25 transition-colors cursor-pointer text-sm px-4 py-2"
              >
                Add Rule
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="text-sm t-muted hover:t-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold t-tertiary uppercase tracking-wider mb-3">How Alerts Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs t-tertiary">
          <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
            <p className="font-semibold t-secondary mb-1">Edge-Triggered</p>
            <p>Alerts fire only when a condition <em>newly</em> becomes true. You won't get repeated alerts every hour for the same condition.</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
            <p className="font-semibold t-secondary mb-1">Hourly Checks</p>
            <p>The ETL runs every hour on weekdays (7am-9pm UTC). Alerts are checked after each run.</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
            <p className="font-semibold t-secondary mb-1">Wildcard Rules</p>
            <p>Use <code className="text-accent-light bg-accent/10 px-1 rounded">*</code> as ticker to apply a rule to ALL stocks (e.g., alert when any stock's score drops below 25).</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-hover border border-surface-border">
            <p className="font-semibold t-secondary mb-1">Copy JSON to Repo</p>
            <p>Rules are stored in your browser. Click "Copy JSON" and paste into <code className="text-accent-light bg-accent/10 px-1 rounded">data/alerts.json</code> in your repo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
