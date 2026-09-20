import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Wifi, CheckCircle, X } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showBackOnlineToast, setShowBackOnlineToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setIsDismissed(false);
    } else if (wasOffline) {
      setShowBackOnlineToast(true);
      const timer = setTimeout(() => {
        setShowBackOnlineToast(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // When offline
  if (!isOnline && !isDismissed) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-amber-500/95 text-black px-3.5 py-2 text-xs font-medium shadow-xl backdrop-blur-sm border border-amber-400">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-900 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-black"></span>
        </span>
        <WifiOff className="w-4 h-4 text-black" />
        <div className="flex flex-col">
          <span className="font-bold leading-none">Offline Mode Active</span>
          <span className="text-[11px] opacity-90 leading-tight">
            Running locally from device cache &amp; LocalStorage
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="ml-2 p-1 rounded hover:bg-black/10 text-black/80 hover:text-black transition-colors"
          title="Dismiss offline banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Brief toast when reconnected
  if (showBackOnlineToast) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600/95 text-white px-3.5 py-2 text-xs font-medium shadow-xl backdrop-blur-sm border border-emerald-400 animate-in fade-in slide-in-from-bottom-2">
        <Wifi className="w-4 h-4 text-white" />
        <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
        <span>Connection Restored &bull; Cloud sync ready</span>
      </div>
    );
  }

  return null;
};
