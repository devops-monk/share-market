import type { ConnectionStatus as Status } from '../../hooks/useRealtimePrices';

const STATUS_CONFIG: Record<Status, { color: string; bg: string; label: string }> = {
  connected: { color: 'bg-bullish', bg: 'bg-bullish/10', label: 'Live' },
  connecting: { color: 'bg-yellow-500', bg: 'bg-yellow-500/10', label: 'Connecting...' },
  disconnected: { color: 'bg-red-500', bg: 'bg-red-500/10', label: 'Offline' },
  'market-closed': { color: 'bg-gray-400', bg: 'bg-gray-400/10', label: 'Market Closed' },
  'no-key': { color: 'bg-gray-400', bg: 'bg-gray-400/10', label: 'No Key' },
};

export default function ConnectionStatus({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} ${status === 'connected' ? 'animate-pulse' : ''}`} />
      <span className="t-secondary">{config.label}</span>
    </div>
  );
}
