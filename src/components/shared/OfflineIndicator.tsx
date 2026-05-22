'use client';

import { FC, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: FC = () => {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[300] bg-gray-900 px-4 py-2 text-center text-xs font-medium text-white">
      <WifiOff size={12} className="mr-1.5 inline" />
      Kamu sedang offline
    </div>
  );
};
