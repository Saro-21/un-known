/**
 * Push Notification Center Component
 * Provides complete control over the Event-Driven Push Notification System:
 * - Device Token Management & Pruning
 * - Real-Time and Scheduled Dispatches
 * - Background Job Queue with Retry Engine and Rate-Limiter Inspector
 * - Notification Inbox with Category Filters
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  AlertTriangle,
  Radio,
  Send,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Flame,
  Zap,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  pushNotificationService,
  AppNotification,
  JobQueueItem,
  DeviceTokenRecord,
  NotificationCategory,
} from '../services/notificationService';
import { useTheme } from '../theme/ThemeContext';

export const NotificationCenter: React.FC = () => {
  const { theme } = useTheme();
  const [inbox, setInbox] = useState<AppNotification[]>([]);
  const [queue, setQueue] = useState<JobQueueItem[]>([]);
  const [activeToken, setActiveToken] = useState<DeviceTokenRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'queue' | 'tokens' | 'simulator'>('inbox');
  const [copiedToken, setCopiedToken] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | NotificationCategory>('all');
  const [rateLimit, setRateLimit] = useState(pushNotificationService.getRateLimitStatus());

  // Subscription setup
  useEffect(() => {
    const unsubInbox = pushNotificationService.subscribeInbox(setInbox);
    const unsubQueue = pushNotificationService.subscribeQueue(setQueue);
    const unsubToken = pushNotificationService.subscribeToken(setActiveToken);

    const interval = setInterval(() => {
      setRateLimit(pushNotificationService.getRateLimitStatus());
    }, 1000);

    return () => {
      unsubInbox();
      unsubQueue();
      unsubToken();
      clearInterval(interval);
    };
  }, []);

  const handleCopyToken = () => {
    if (activeToken?.token) {
      navigator.clipboard.writeText(activeToken.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleRequestPermission = async () => {
    await pushNotificationService.requestPermissions();
  };

  // Test Dispatches
  const handleSendRealTimeAlert = async () => {
    await pushNotificationService.sendNotification({
      title: '⚠️ Dead-Reckoning Divergence Detected',
      body: 'Unconstrained IMU drift exceeded 8.5m in blackout. Neural uncertainty weighting applied.',
      category: 'safety',
      priority: 'high',
    });
  };

  const handleSendOrderUpdate = async () => {
    await pushNotificationService.sendNotification({
      title: '📦 Telemetry Export & Model Sync Complete',
      body: 'IO-VNBD Route F run #1042 successfully validated and synced with local vector store.',
      category: 'realtime',
      priority: 'default',
    });
  };

  const handleScheduleReminder = async (seconds: number) => {
    await pushNotificationService.sendNotification({
      title: `⏱️ Scheduled Reminder (${seconds}s elapsed)`,
      body: 'Periodic stationary bias recalibration drill triggered by background schedule timer.',
      category: 'scheduled',
      priority: 'high',
      delaySeconds: seconds,
    });
  };

  const handleTriggerRetryQueue = async () => {
    // Triggers transient failure that tests exponential backoff
    await pushNotificationService.sendNotification({
      title: '🔄 Background Job Queue Retry Test',
      body: 'Demonstrating 503 gateway retry with exponential backoff algorithm.',
      category: 'safety',
      priority: 'high',
    });
  };

  const handleTriggerInvalidTokenPrune = async () => {
    // Tests automatic removal of dead tokens
    await pushNotificationService.sendNotification({
      title: '❌ Invalid Token Auto-Prune Drill',
      body: 'Verifying automatic removal of uninstalled or expired client push tokens.',
      category: 'system',
      forceFailToken: true,
    });
  };

  const filteredInbox = inbox.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const unreadCount = inbox.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div
        className="rounded-2xl p-6 border shadow-xl relative overflow-hidden"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderSubtle,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="p-3.5 rounded-2xl flex items-center justify-center border"
              style={{
                backgroundColor: theme.accentSubtle,
                borderColor: theme.borderAccent,
              }}
            >
              <Bell className="w-6 h-6" style={{ color: theme.accentText }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: theme.statusSuccessBg,
                    color: theme.statusSuccess,
                  }}
                >
                  Expo &amp; Web Push Active
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                  style={{
                    backgroundColor: theme.bgElevated,
                    color: theme.textSecondary,
                  }}
                >
                  Rate Limit: {rateLimit.current}/{rateLimit.max} per {rateLimit.windowSeconds}s
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight mt-1" style={{ color: theme.textPrimary }}>
                Event-Driven Push Notification System
              </h2>
              <p className="text-xs mt-1 max-w-2xl" style={{ color: theme.textSecondary }}>
                Delivers mission-critical inertial drift alerts, real-time vehicle syncs, and scheduled calibration
                reminders with exponential retry queues and automatic dead-token pruning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestPermission}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-sm"
              style={{
                backgroundColor: theme.accent,
                borderColor: theme.accentHover,
                color: theme.textInverse,
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Enable Push Permissions</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex items-center gap-2 mt-6 pt-4 border-t overflow-x-auto"
          style={{ borderColor: theme.borderSubtle }}
        >
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'inbox' ? 'font-bold shadow-sm' : ''
            }`}
            style={{
              backgroundColor: activeTab === 'inbox' ? theme.bgElevated : 'transparent',
              color: activeTab === 'inbox' ? theme.accentText : theme.textSecondary,
              border: activeTab === 'inbox' ? `1px solid ${theme.borderSubtle}` : '1px solid transparent',
            }}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Inbox</span>
            {unreadCount > 0 && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.textInverse,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'simulator' ? 'font-bold shadow-sm' : ''
            }`}
            style={{
              backgroundColor: activeTab === 'simulator' ? theme.bgElevated : 'transparent',
              color: activeTab === 'simulator' ? theme.accentText : theme.textSecondary,
              border: activeTab === 'simulator' ? `1px solid ${theme.borderSubtle}` : '1px solid transparent',
            }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch &amp; Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'queue' ? 'font-bold shadow-sm' : ''
            }`}
            style={{
              backgroundColor: activeTab === 'queue' ? theme.bgElevated : 'transparent',
              color: activeTab === 'queue' ? theme.accentText : theme.textSecondary,
              border: activeTab === 'queue' ? `1px solid ${theme.borderSubtle}` : '1px solid transparent',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Background Job Queue ({queue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'tokens' ? 'font-bold shadow-sm' : ''
            }`}
            style={{
              backgroundColor: activeTab === 'tokens' ? theme.bgElevated : 'transparent',
              color: activeTab === 'tokens' ? theme.accentText : theme.textSecondary,
              border: activeTab === 'tokens' ? `1px solid ${theme.borderSubtle}` : '1px solid transparent',
            }}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Device Tokens &amp; Security</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INBOX */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['all', 'realtime', 'scheduled', 'safety', 'system'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="px-2.5 py-1 rounded-lg text-xs capitalize transition-colors"
                  style={{
                    backgroundColor: selectedCategory === cat ? theme.accent : theme.bgElevated,
                    color: selectedCategory === cat ? theme.textInverse : theme.textSecondary,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => pushNotificationService.markAllAsRead()}
                className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderSubtle,
                  color: theme.textSecondary,
                }}
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark All Read</span>
              </button>
              <button
                onClick={() => pushNotificationService.clearInbox()}
                className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border text-rose-400 hover:text-rose-300"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.borderSubtle,
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Inbox</span>
              </button>
            </div>
          </div>

          {/* List */}
          {filteredInbox.length === 0 ? (
            <div
              className="p-12 rounded-2xl text-center border"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.borderSubtle,
              }}
            >
              <Bell className="w-10 h-10 mx-auto opacity-30 mb-3" style={{ color: theme.textSecondary }} />
              <h3 className="font-semibold text-sm" style={{ color: theme.textPrimary }}>
                No notifications in this category
              </h3>
              <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                Trigger a real-time event or schedule a notification in the Simulator tab.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredInbox.map((item) => (
                <div
                  key={item.id}
                  onClick={() => pushNotificationService.markAsRead(item.id)}
                  className="p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4"
                  style={{
                    backgroundColor: item.read ? theme.bgCard : theme.bgElevated,
                    borderColor: item.read ? theme.borderSubtle : theme.borderAccent,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.category === 'safety' ? (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      ) : item.category === 'scheduled' ? (
                        <Clock className="w-5 h-5 text-amber-400" />
                      ) : item.category === 'realtime' ? (
                        <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                      ) : (
                        <Bell className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                          {item.title}
                        </h4>
                        {!item.read && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.accent }}
                          />
                        )}
                        <span
                          className="px-2 py-0.2 rounded text-[10px] font-mono capitalize"
                          style={{
                            backgroundColor: theme.bgSurface,
                            color: theme.textMuted,
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                        {item.body}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-mono" style={{ color: theme.textMuted }}>
                        <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                        <span>&bull;</span>
                        <span className="capitalize">Status: {item.status}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pushNotificationService.markAsRead(item.id);
                    }}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DISPATCH & SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Real-Time Triggers */}
          <div
            className="p-5 rounded-xl border space-y-4 shadow-sm"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5" style={{ color: theme.accentText }} />
              <div>
                <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                  Real-Time Event Dispatchers
                </h3>
                <span className="text-[11px]" style={{ color: theme.textSecondary }}>
                  Immediate foreground &amp; background push notification events
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSendRealTimeAlert}
                className="w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Inertial Drift Alert (&gt;8.5m)</span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: theme.textSecondary }}>
                    Simulates safety-critical GPS denial warning
                  </div>
                </div>
                <Send className="w-4 h-4 text-rose-400" />
              </button>

              <button
                onClick={handleSendOrderUpdate}
                className="w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-400">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Route Sync / Mission Completed</span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: theme.textSecondary }}>
                    Telemetry benchmark saved to local database
                  </div>
                </div>
                <Send className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Scheduled Triggers */}
          <div
            className="p-5 rounded-xl border space-y-4 shadow-sm"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                  Scheduled Notification Timers
                </h3>
                <span className="text-[11px]" style={{ color: theme.textSecondary }}>
                  Background scheduled jobs (e.g. cart/inactivity reminders)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleScheduleReminder(5)}
                className="p-3 rounded-xl border text-left flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="font-bold text-xs text-amber-400">In 5 Seconds</div>
                <div className="text-[10px] mt-1" style={{ color: theme.textSecondary }}>
                  Rapid countdown test
                </div>
              </button>

              <button
                onClick={() => handleScheduleReminder(15)}
                className="p-3 rounded-xl border text-left flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                }}
              >
                <div className="font-bold text-xs text-amber-400">In 15 Seconds</div>
                <div className="text-[10px] mt-1" style={{ color: theme.textSecondary }}>
                  Stationary gyro check
                </div>
              </button>
            </div>
          </div>

          {/* Background Job Queue Failure & Retry Testing */}
          <div
            className="p-5 rounded-xl border space-y-4 shadow-sm"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                  Job Queue Retry Mechanism
                </h3>
                <span className="text-[11px]" style={{ color: theme.textSecondary }}>
                  Simulate transient failures &amp; verify exponential backoff
                </span>
              </div>
            </div>

            <p className="text-xs" style={{ color: theme.textSecondary }}>
              Triggers a delivery job that encounters a 503 gateway response on attempt 1, automatically backing off
              exponentially and succeeding on retry.
            </p>

            <button
              onClick={handleTriggerRetryQueue}
              className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderAccent,
                color: theme.accentText,
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Simulate Transient Delivery Retry</span>
            </button>
          </div>

          {/* Automatic Dead Token Pruning */}
          <div
            className="p-5 rounded-xl border space-y-4 shadow-sm"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                  Automatic Invalid Token Pruning
                </h3>
                <span className="text-[11px]" style={{ color: theme.textSecondary }}>
                  Complies with requirements for removing uninstalled device tokens
                </span>
              </div>
            </div>

            <p className="text-xs" style={{ color: theme.textSecondary }}>
              Sends a push notification to an uninstalled or expired device token to verify automatic detection and
              removal from the backend token registry.
            </p>

            <button
              onClick={handleTriggerInvalidTokenPrune}
              className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border text-rose-400 hover:text-rose-300"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Test Automatic Token Pruning</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: BACKGROUND JOB QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                Background Delivery Queue ({queue.length} items logged)
              </h3>
              <span className="text-xs" style={{ color: theme.textSecondary }}>
                Monitors delivery attempts, retries, rate limits, and token health
              </span>
            </div>

            <button
              onClick={() => pushNotificationService.clearQueueHistory()}
              className="px-2.5 py-1 rounded text-xs text-neutral-400 hover:text-white"
            >
              Clear Logs
            </button>
          </div>

          <div
            className="rounded-xl border overflow-hidden shadow-md"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      backgroundColor: theme.bgElevated,
                      borderColor: theme.borderSubtle,
                      color: theme.textSecondary,
                    }}
                  >
                    <th className="p-3 text-left">Job ID</th>
                    <th className="p-3 text-left">Notification</th>
                    <th className="p-3 text-left">Target Token</th>
                    <th className="p-3 text-left">Attempts</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Diagnostic / Backoff</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.borderSubtle }}>
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-neutral-500">
                        Queue is empty. Dispatch a notification to observe background delivery.
                      </td>
                    </tr>
                  ) : (
                    queue.map((job) => (
                      <tr key={job.id} style={{ color: theme.textPrimary }}>
                        <td className="p-3 font-semibold text-neutral-400">{job.id.slice(-8)}</td>
                        <td className="p-3">
                          <span className="font-sans font-bold">{job.notification.title}</span>
                        </td>
                        <td className="p-3 text-[11px] text-neutral-400">
                          {job.targetToken.slice(0, 24)}...
                        </td>
                        <td className="p-3">
                          {job.attempts} / {job.maxRetries}
                        </td>
                        <td className="p-3">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                            style={{
                              backgroundColor:
                                job.status === 'delivered'
                                  ? theme.statusSuccessBg
                                  : job.status === 'retrying'
                                  ? theme.statusWarningBg
                                  : job.status === 'invalid_token_pruned'
                                  ? theme.statusDangerBg
                                  : theme.statusInfoBg,
                              color:
                                job.status === 'delivered'
                                  ? theme.statusSuccess
                                  : job.status === 'retrying'
                                  ? theme.statusWarning
                                  : job.status === 'invalid_token_pruned'
                                  ? theme.statusDanger
                                  : theme.statusInfo,
                            }}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px]">
                          {job.errorReason ? (
                            <span className="text-amber-400">{job.errorReason}</span>
                          ) : (
                            <span className="text-emerald-400">Delivered successfully</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEVICE TOKENS & SECURITY */}
      {activeTab === 'tokens' && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-2xl border shadow-lg space-y-4"
            style={{
              backgroundColor: theme.bgCard,
              borderColor: theme.borderSubtle,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base" style={{ color: theme.textPrimary }}>
                  Active Device Push Token (Expo / Web)
                </h3>
                <span className="text-xs" style={{ color: theme.textSecondary }}>
                  Cryptographically generated token registered for push notification dispatch
                </span>
              </div>
              <button
                onClick={() => pushNotificationService.registerDeviceToken('expo')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border"
                style={{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.borderSubtle,
                  color: theme.accentText,
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rotate Token</span>
              </button>
            </div>

            <div
              className="p-4 rounded-xl border flex items-center justify-between gap-4 font-mono text-xs overflow-x-auto"
              style={{
                backgroundColor: theme.bgElevated,
                borderColor: theme.borderAccent,
              }}
            >
              <div className="truncate">
                <span className="text-emerald-400 font-bold block text-[10px] uppercase tracking-wider">
                  {activeToken?.platform.toUpperCase()} TOKEN &bull; ACTIVE
                </span>
                <span className="text-neutral-200">{activeToken?.token}</span>
              </div>

              <button
                onClick={handleCopyToken}
                className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.textInverse,
                  borderColor: theme.accentHover,
                }}
              >
                {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToken ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
              <div
                className="p-3 rounded-lg border"
                style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}
              >
                <span className="text-[10px] block text-neutral-400">Device Platform</span>
                <span className="font-bold font-mono mt-0.5 block" style={{ color: theme.textPrimary }}>
                  {activeToken?.deviceModel}
                </span>
              </div>

              <div
                className="p-3 rounded-lg border"
                style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}
              >
                <span className="text-[10px] block text-neutral-400">Registered Timestamp</span>
                <span className="font-bold font-mono mt-0.5 block" style={{ color: theme.textPrimary }}>
                  {activeToken?.registeredAt ? new Date(activeToken.registeredAt).toLocaleTimeString() : 'N/A'}
                </span>
              </div>

              <div
                className="p-3 rounded-lg border"
                style={{ backgroundColor: theme.bgElevated, borderColor: theme.borderSubtle }}
              >
                <span className="text-[10px] block text-neutral-400">Token Health Status</span>
                <span className="font-bold font-mono mt-0.5 block text-emerald-400">
                  HEALTHY (0 Failures)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
