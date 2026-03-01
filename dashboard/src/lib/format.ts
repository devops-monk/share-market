const CURRENCY_MAP: Record<string, string> = {
  US: '$', UK: '£', IN: '₹', DE: '€', FR: '€', JP: '¥', HK: 'HK$',
};

export function currencySymbol(market: string): string {
  return CURRENCY_MAP[market] || '$';
}

export function formatPrice(price: number, market: string): string {
  return `${currencySymbol(market)}${price.toFixed(2)}`;
}
