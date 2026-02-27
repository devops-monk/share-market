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
  uptrend_below_resistance: '📐',
  top_owned_drop: '🏦',
  daily_summary: '📊',
};

const ALERT_TYPE_LABEL: Record<string, string> = {
  price_above: 'Price Breakout',
  price_below: 'Price Drop',
  score_above: 'Score Up',
  score_below: 'Score Down',
  bearish_score_above: 'Bearish Warning',
  rsi_above: 'Overbought',
  rsi_below: 'Oversold',
  minervini_pass: 'Minervini Setup',
  uptrend_below_resistance: 'Uptrend Pullback',
  top_owned_drop: 'Institutional Drop',
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

const TELEGRAM_MAX_LENGTH = 4000; // Telegram limit is 4096, leave margin for safety

/**
 * Format a single alert into an HTML block.
 */
function formatSingleAlert(alert: TriggeredAlert): string {
  const emoji = ALERT_TYPE_EMOJI[alert.type] ?? '🔔';
  const label = ALERT_TYPE_LABEL[alert.type] ?? alert.type.replace(/_/g, ' ');
  return `${emoji}  <b>${label}</b>\n${alert.message}`;
}

/**
 * Split alerts into multiple messages that fit within Telegram's 4096 char limit.
 */
export function formatAlertsMessages(alerts: TriggeredAlert[]): string[] {
  if (alerts.length === 0) return [];

  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  const footer = `\n<a href="https://share.devops-monk.com">Open Dashboard</a>`;
  const separator = `\n─────────────────────\n`;

  const messages: string[] = [];
  let currentLines: string[] = [];
  let currentLen = 0;
  let pageNum = 1;

  const makeHeader = (page: number, total?: number) => {
    const pageStr = total != null ? ` (${page}/${total})` : '';
    return `<b>🔔  ${alerts.length} Alert${alerts.length > 1 ? 's' : ''} Triggered${pageStr}</b>  ·  <i>${time} UTC</i>\n`;
  };

  // Estimate header size (use worst case with page numbers)
  const headerSize = makeHeader(1, 99).length;

  for (let i = 0; i < alerts.length; i++) {
    const block = formatSingleAlert(alerts[i]);
    const addLen = block.length + separator.length;

    // Check if adding this alert would exceed the limit
    if (currentLines.length > 0 && currentLen + addLen + headerSize + footer.length > TELEGRAM_MAX_LENGTH) {
      // Flush current batch as a message
      messages.push(currentLines.join(separator));
      currentLines = [];
      currentLen = 0;
      pageNum++;
    }

    currentLines.push(block);
    currentLen += block.length + separator.length;
  }

  // Flush remaining
  if (currentLines.length > 0) {
    messages.push(currentLines.join(separator));
  }

  // Build final messages with headers and footer
  const totalPages = messages.length;
  return messages.map((body, i) => {
    const header = totalPages > 1 ? makeHeader(i + 1, totalPages) : makeHeader(1);
    return header + '\n' + body + '\n' + footer;
  });
}

/**
 * Send all triggered alerts, splitting into multiple messages if needed.
 * Falls back to ntfy.sh if Telegram fails.
 */
export async function sendAlerts(alerts: TriggeredAlert[]): Promise<void> {
  if (alerts.length === 0) {
    console.log('No alerts to send');
    return;
  }

  const messages = formatAlertsMessages(alerts);
  console.log(`Sending ${alerts.length} alert(s) in ${messages.length} message(s)...`);

  let allOk = true;
  for (const msg of messages) {
    const ok = await sendTelegram(msg);
    if (!ok) { allOk = false; break; }
    // Small delay between messages to avoid rate limiting
    if (messages.length > 1) await new Promise(r => setTimeout(r, 500));
  }

  if (allOk) {
    console.log('Alerts sent via Telegram');
  } else {
    // Fallback to ntfy — send as plain text (ntfy has no length issue)
    const title = `${alerts.length} Stock Alert${alerts.length > 1 ? 's' : ''}`;
    const plainMessage = alerts.map(a => {
      const label = ALERT_TYPE_LABEL[a.type] ?? a.type.replace(/_/g, ' ');
      return `${label}: ${a.message}`;
    }).join('\n\n');
    const ntfyOk = await sendNtfy(plainMessage, title);
    if (ntfyOk) {
      console.log('Alerts sent via ntfy.sh');
    } else {
      console.log('No notification channel configured — alerts logged to console only');
      for (const msg of messages) console.log(msg);
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
