export interface PriceLevel {
  price: number;
  strength: number;  // number of touches
  type: 'support' | 'resistance';
}

/**
 * Swing-point algorithm that identifies support and resistance levels
 * from OHLCV chart data.
 *
 * 1. Find swing highs (local maxima) and swing lows (local minima) using a 5-bar window.
 * 2. Cluster nearby levels (within 2% of each other), keeping the one with the most touches.
 * 3. Return top 3 support levels (below current price) and top 3 resistance levels (above).
 */
export function computeSupportResistance(
  highs: number[],
  lows: number[],
  closes: number[],
  currentPrice: number,
): PriceLevel[] {
  if (highs.length < 5) return [];

  const WINDOW = 2; // 5-bar window: i-2 .. i+2
  const CLUSTER_PCT = 0.02; // 2% clustering threshold

  // --- Step 1: Find swing highs and swing lows ---
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = WINDOW; i < highs.length - WINDOW; i++) {
    // Check if high[i] is a local maximum within the window
    let isSwingHigh = true;
    for (let j = i - WINDOW; j <= i + WINDOW; j++) {
      if (j !== i && highs[j] >= highs[i]) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) swingHighs.push(highs[i]);

    // Check if low[i] is a local minimum within the window
    let isSwingLow = true;
    for (let j = i - WINDOW; j <= i + WINDOW; j++) {
      if (j !== i && lows[j] <= lows[i]) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) swingLows.push(lows[i]);
  }

  // Combine all swing points into a single list with initial strength of 1
  const allLevels: { price: number; strength: number }[] = [];
  for (const p of swingHighs) allLevels.push({ price: p, strength: 1 });
  for (const p of swingLows) allLevels.push({ price: p, strength: 1 });

  if (allLevels.length === 0) return [];

  // --- Step 2: Cluster nearby levels (within 2%) ---
  // Sort by price ascending for clustering
  allLevels.sort((a, b) => a.price - b.price);

  const clusters: { price: number; strength: number }[] = [];
  let clusterStart = 0;

  for (let i = 1; i <= allLevels.length; i++) {
    // If we've gone past the end or the next level is more than 2% away from cluster start
    if (
      i === allLevels.length ||
      (allLevels[i].price - allLevels[clusterStart].price) / allLevels[clusterStart].price > CLUSTER_PCT
    ) {
      // Merge cluster: pick the level with the most touches
      // (since all start at 1, we accumulate total touches and use the median price)
      let totalStrength = 0;
      let priceSum = 0;
      for (let j = clusterStart; j < i; j++) {
        totalStrength += allLevels[j].strength;
        priceSum += allLevels[j].price;
      }
      const count = i - clusterStart;
      clusters.push({
        price: +(priceSum / count).toFixed(2),
        strength: totalStrength,
      });
      clusterStart = i;
    }
  }

  // --- Step 3: Count additional "touches" ---
  // A touch is when any close gets within 0.5% of the level
  const TOUCH_PCT = 0.005;
  for (const cluster of clusters) {
    let touches = 0;
    for (const c of closes) {
      if (Math.abs(c - cluster.price) / cluster.price <= TOUCH_PCT) {
        touches++;
      }
    }
    // Add close-based touches to the swing-based strength
    cluster.strength += touches;
  }

  // --- Step 4: Split into support and resistance ---
  const supports = clusters
    .filter(c => c.price < currentPrice)
    .sort((a, b) => b.strength - a.strength) // strongest first
    .slice(0, 3)
    .map(c => ({ price: c.price, strength: c.strength, type: 'support' as const }));

  const resistances = clusters
    .filter(c => c.price >= currentPrice)
    .sort((a, b) => b.strength - a.strength) // strongest first
    .slice(0, 3)
    .map(c => ({ price: c.price, strength: c.strength, type: 'resistance' as const }));

  // Return resistances sorted by price ascending, then supports sorted by price descending
  return [
    ...resistances.sort((a, b) => a.price - b.price),
    ...supports.sort((a, b) => b.price - a.price),
  ];
}
