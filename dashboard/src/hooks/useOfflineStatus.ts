import { useState, useEffect, useCallback } from 'react';

export interface OfflineStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  cachedDataAge: number | null; // minutes
  usingCachedData: boolean;
}

const SYNC_KEY = 'sm-last-sync';

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    () => localStorage.getItem(SYNC_KEY)
  );

  const updateOnline = useCallback(() => setIsOnline(navigator.onLine), []);

  useEffect(() => {
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DATA_UPDATED') {
        const now = new Date().toISOString();
        setLastSyncTime(now);
        localStorage.setItem(SYNC_KEY, now);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [updateOnline]);

  const cachedDataAge = lastSyncTime
    ? Math.round((Date.now() - new Date(lastSyncTime).getTime()) / 60000)
    : null;

  return {
    isOnline,
    lastSyncTime,
    cachedDataAge,
    usingCachedData: !isOnline && lastSyncTime !== null,
  };
}
