import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sm-pwa-dismissed';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const install = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50
      bg-surface-secondary border border-accent/30 rounded-xl shadow-xl p-4
      flex items-center gap-3 animate-slide-up">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold t-primary">Install App</p>
        <p className="text-xs t-muted mt-0.5">Add to home screen for quick access and offline support</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={dismiss}
          className="text-xs t-muted hover:t-secondary transition-colors px-2 py-1"
        >
          Later
        </button>
        <button
          onClick={install}
          className="text-xs font-semibold bg-accent/20 text-accent-light hover:bg-accent/30 transition-colors px-3 py-1.5 rounded-lg"
        >
          Install
        </button>
      </div>
    </div>
  );
}
