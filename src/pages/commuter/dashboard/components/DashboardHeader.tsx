import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Bus, LogOut, RefreshCw, User } from 'lucide-react';
import { NotificationRecord } from '../types';

interface DashboardHeaderProps {
  userName: string;
  unreadCount: number;
  notifications: NotificationRecord[];
  loadingNotifications: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadNotifications: () => void;
  onSignOut: () => void;
}

const formatNotificationTime = (value?: string | null) => {
  if (!value) return 'Just now';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function DashboardHeader({
  userName,
  unreadCount,
  notifications,
  loadingNotifications,
  refreshing,
  onRefresh,
  onLoadNotifications,
  onSignOut,
}: DashboardHeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotificationsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const topNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  const toggleNotifications = () => {
    setIsNotificationsOpen((current) => {
      const next = !current;
      if (next) onLoadNotifications();
      return next;
    });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-2xl bg-[#0077B6] p-2.5 text-white shadow-lg shadow-[#0077B6]/30">
            <Bus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0077B6]">SafariTix</p>
            <h1 className="truncate text-lg font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
              Commuter Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0077B6]/30 hover:bg-[#0077B6]/5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-[#0077B6]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[#0077B6]/30 hover:bg-[#0077B6]/5"
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#E63946] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-12 z-40 w-[min(92vw,360px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent Alerts</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {unreadCount} unread
                  </span>
                </div>

                {topNotifications.length === 0 ? (
                  loadingNotifications ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">Loading notifications...</p>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">No notifications yet.</p>
                  )
                ) : (
                  <>
                    {loadingNotifications && (
                      <p className="mb-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">Refreshing...</p>
                    )}
                    <div className="max-h-80 space-y-2 overflow-auto pr-1">
                      {topNotifications.map((item) => (
                        <div key={item.id} className={`rounded-xl border px-3 py-2 ${item.isRead ? 'border-slate-200 bg-slate-50' : 'border-[#0077B6]/25 bg-[#0077B6]/8'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                            <span className="whitespace-nowrap text-[11px] text-slate-500">{formatNotificationTime(item.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0077B6]/10 text-[#0077B6]">
              <User className="h-4 w-4" />
            </div>
            <span className="max-w-[150px] truncate text-sm font-medium text-slate-700">{userName}</span>
          </div>

          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-full bg-[#E63946]/10 px-3 py-2 text-sm font-semibold text-[#E63946] transition hover:bg-[#E63946]/15"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
