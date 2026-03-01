import { useState, useEffect, useCallback, useRef } from 'react';

const THRESHOLD = 80;
const MAX_PULL = 120;

export function usePullToRefresh(onRefresh?: () => void) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta < 0) { isPulling.current = false; return; }
    const distance = Math.min(delta, MAX_PULL);
    if (distance > 10) {
      setPulling(true);
      setPullDistance(distance);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current && !pulling) return;
    if (pullDistance >= THRESHOLD) {
      if (onRefresh) onRefresh();
      else window.location.reload();
    }
    setPulling(false);
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance, pulling, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pulling, pullDistance, threshold: THRESHOLD };
}
