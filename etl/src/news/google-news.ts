import Parser from 'rss-parser';

const parser = new Parser();

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  ticker: string;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function fetchGoogleNews(ticker: string, companyName: string): Promise<NewsItem[]> {
  try {
    const query = encodeURIComponent(`${companyName} stock`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;
    const feed = await parser.parseURL(url);
    await delay(1000);

    return (feed.items || []).slice(0, 5).map(item => ({
      title: item.title || '',
      link: item.link || '',
      source: item.creator || 'Google News',
      pubDate: item.pubDate || new Date().toISOString(),
      ticker,
    }));
  } catch (err) {
    console.warn(`Google News failed for ${ticker}:`, (err as Error).message);
    return [];
  }
}
