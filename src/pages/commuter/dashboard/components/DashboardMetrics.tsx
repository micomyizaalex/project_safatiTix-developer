import React from 'react';
import { Ban, CalendarClock, Ticket } from 'lucide-react';

interface DashboardMetricsProps {
  totalTrips: number;
  upcomingTrips: number;
  canceledTrips: number;
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'primary' | 'success' | 'danger';
}) {
  const toneStyles: Record<typeof tone, string> = {
    primary: 'bg-[#0077B6]/10 text-[#0077B6]',
    success: 'bg-[#27AE60]/10 text-[#27AE60]',
    danger: 'bg-[#E63946]/10 text-[#E63946]',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <span className={`rounded-xl p-2 ${toneStyles[tone]}`}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">{value}</p>
    </div>
  );
}

export default function DashboardMetrics({
  totalTrips,
  upcomingTrips,
  canceledTrips,
}: DashboardMetricsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Total Trips" value={totalTrips} tone="primary" icon={<Ticket className="h-4 w-4" />} />
      <MetricCard label="Upcoming Trips" value={upcomingTrips} tone="success" icon={<CalendarClock className="h-4 w-4" />} />
      <MetricCard label="Cancelled Trips" value={canceledTrips} tone="danger" icon={<Ban className="h-4 w-4" />} />
    </section>
  );
}
