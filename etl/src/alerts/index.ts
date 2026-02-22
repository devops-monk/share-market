import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import type { StockRecord } from '../output/writer.js';
import type { AlertConfig, AlertState } from './types.js';
import { checkAlerts, generateDailySummary } from './checker.js';
import { sendAlerts, sendDailySummary } from './notify.js';

const dataDir = CONFIG.dataDir;
const alertsPath = path.join(dataDir, 'alerts.json');
const statePath = path.join(dataDir, 'alert-state.json');
const latestPath = path.join(dataDir, 'latest.json');

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

export async function runAlerts(): Promise<void> {
  console.log('--- Alert Checker ---');

  // Load data
  const stocks = loadJson<StockRecord[]>(latestPath, []);
  if (stocks.length === 0) {
    console.log('No stock data found — skipping alerts');
    return;
  }

  const config = loadJson<AlertConfig>(alertsPath, { rules: [] });
  const enabledRules = config.rules.filter(r => r.enabled);
  console.log(`Loaded ${config.rules.length} rules (${enabledRules.length} enabled)`);

  if (enabledRules.length === 0) {
    console.log('No enabled alert rules — skipping');
    return;
  }

  const prevState = loadJson<AlertState>(statePath, {});

  // Check conditions
  const { triggered, newState } = checkAlerts(enabledRules, stocks, prevState);
  console.log(`${triggered.length} alert(s) triggered`);

  // Send notifications
  if (triggered.length > 0) {
    await sendAlerts(triggered);
  }

  // Check if any rule is a daily_summary and it's the first run of the day
  const hasSummaryRule = enabledRules.some(r => r.type === 'daily_summary');
  if (hasSummaryRule) {
    const now = new Date();
    const hour = now.getUTCHours();
    // Send daily summary at the first ETL run of the day (7 UTC)
    if (hour <= 8) {
      const summaryKey = `daily_summary:${now.toISOString().slice(0, 10)}`;
      if (!(summaryKey in prevState)) {
        console.log('Sending daily summary...');
        const summary = generateDailySummary(stocks);
        await sendDailySummary(summary);
        newState[summaryKey] = now.toISOString();
      }
    }
  }

  // Save state for deduplication
  writeFileSync(statePath, JSON.stringify(newState, null, 2));
  console.log('Alert state saved');
}

// Run as standalone script
runAlerts()
  .then(() => {
    console.log('Alert check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Alert check failed:', err);
    process.exit(1);
  });
