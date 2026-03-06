import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  ticket_booked:         'bg-green-100 text-green-700',
  ticket_cancelled:      'bg-red-100 text-red-700',
  payment_received:      'bg-blue-100 text-blue-700',
  schedule_update:       'bg-yellow-100 text-yellow-700',
  company_approved:      'bg-purple-100 text-purple-700',
  subscription_expiring: 'bg-orange-100 text-orange-700',
  system:                'bg-gray-100 text-gray-700',
};

const TYPE_LABELS: Record<string, string> = {
  ticket_booked:         'Booking',
  ticket_cancelled:      'Cancelled',
  payment_received:      'Payment',
  schedule_update:       'Schedule',
  company_approved:      'Company',
  subscription_expiring: 'Subscription',
  system:                'System',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeader = (): Record<string, string> =>
    accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  // ── fetch unread count (lightweight poll) ────────────────────────────────
  const fetchCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const j = await res.json();
        setUnreadCount(j.count ?? 0);
      }
    } catch {}
  }, [accessToken]);

  // ── fetch full list ──────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=40', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const j = await res.json();
        setNotifications(j.data || []);
        setUnreadCount((j.data || []).filter((n: Notification) => !n.is_read).length);
      }
    } catch {}
    finally { setLoading(false); }
  }, [accessToken]);

  // ── poll every 30s ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchCount();
    pollRef.current = setInterval(fetchCount, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchCount]);

  // ── open / close ─────────────────────────────────────────────────────────
  const toggleOpen = () => {
    if (!open) fetchNotifications();
    setOpen(o => !o);
  };

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── mark one read ────────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: authHeader() });
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  // ── mark all read ─────────────────────────────────────────────────────────
  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/user/read-all', { method: 'PATCH', headers: authHeader() });
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  // ── delete one ────────────────────────────────────────────────────────────
  const deleteOne = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: authHeader() });
      const n = notifications.find(x => x.id === id);
      setNotifications(ns => ns.filter(x => x.id !== id));
      if (n && !n.is_read) setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        onClick={toggleOpen}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="absolute right-0 top-12 w-[360px] max-h-[520px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount} new</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Mark all read" className="text-[#0077B6] hover:text-[#005f8e] p-1 rounded-lg hover:bg-blue-50 transition-colors">
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* filter tabs */}
          <div className="flex gap-1 px-4 pt-2 pb-1">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filter === f ? 'bg-[#0077B6] text-white' : 'text-slate-500 hover:bg-gray-100'}`}
              >
                {f === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-[#0077B6] border-t-transparent rounded-full" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
              </div>
            ) : (
              displayed.map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.is_read) markRead(n.id); }}
                  className={`group flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/80'}`}
                >
                  {/* unread dot */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-2 h-2 rounded-full mt-1 ${n.is_read ? 'bg-transparent' : 'bg-[#0077B6]'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[n.type] || TYPE_COLORS.system}`}>
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                        <span className="text-[10px] text-slate-400">{timeAgo(n.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!n.is_read && (
                          <button
                            onClick={e => { e.stopPropagation(); markRead(n.id); }}
                            title="Mark read"
                            className="p-1 hover:bg-blue-100 rounded text-blue-500"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                          title="Delete"
                          className="p-1 hover:bg-red-50 rounded text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className={`text-sm mt-0.5 leading-snug ${n.is_read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>{n.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
