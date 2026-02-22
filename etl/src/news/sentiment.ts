import type { NewsItem } from './google-news.js';
import type { FinvizNews } from './finviz-scraper.js';

// ---------------------------------------------------------------------------
// Finance-specific sentiment analyzer
//   - ~200-word finance lexicon (unigrams)
//   - Bigram / phrase support
//   - Negation handling ("not", "no", "never", "n't", "barely", "hardly")
//   - Positional weighting (first half of headline weighted more)
//   - Output: sentimentScore (-1 … 1), sentimentLabel
// ---------------------------------------------------------------------------

export interface ScoredNews {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  ticker: string;
  sentimentScore: number; // -1 to 1
  sentimentLabel: 'positive' | 'negative' | 'neutral';
}

/* ── Unigram lexicon (word → score, range roughly -5 … +5) ──────────────── */

const UNIGRAM_LEXICON: Record<string, number> = {
  // strong positive
  soar: 4, soars: 4, soared: 4, soaring: 4,
  surge: 4, surges: 4, surged: 4, surging: 4,
  skyrocket: 5, skyrockets: 5, skyrocketed: 5,
  boom: 4, booming: 4,
  rally: 3, rallies: 3, rallied: 3, rallying: 3,
  breakout: 3,
  bullish: 3,
  outperform: 3, outperforms: 3, outperformed: 3,
  upgrade: 3, upgrades: 3, upgraded: 3,
  beat: 3, beats: 3, beating: 3,
  exceeded: 3, exceeds: 3, exceeding: 3,
  record: 2,
  profit: 2, profits: 2, profitable: 3, profitability: 3,
  growth: 2,
  gain: 2, gains: 2, gained: 2,
  rise: 2, rises: 2, rising: 2, risen: 2,
  up: 1,
  higher: 2,
  jump: 3, jumps: 3, jumped: 3, jumping: 3,
  recover: 2, recovers: 2, recovered: 2, recovery: 2,
  rebound: 3, rebounds: 3, rebounded: 3,
  optimistic: 2, optimism: 2,
  positive: 2,
  strong: 2, stronger: 2, strongest: 2, strength: 2,
  robust: 2,
  momentum: 2,
  accelerate: 3, accelerates: 3, accelerated: 3, acceleration: 3,
  expand: 2, expands: 2, expanded: 2, expansion: 2,
  dividend: 2, dividends: 2,
  buyback: 2, buybacks: 2, repurchase: 2,
  acquisition: 1, acquire: 1, acquires: 1, acquired: 1,
  innovation: 2, innovative: 2,
  breakthrough: 3,
  approval: 3, approved: 3, approves: 3,
  launch: 2, launches: 2, launched: 2,
  partnership: 2,
  collaboration: 1,
  confidence: 2, confident: 2,
  opportunity: 2, opportunities: 2,
  upside: 3,
  overweight: 2,
  buy: 2,
  accumulate: 2,
  boost: 2, boosts: 2, boosted: 2, boosting: 2,
  top: 1, tops: 1, topped: 1, topping: 1,
  win: 2, wins: 2, winning: 2, won: 2,
  success: 2, successful: 2,
  ipo: 1,
  upbeat: 2,
  stellar: 3,
  blowout: 3,
  blockbuster: 3,
  impressive: 2,
  remarkable: 2,
  fantastic: 3,
  excellent: 3,
  surprise: 2,

  // moderate / mild positive
  steady: 1, stable: 1, stability: 1,
  improve: 1, improves: 1, improved: 1, improvement: 1,
  support: 1, supports: 1, supported: 1,
  maintain: 1, maintained: 1, maintains: 1,
  resilient: 2, resilience: 2,
  healthy: 1,
  solid: 1,

  // strong negative
  crash: -5, crashes: -5, crashed: -5, crashing: -5,
  collapse: -5, collapses: -5, collapsed: -5,
  bankruptcy: -5, bankrupt: -5,
  default: -4, defaults: -4, defaulted: -4,
  fraud: -5, fraudulent: -5,
  scandal: -4, scandals: -4,
  indictment: -4, indicted: -4,
  investigation: -3, investigations: -3,
  lawsuit: -3, lawsuits: -3, litigation: -3,
  fine: -2, fined: -3, penalty: -3, penalties: -3,
  recession: -4, recessionary: -4,
  plunge: -4, plunges: -4, plunged: -4, plunging: -4,
  plummet: -4, plummets: -4, plummeted: -4, plummeting: -4,
  tank: -3, tanks: -3, tanked: -3, tanking: -3,
  tumble: -3, tumbles: -3, tumbled: -3, tumbling: -3,
  sink: -3, sinks: -3, sank: -3, sinking: -3,
  selloff: -3, sell: -1,
  bearish: -3,
  downgrade: -3, downgrades: -3, downgraded: -3,
  miss: -3, misses: -3, missed: -3, missing: -2,
  disappoint: -3, disappoints: -3, disappointed: -3, disappointing: -3, disappointment: -3,
  loss: -3, losses: -3, lost: -2,
  decline: -2, declines: -2, declined: -2, declining: -2,
  drop: -2, drops: -2, dropped: -2, dropping: -2,
  fall: -2, falls: -2, fell: -2, falling: -2,
  down: -1,
  lower: -2, lowest: -3,
  weak: -2, weaker: -2, weakest: -3, weakness: -2,
  negative: -2,
  pessimistic: -2, pessimism: -2,
  risk: -1, risks: -1, risky: -2,
  warning: -3, warn: -2, warns: -2, warned: -2,
  caution: -2, cautious: -2,
  fear: -2, fears: -2,
  concern: -2, concerns: -2, concerned: -2,
  uncertainty: -2, uncertain: -2,
  volatile: -2, volatility: -2,
  underperform: -3, underperforms: -3, underperformed: -3,
  underweight: -2,
  layoff: -3, layoffs: -3,
  restructuring: -2,
  cut: -2, cuts: -2, cutting: -2,
  slash: -3, slashes: -3, slashed: -3,
  halt: -2, halts: -2, halted: -2,
  suspend: -3, suspends: -3, suspended: -3, suspension: -3,
  delist: -4, delisted: -4, delisting: -4,
  recall: -3, recalls: -3, recalled: -3,
  shortage: -2, shortages: -2,
  debt: -1,
  deficit: -2,
  inflation: -1, inflationary: -2,
  overvalued: -2,
  bubble: -2,
  downside: -3,
  trouble: -2, troubled: -2,
  crisis: -4,
  slump: -3, slumps: -3, slumped: -3, slumping: -3,
  stagnant: -2, stagnation: -2,
  erosion: -2, erode: -2, erodes: -2, eroded: -2,
  writedown: -3, writeoff: -3, impairment: -3,
  subpoena: -3, probe: -2,
  violation: -3, violations: -3,
  closure: -2, closures: -2, shut: -2, shutdown: -3,
  slowdown: -2,
  headwind: -2, headwinds: -2,
  tariff: -1, tariffs: -1, sanctions: -2,
  gap: -1,
};

