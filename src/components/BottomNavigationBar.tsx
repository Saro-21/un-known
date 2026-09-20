/**
 * Bottom Navigation Bar Component
 * Synchronized with the 5 Top Engineering Navigation Functions:
 * 1. HOME (Architecture)
 * 2. Phase 1 & 2 Results
 * 3. Live Navigation
 * 4. Phone Gyro & Drift CLI
 * 5. Download Dataset
 *
 * Provides identical names, synchronized active states,
 * and responsive mobile ergonomics.
 */

import React, { useEffect, useState } from 'react';
import { Home, Layers, Navigation, Smartphone, Download, Bell, MapPin } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { pushNotificationService } from '../services/notificationService';

export type MainNavTab =
  | 'home_architecture'
  | 'google_maps'
  | 'phase1_2'
  | 'live_nav'
  | 'phone_cli'
  | 'benchmark_download'
  | 'notifications'
  | 'wishlist'
  | 'profile'
  | 'home';

export type BottomNavTab = MainNavTab;

interface BottomNavigationBarProps {
  activeTab: MainNavTab | string;
  onSelectTab?: (tab: MainNavTab) => void;
  onChangeTab?: (tab: MainNavTab) => void;
  savedWishlistCount?: number;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeTab,
  onSelectTab,
  onChangeTab,
}) => {
  const handleTabClick = (tab: MainNavTab) => {
    if (onSelectTab) onSelectTab(tab);
    if (onChangeTab) onChangeTab(tab);
  };

  const { theme } = useTheme();
  const [unreadNotifications, setUnreadNotifications] = useState(pushNotificationService.getUnreadCount());

  useEffect(() => {
    const unsub = pushNotificationService.subscribeInbox(() => {
      setUnreadNotifications(pushNotificationService.getUnreadCount());
    });
    return () => unsub();
  }, []);

  // Replaced positions 2 and 4 to 4 and 2 with their exact functionality:
  // 1: Home (Architecture)
  // 2: Phone Gyro & Drift CLI (swapped from position 4)
  // 3: Live Navigation
  // 4: Phase 1 & 2 Results (swapped from position 2)
  // 5: Download Dataset
  const navItems: {
    id: MainNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number; fill?: string }>;
    badge: number | null;
  }[] = [
    {
      id: 'home_architecture',
      label: 'Home (Architecture)',
      icon: Home,
      badge: null,
    },
    {
      id: 'google_maps',
      label: 'Google Maps & GPS',
      icon: MapPin,
      badge: null,
    },
    {
      id: 'phone_cli',
      label: 'Phone Gyro & Drift CLI',
      icon: Smartphone,
      badge: null,
    },
    {
      id: 'live_nav',
      label: 'Live Navigation',
      icon: Navigation,
      badge: null,
    },
    {
      id: 'phase1_2',
      label: 'Phase 1 & 2 Results',
      icon: Layers,
      badge: null,
    },
    {
      id: 'benchmark_download',
      label: 'Download Dataset',
      icon: Download,
      badge: null,
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 transition-colors duration-200"
      style={{
        backgroundColor: theme.bgNav,
        borderTop: `1px solid ${theme.borderSubtle}`,
        boxShadow: theme.isDark ? '0 -10px 25px rgba(0,0,0,0.5)' : '0 -4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-md sm:max-w-lg mx-auto px-4 py-2 flex items-center justify-between gap-1">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.id || (item.id === 'home_architecture' && activeTab === 'home');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-2xl transition-all relative group cursor-pointer"
              style={{
                color: isActive ? theme.navItemActive : theme.navItemInactive,
              }}
              title={item.label}
              aria-label={item.label}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110"
                  strokeWidth={isActive ? 2.5 : 1.75}
                  fill={isActive && item.id === 'home_architecture' ? 'currentColor' : 'none'}
                />

                {item.badge !== null && (
                  <span
                    className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono animate-pulse"
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.textInverse,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Active Indicator Pill (Names removed as requested) */}
              <div className="h-1 mt-1.5 flex items-center justify-center">
                {isActive ? (
                  <span
                    className="w-4 h-1 rounded-full transition-all"
                    style={{ backgroundColor: theme.navIndicator }}
                  />
                ) : (
                  <span className="w-1 h-1 rounded-full opacity-0 group-hover:opacity-30 bg-current transition-opacity" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* iOS / Mobile Home Indicator Bar */}
      <div className="pb-1">
        <div
          className="w-28 h-1 rounded-full mx-auto opacity-40 transition-colors"
          style={{ backgroundColor: theme.homeIndicator }}
        />
      </div>
    </div>
  );
};
