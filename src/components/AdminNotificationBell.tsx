import React from 'react';
import axios from 'axios';
import { Bell, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL as API_BASE_URL } from '../config';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const getAuthConfig = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Your admin session has expired. Please sign in again.');
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [notifications, setNotifications] = React.useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const loadNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const config = getAuthConfig();
      const [listResponse, countResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/notifications?limit=8`, config),
        axios.get(`${API_BASE_URL}/notifications/unread-count`, config),
      ]);

      setNotifications(listResponse.data.data || []);
      setUnreadCount(countResponse.data.count || 0);
    } catch (error) {
      console.error('Failed to load admin notifications', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();

    const intervalId = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  React.useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNotificationClick = async (notification: AdminNotification) => {
    try {
      if (!notification.is_read) {
        await axios.patch(`${API_BASE_URL}/notifications/${notification.id}/read`, {}, getAuthConfig());
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, is_read: true } : item
        )));
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }

    setOpen(false);
    navigate(notification.link || '/dashboard/admin/subscription-requests');
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-[#E63946] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="border-b border-gray-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-[#2B2D42]">Notifications</div>
                <div className="text-xs text-gray-500">Latest admin alerts</div>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-[#0077B6]" />}
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {!loading && notifications.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                No notifications yet.
              </div>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`w-full border-b border-gray-100 px-5 py-4 text-left transition-colors hover:bg-gray-50 ${notification.is_read ? 'bg-white' : 'bg-[#F4FBFF]'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.is_read ? 'bg-gray-300' : 'bg-[#E63946]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#2B2D42]">{notification.title}</div>
                    <div className="mt-1 text-sm text-gray-600">{notification.message}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      {formatRelativeTime(notification.created_at)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
