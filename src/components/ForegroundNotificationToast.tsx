/**
 * Foreground Push Notification Toast
 * Displays real-time and scheduled notifications while the app is in foreground,
 * with action buttons to mark as read or jump to the Notification Center.
 */

import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Clock, X, Radio, ArrowRight } from 'lucide-react';
import { pushNotificationService, AppNotification } from '../services/notificationService';
import { useTheme } from '../theme/ThemeContext';

interface ForegroundNotificationToastProps {
  onOpenNotificationCenter: () => void;
}

export const ForegroundNotificationToast: React.FC<ForegroundNotificationToastProps> = ({
  onOpenNotificationCenter,
}) => {
  const { theme } = useTheme();
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  useEffect(() => {
    const unsub = pushNotificationService.subscribeForegroundToast((notif) => {
      setActiveToast(notif);
      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    });

    return () => unsub();
  }, []);

  if (!activeToast) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className="rounded-2xl p-4 border shadow-2xl flex items-start justify-between gap-3 relative overflow-hidden backdrop-blur-md"
        style={{
          backgroundColor: theme.isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: activeToast.category === 'safety' ? theme.statusDanger : theme.borderAccent,
          boxShadow: `0 10px 30px ${theme.isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.15)'}`,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-xl" style={{ backgroundColor: theme.bgElevated }}>
            {activeToast.category === 'safety' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            ) : activeToast.category === 'scheduled' ? (
              <Clock className="w-5 h-5 text-amber-400" />
            ) : (
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                Push &bull; {activeToast.category}
              </span>
            </div>
            <h4 className="font-bold text-sm leading-snug" style={{ color: theme.textPrimary }}>
              {activeToast.title}
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
              {activeToast.body}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  onOpenNotificationCenter();
                  setActiveToast(null);
                }}
                className="text-xs font-bold flex items-center gap-1 transition-colors"
                style={{ color: theme.accentText }}
              >
                <span>View in Notification Hub</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveToast(null)}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
