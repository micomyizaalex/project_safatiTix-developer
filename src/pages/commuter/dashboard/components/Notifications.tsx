import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { AppAlert, NotificationRecord } from '../types';

interface NotificationsProps {
  alerts: AppAlert[];
  notifications: NotificationRecord[];
  loading: boolean;
  onDismissAlert: (id: string) => void;
}

const alertStyles: Record<AppAlert['type'], string> = {
  success: 'border-[#27AE60]/30 bg-[#27AE60]/10 text-[#1F8A4C]',
  error: 'border-[#E63946]/30 bg-[#E63946]/10 text-[#B32633]',
  info: 'border-[#0077B6]/30 bg-[#0077B6]/10 text-[#005F8E]',
};

const alertIcon = (type: AppAlert['type']) => {
  if (type === 'success') return <CheckCircle2 className="h-4 w-4" />;
  if (type === 'error') return <AlertCircle className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
};

export default function Notifications({ alerts, notifications, loading, onDismissAlert }: NotificationsProps) {
  return (
    <section className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${alertStyles[alert.type]}`}
          role="status"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5">{alertIcon(alert.type)}</span>
            <span>{alert.message}</span>
          </div>
          <button
            onClick={() => onDismissAlert(alert.id)}
            aria-label="Dismiss notification"
            className="rounded-md p-1 opacity-70 transition hover:bg-white/40 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Recent Alerts</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No alerts yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {notifications.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500">{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
