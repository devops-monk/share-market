interface OfflineBannerProps {
  isOnline: boolean;
  cachedDataAge: number | null;
}

export default function OfflineBanner({ isOnline, cachedDataAge }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center">
      <p className="text-xs font-medium text-amber-400">
        You're offline. {cachedDataAge !== null
          ? `Showing cached data from ${cachedDataAge < 1 ? 'just now' : cachedDataAge < 60 ? `${cachedDataAge}m ago` : `${Math.round(cachedDataAge / 60)}h ago`}.`
          : 'Some features may be unavailable.'}
      </p>
    </div>
  );
}