/* ── Bigram / phrase lexicon ────────────────────────────────────────────── */

interface PhraseDef {
  phrase: string;
  score: number;
}

const PHRASE_LEXICON: PhraseDef[] = [
  // positive phrases
  { phrase: 'beat estimates', score: 4 },
  { phrase: 'beat expectations', score: 4 },
  { phrase: 'beats estimates', score: 4 },
  { phrase: 'beats expectations', score: 4 },
  { phrase: 'topped estimates', score: 4 },
  { phrase: 'tops estimates', score: 4 },
  { phrase: 'exceeded expectations', score: 4 },
  { phrase: 'exceeds expectations', score: 4 },
  { phrase: 'record revenue', score: 4 },
  { phrase: 'record profit', score: 4 },
  { phrase: 'record earnings', score: 4 },
  { phrase: 'record high', score: 4 },
  { phrase: 'all time high', score: 4 },
  { phrase: 'all-time high', score: 4 },
  { phrase: 'strong growth', score: 3 },
  { phrase: 'strong earnings', score: 3 },
  { phrase: 'strong results', score: 3 },
  { phrase: 'strong demand', score: 3 },
  { phrase: 'strong quarter', score: 3 },
  { phrase: 'revenue growth', score: 3 },
  { phrase: 'earnings growth', score: 3 },
  { phrase: 'profit growth', score: 3 },
  { phrase: 'sales growth', score: 3 },
  { phrase: 'guidance raised', score: 4 },
  { phrase: 'raises guidance', score: 4 },
  { phrase: 'raised guidance', score: 4 },
  { phrase: 'raise guidance', score: 4 },
  { phrase: 'raises outlook', score: 3 },
  { phrase: 'raised outlook', score: 3 },
  { phrase: 'upward revision', score: 3 },
  { phrase: 'dividend increase', score: 3 },
  { phrase: 'dividend hike', score: 3 },
  { phrase: 'increases dividend', score: 3 },
  { phrase: 'increased dividend', score: 3 },
  { phrase: 'special dividend', score: 3 },
  { phrase: 'stock split', score: 2 },
  { phrase: 'price target raised', score: 3 },
  { phrase: 'price target increased', score: 3 },
  { phrase: 'market share', score: 1 },
  { phrase: 'market share gains', score: 3 },
  { phrase: 'new contract', score: 2 },
  { phrase: 'major contract', score: 3 },
  { phrase: 'fda approval', score: 4 },
  { phrase: 'fda approved', score: 4 },
  { phrase: 'positive data', score: 3 },
  { phrase: 'positive results', score: 3 },
  { phrase: 'share buyback', score: 2 },
  { phrase: 'stock buyback', score: 2 },
  { phrase: 'insider buying', score: 2 },
  { phrase: 'short squeeze', score: 3 },
  { phrase: 'green light', score: 2 },
  { phrase: 'turns profitable', score: 3 },
  { phrase: 'margin expansion', score: 3 },
  { phrase: 'margin improvement', score: 3 },
  { phrase: 'cost savings', score: 2 },
  { phrase: 'debt reduction', score: 2 },
  { phrase: 'cash flow', score: 1 },
  { phrase: 'free cash flow', score: 2 },
  { phrase: 'above consensus', score: 3 },

  // negative phrases
  { phrase: 'missed expectations', score: -4 },
  { phrase: 'missed estimates', score: -4 },
  { phrase: 'misses expectations', score: -4 },
  { phrase: 'misses estimates', score: -4 },
  { phrase: 'miss estimates', score: -4 },
  { phrase: 'miss expectations', score: -4 },
  { phrase: 'below expectations', score: -3 },
  { phrase: 'below estimates', score: -3 },
  { phrase: 'below consensus', score: -3 },
  { phrase: 'guidance lowered', score: -4 },
  { phrase: 'lowers guidance', score: -4 },
  { phrase: 'lowered guidance', score: -4 },
  { phrase: 'lower guidance', score: -4 },
  { phrase: 'cuts guidance', score: -4 },
  { phrase: 'cut guidance', score: -4 },
  { phrase: 'guidance cut', score: -4 },
  { phrase: 'lowers outlook', score: -3 },
  { phrase: 'lowered outlook', score: -3 },
  { phrase: 'downward revision', score: -3 },
  { phrase: 'sec investigation', score: -4 },
  { phrase: 'sec probe', score: -4 },
  { phrase: 'sec charges', score: -4 },
  { phrase: 'sec filing', score: 0 },
  { phrase: 'debt default', score: -5 },
  { phrase: 'dividend cut', score: -4 },
  { phrase: 'dividend suspended', score: -4 },
  { phrase: 'suspends dividend', score: -4 },
  { phrase: 'dividend elimination', score: -4 },
  { phrase: 'going concern', score: -4 },
  { phrase: 'chapter 11', score: -5 },
  { phrase: 'chapter 7', score: -5 },
  { phrase: 'price target lowered', score: -3 },
  { phrase: 'price target cut', score: -3 },
  { phrase: 'price target reduced', score: -3 },
  { phrase: 'profit warning', score: -4 },
  { phrase: 'revenue decline', score: -3 },
  { phrase: 'revenue miss', score: -4 },
  { phrase: 'earnings miss', score: -4 },
  { phrase: 'sales decline', score: -3 },
  { phrase: 'weak demand', score: -3 },
  { phrase: 'weak earnings', score: -3 },
  { phrase: 'weak results', score: -3 },
  { phrase: 'weak guidance', score: -3 },
  { phrase: 'weak quarter', score: -3 },
  { phrase: 'insider selling', score: -2 },
  { phrase: 'margin compression', score: -3 },
  { phrase: 'margin pressure', score: -2 },
  { phrase: 'supply chain', score: -1 },
  { phrase: 'class action', score: -3 },
  { phrase: 'data breach', score: -3 },
  { phrase: 'accounting irregularities', score: -4 },
  { phrase: 'accounting fraud', score: -5 },
  { phrase: 'material weakness', score: -3 },
  { phrase: 'negative outlook', score: -3 },
  { phrase: 'credit downgrade', score: -4 },
  { phrase: 'junk status', score: -4 },
  { phrase: 'trading halted', score: -3 },
  { phrase: 'mass layoffs', score: -4 },
  { phrase: 'job cuts', score: -3 },
  { phrase: 'store closures', score: -3 },
  { phrase: 'plant closure', score: -3 },
  { phrase: 'write down', score: -3 },
  { phrase: 'write off', score: -3 },
  { phrase: 'short seller', score: -2 },
  { phrase: 'short report', score: -3 },
  { phrase: 'death cross', score: -2 },
  { phrase: 'bear market', score: -3 },
  { phrase: 'market crash', score: -5 },
  { phrase: 'flash crash', score: -4 },
  { phrase: 'lost market share', score: -3 },
  { phrase: 'loses market share', score: -3 },
  { phrase: 'losing market share', score: -3 },
];

