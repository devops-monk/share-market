import type { TriggeredAlert } from './types.js';

const ALERT_TYPE_EMOJI: Record<string, string> = {
  price_above: '📈',
  price_below: '📉',
  score_above: '🟢',
  score_below: '🔴',
  bearish_score_above: '⚠️',
  rsi_above: '🔥',
  rsi_below: '💎',
  minervini_pass: '🎯',
  daily_summary: '📊',
};

/**
 * Send a message via Telegram Bot API.
 */
export async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Telegram API error: ${res.status} — ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Telegram send failed:', err);
    return false;
  }
}

/**
 * Send a message via ntfy.sh (backup notification channel).
 */
export async function sendNtfy(message: string, title: string): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;

  if (!topic) return false;

  try {
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': '4',
        'Tags': 'chart_with_upwards_trend',
      },
      body: message,
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Format triggered alerts into a single Telegram message (HTML mode).
 */
export function formatAlertsMessage(alerts: TriggeredAlert[]): string {
  if (alerts.length === 0) return '';

  const lines = [
    `<b>🔔 ${alerts.length} Alert${alerts.length > 1 ? 's' : ''} Triggered</b>`,
    '',
  ];

  for (const alert of alerts) {
    const emoji = ALERT_TYPE_EMOJI[alert.type] ?? '🔔';
    const typeLabel = alert.type.replace(/_/g, ' ').toUpperCase();
    lines.push(`${emoji} <b>${typeLabel}</b>`);
    lines.push(alert.message);
    lines.push('');
  }

  lines.push(`<i>via StockMarket Dashboard</i>`);
  return lines.join('\n');
}

/**
 * Send all triggered alerts as a single batch message.
 * Falls back to ntfy.sh if Telegram fails.
 */
export async function sendAlerts(alerts: TriggeredAlert[]): Promise<void> {
  if (alerts.length === 0) {
    console.log('No alerts to send');
    return;
  }

  const message = formatAlertsMessage(alerts);
  console.log(`Sending ${alerts.length} alert(s)...`);

  const telegramOk = await sendTelegram(message);
  if (telegramOk) {
    console.log('Alerts sent via Telegram');
  } else {
    // Fallback to ntfy
    const title = `${alerts.length} Stock Alert${alerts.length > 1 ? 's' : ''}`;
    const plainMessage = alerts.map(a => `${a.type.replace(/_/g, ' ').toUpperCase()}: ${a.message}`).join('\n\n');
    const ntfyOk = await sendNtfy(plainMessage, title);
    if (ntfyOk) {
      console.log('Alerts sent via ntfy.sh');
    } else {
      console.log('No notification channel configured — alerts logged to console only');
      console.log(message);
    }
  }
}

/**
 * Send the daily summary message.
 */
export async function sendDailySummary(summaryText: string): Promise<void> {
  const telegramOk = await sendTelegram(summaryText);
  if (!telegramOk) {
    await sendNtfy(summaryText, '📊 Daily Market Summary');
  }
}
