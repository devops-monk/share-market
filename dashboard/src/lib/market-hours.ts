// US Market hours: Mon-Fri 9:30 AM - 4:00 PM Eastern Time

export function isUSMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false; // weekend
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  return timeInMinutes >= 570 && timeInMinutes < 960; // 9:30=570, 16:00=960
}

export function formatMarketStatus(): { label: string; isOpen: boolean } {
  if (isUSMarketOpen()) {
    return { label: 'Market Open', isOpen: true };
  }

  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (day >= 1 && day <= 5) {
    if (timeInMinutes < 570) {
      const minsUntilOpen = 570 - timeInMinutes;
      const h = Math.floor(minsUntilOpen / 60);
      const m = minsUntilOpen % 60;
      return { label: `Opens in ${h}h ${m}m`, isOpen: false };
    }
    if (timeInMinutes >= 960) {
      return { label: 'Market Closed', isOpen: false };
    }
  }

  return { label: 'Market Closed', isOpen: false };
}
