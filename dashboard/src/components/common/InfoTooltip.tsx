import { useState, useRef, useEffect } from 'react';

interface Props {
  text: string;
  children: React.ReactNode;
}

/**
 * Wrap any label/header with this to show an info tooltip on hover.
 * On mobile, tapping toggles the tooltip.
 */
export default function InfoTooltip({ text, children }: Props) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  if (!text) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center gap-1 group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(v => !v)}
    >
      {children}
      <svg className="w-3 h-3 t-faint flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-surface-tertiary border border-surface-border text-xs t-secondary px-3 py-2 rounded-lg shadow-xl max-w-[260px] leading-relaxed whitespace-normal text-left">
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simpler inline version — just wraps text with a dashed underline and tooltip.
 */
export function HelpLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <InfoTooltip text={tip}>
      <span className="cursor-help border-b border-dashed border-surface-border">{label}</span>
    </InfoTooltip>
  );
}
