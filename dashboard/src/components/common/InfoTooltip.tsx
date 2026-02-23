import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  text: string;
  children: React.ReactNode;
}

/**
 * Wrap any label/header with this to show an info tooltip on hover.
 * Uses a portal + fixed positioning so tooltips aren't clipped by
 * overflow:hidden containers (e.g. scrollable tables).
 * On mobile, tapping toggles the tooltip.
 */
export default function InfoTooltip({ text, children }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      top: rect.top - 8, // 8px gap above the trigger
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    if (!show) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, updatePosition]);

  // Clamp tooltip to viewport after it renders
  useEffect(() => {
    if (!show || !pos || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const rect = el.getBoundingClientRect();
    // Clamp left edge so it doesn't overflow the viewport
    if (rect.left < 8) {
      el.style.transform = `translateX(${8 - rect.left}px)`;
    } else if (rect.right > window.innerWidth - 8) {
      el.style.transform = `translateX(${window.innerWidth - 8 - rect.right}px)`;
    }
  }, [show, pos]);

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
      {show && pos && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-surface-tertiary border border-surface-border text-xs t-secondary px-3 py-2 rounded-lg shadow-xl max-w-[260px] leading-relaxed whitespace-normal text-left">
            {text}
          </div>
        </div>,
        document.body
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