/* ── Negation words ─────────────────────────────────────────────────────── */

const NEGATION_WORDS = new Set([
  'not', 'no', 'never', 'neither', 'nobody', 'nothing',
  'nowhere', 'nor', 'hardly', 'barely', 'scarcely',
  "don't", "doesn't", "didn't", "wasn't", "weren't",
  "won't", "wouldn't", "shouldn't", "couldn't", "can't",
  "isn't", "aren't", "hasn't", "haven't",
  'dont', 'doesnt', 'didnt', 'wasnt', 'werent',
  'wont', 'wouldnt', 'shouldnt', 'couldnt', 'cant',
  'isnt', 'arent', 'hasnt', 'havent',
  'without', 'lack', 'lacks', 'lacked', 'lacking',
  'fail', 'fails', 'failed',
]);

// Negation window: how many tokens ahead a negation word affects
const NEGATION_WINDOW = 3;

/* ── Helpers ────────────────────────────────────────────────────────────── */

/** Tokenise headline into lowercase tokens (keeps contractions). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Positional weight: tokens in the first half of the headline get weight 1.2,
 * tokens in the second half get weight 0.8.
 */
function positionalWeight(index: number, totalTokens: number): number {
  if (totalTokens <= 1) return 1;
  const midpoint = totalTokens / 2;
  return index < midpoint ? 1.2 : 0.8;
}

