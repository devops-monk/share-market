import { useRef, useCallback } from 'react';

const MIN_SWIPE_X = 50;
const MAX_DEVIATION_Y = 30;

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useSwipeNavigation(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - startX.current;
    const diffY = Math.abs(endY - startY.current);

    if (diffY > MAX_DEVIATION_Y) return;
    if (Math.abs(diffX) < MIN_SWIPE_X) return;

    if (diffX < 0 && onSwipeLeft) onSwipeLeft();
    else if (diffX > 0 && onSwipeRight) onSwipeRight();
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}
