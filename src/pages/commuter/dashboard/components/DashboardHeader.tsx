import React from 'react';
import { Bell, Bus, LogOut, RefreshCw, User } from 'lucide-react';

interface DashboardHeaderProps {
  userName: string;
  unreadCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}

export default function DashboardHeader({
  userName,
  unreadCount,
  refreshing,
  onRefresh,
  onSignOut,
}: DashboardHeaderProps) {
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

          <button
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#E63946] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

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