/* ── Core scoring function ──────────────────────────────────────────────── */

function scoreHeadline(title: string): { score: number; label: 'positive' | 'negative' | 'neutral' } {
  const lower = title.toLowerCase();
  const tokens = tokenize(title);
  const totalTokens = tokens.length;

  if (totalTokens === 0) {
    return { score: 0, label: 'neutral' };
  }

  // Track which token positions have already been scored by a phrase match
  // so we don't double-count them with unigram scores.
  const phraseConsumed = new Set<number>();

  let rawScore = 0;
  let scoringTokens = 0;

  // 1. Phrase / bigram matching
  for (const { phrase, score: phraseScore } of PHRASE_LEXICON) {
    const idx = lower.indexOf(phrase);
    if (idx === -1) continue;

    // Determine approximate token position of the phrase start
    const prefix = lower.slice(0, idx);
    const tokenPosBefore = prefix.split(/\s+/).filter(Boolean).length;
    const phraseTokenCount = phrase.split(/\s+/).length;

    // Check for negation before the phrase
    let negated = false;
    for (let n = Math.max(0, tokenPosBefore - NEGATION_WINDOW); n < tokenPosBefore; n++) {
      if (n < tokens.length && NEGATION_WORDS.has(tokens[n])) {
        negated = true;
        break;
      }
    }

    const effectiveScore = negated ? -phraseScore * 0.5 : phraseScore;
    const weight = positionalWeight(tokenPosBefore, totalTokens);
    rawScore += effectiveScore * weight;
    scoringTokens += phraseTokenCount;

    // Mark phrase token positions as consumed
    for (let p = tokenPosBefore; p < tokenPosBefore + phraseTokenCount && p < totalTokens; p++) {
      phraseConsumed.add(p);
    }
  }

  // 2. Unigram matching (skip phrase-consumed positions)
  // Build a negation mask: true if the token at position i is under negation
  const negationMask: boolean[] = new Array<boolean>(totalTokens).fill(false);
  for (let i = 0; i < totalTokens; i++) {
    if (NEGATION_WORDS.has(tokens[i])) {
      for (let j = i + 1; j <= Math.min(i + NEGATION_WINDOW, totalTokens - 1); j++) {
        negationMask[j] = true;
      }
    }
  }

  for (let i = 0; i < totalTokens; i++) {
    if (phraseConsumed.has(i)) continue;

    const token = tokens[i];
    const unigramScore = UNIGRAM_LEXICON[token];
    if (unigramScore === undefined) continue;

    const effectiveScore = negationMask[i] ? -unigramScore * 0.5 : unigramScore;
    const weight = positionalWeight(i, totalTokens);
    rawScore += effectiveScore * weight;
    scoringTokens++;
  }

  // 3. Normalise to -1 … 1
  // Divide by scoring tokens so longer headlines don't automatically score higher.
  // Scale factor: a score of ±5 per token → ±1
  const normFactor = 5;
  const normalized = Math.max(
    -1,
    Math.min(1, rawScore / (Math.max(scoringTokens, 1) * normFactor)),
  );

  const label: 'positive' | 'negative' | 'neutral' =
    normalized > 0.1 ? 'positive' : normalized < -0.1 ? 'negative' : 'neutral';

  return { score: normalized, label };
}

/* ── Public API (unchanged signatures) ──────────────────────────────────── */

export function scoreNewsItems(items: (NewsItem | FinvizNews)[]): ScoredNews[] {
  return items.map(item => {
    const { score, label } = scoreHeadline(item.title);
    return {
      title: item.title,
      link: item.link,
      source: item.source,
      pubDate: item.pubDate,
      ticker: item.ticker,
      sentimentScore: Math.round(score * 1000) / 1000,
      sentimentLabel: label,
    };
  });
}

export function averageSentiment(scored: ScoredNews[]): number {
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, s) => acc + s.sentimentScore, 0);
  return sum / scored.length;
}
