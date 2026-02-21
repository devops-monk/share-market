import * as cheerio from 'cheerio';

export interface FinvizNews {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  ticker: string;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function fetchFinvizNews(ticker: string): Promise<FinvizNews[]> {
  try {
    // Only works for US stocks (no .L suffix)
    if (ticker.includes('.')) return [];

    const url = `https://finviz.com/quote.ashx?t=${ticker}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const news: FinvizNews[] = [];

    $('table.fullview-news-outer tr').each((_, row) => {
      const link = $(row).find('a.tab-link-news');
      const title = link.text().trim();
      const href = link.attr('href') || '';
      const source = $(row).find('.news-link-right span').text().trim();
      const dateText = $(row).find('td:first-child').text().trim();

      if (title) {
        news.push({
          title,
          link: href,
          source: source || 'FinViz',
          pubDate: dateText || new Date().toISOString(),
          ticker,
        });
      }
    });

    await delay(2000); // Respect rate limits
    return news.slice(0, 5);
  } catch (err) {
    console.warn(`FinViz failed for ${ticker}:`, (err as Error).message);
    return [];
  }
}
