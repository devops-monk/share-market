import { useState, useEffect, useCallback } from 'react';

interface NotificationConfig {
  enabled: boolean;
  priceAlerts: boolean;
  scoreAlerts: boolean;
  checkIntervalMinutes: number;
}

const STORAGE_KEY = 'sm-notification-config';

const defaultConfig: NotificationConfig = {
  enabled: false,
  priceAlerts: true,
  scoreAlerts: true,
  checkIntervalMinutes: 30,
};

function readConfig(): NotificationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch { return defaultConfig; }
}

export function useLocalNotifications() {
  const [config, setConfig] = useState<NotificationConfig>(readConfig);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setConfig(prev => ({ ...prev, enabled: true }));
    }
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if (permission !== 'granted' || !config.enabled) return;
    try {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
      });
    } catch { /* Notifications not supported */ }
  }, [permission, config.enabled]);

  const updateConfig = useCallback((update: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...update }));
  }, []);

  return {
    config,
    permission,
    requestPermission,
    sendNotification,
    updateConfig,
  };
}
