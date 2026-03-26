import React, { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Ticket,
  FileText,
  Bus,
  User,
  Clock,
  BarChart3,
  Printer,
  Route,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  success: '#27AE60',
  danger: '#E63946',
  warning: '#F4A261',
  slate: '#2B2D42',
};

type Trend = {
  revenuePct: number | null;
  ticketsPct: number | null;
};

interface RevenueData {
  totalRevenue: number;
  totalTickets: number;
  todayRevenue: number;
  todayTickets: number;
  weekRevenue: number;
  weekTickets: number;
  monthRevenue: number;
  monthTickets: number;
  averageTicketPrice: number;
  occupancyRate: number;
  previousPeriodChange: Trend;
  dailyRevenue: Array<{ date: string; revenue: number; tickets: number }>;
  breakdownByRoute: Array<{
    route: string;
    departureTime: string;
    ticketsSold: number;
    revenue: number;
    scheduleDate: string;
  }>;
  topRoutes: Array<{ route: string; ticketsSold: number; revenue: number }>;
  busPerformance: Array<{
    busPlate: string;
    totalTrips: number;
    passengersCarried: number;
    revenueGenerated: number;
  }>;
  driverPerformance: Array<{
    driverName: string;
    tripsCompleted: number;
    passengersHandled: number;
  }>;
  peakTimes: {
    hours: Array<{ hour: string; tickets: number }>;
    days: Array<{ day: string; tickets: number }>;
  };
  selectedRange?: {
    startDate: string | null;
    endDate: string | null;
  };
}

const emptyData: RevenueData = {
  totalRevenue: 0,
  totalTickets: 0,
  todayRevenue: 0,
  todayTickets: 0,
  weekRevenue: 0,
  weekTickets: 0,
  monthRevenue: 0,
  monthTickets: 0,
  averageTicketPrice: 0,
  occupancyRate: 0,
  previousPeriodChange: { revenuePct: null, ticketsPct: null },
  dailyRevenue: [],
  breakdownByRoute: [],
  topRoutes: [],
  busPerformance: [],
  driverPerformance: [],
  peakTimes: { hours: [], days: [] },
  selectedRange: { startDate: null, endDate: null },
};

const rwf = (value: number) => `RWF ${Math.round(value || 0).toLocaleString()}`;
const numberFmt = (value: number) => Number(value || 0).toLocaleString();

const pctFmt = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const normalizeDateLabel = (raw: string) => {
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const toCsvCell = (value: string | number | null | undefined) => {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export default function RevenueReports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData>(emptyData);
  const [sortField, setSortField] = useState<'route' | 'revenue' | 'ticketsSold'>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async (start?: string, end?: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        setRevenueData(emptyData);
        setError('Missing authentication token. Please log in again.');
        return;
      }

      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const response = await fetch(`/api/company/revenue?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRevenueData(emptyData);
        setError(payload?.error || payload?.message || `Failed to load report (${response.status})`);
        return;
      }

      setRevenueData({
        ...emptyData,
        ...payload,
        previousPeriodChange: payload?.previousPeriodChange || { revenuePct: null, ticketsPct: null },
        peakTimes: payload?.peakTimes || { hours: [], days: [] },
      });
    } catch (err: any) {
      setRevenueData(emptyData);
      setError(err?.message || 'Failed to fetch revenue data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    if (startDate && endDate) {
      fetchRevenueData(startDate, endDate);
      return;
    }
    fetchRevenueData();
  };

  const chartGranularity = useMemo<'daily' | 'weekly' | 'monthly'>(() => {
    if (!startDate || !endDate) return 'daily';
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1);
    if (days > 180) return 'monthly';
    if (days > 45) return 'weekly';
    return 'daily';
  }, [startDate, endDate]);

  const revenueChartData = useMemo(() => {
    const sorted = [...revenueData.dailyRevenue].sort((a, b) => a.date.localeCompare(b.date));
    if (chartGranularity === 'daily') {
      return sorted.map((item) => ({
        ...item,
        label: normalizeDateLabel(item.date),
      }));
    }

    const grouped = new Map<string, { label: string; revenue: number; tickets: number }>();
    sorted.forEach((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;

      let key = '';
      let label = '';
      if (chartGranularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
        label = `Week of ${normalizeDateLabel(key)}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      if (!grouped.has(key)) {
        grouped.set(key, { label, revenue: 0, tickets: 0 });
      }
      const current = grouped.get(key)!;
      current.revenue += item.revenue;
      current.tickets += item.tickets;
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value);
  }, [revenueData.dailyRevenue, chartGranularity]);

  const sortedData = useMemo(() => {
    return [...revenueData.breakdownByRoute].sort((a, b) => {
      const aVal = sortField === 'route' ? a.route : sortField === 'revenue' ? a.revenue : a.ticketsSold;
      const bVal = sortField === 'route' ? b.route : sortField === 'revenue' ? b.revenue : b.ticketsSold;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [revenueData.breakdownByRoute, sortDirection, sortField]);

  const hasAnyData = useMemo(() => {
    return (
      revenueData.totalTickets > 0
      || revenueData.dailyRevenue.length > 0
      || revenueData.breakdownByRoute.length > 0
      || revenueData.topRoutes.length > 0
    );
  }, [revenueData]);

  const breakdownBarData = useMemo(
    () => [...revenueData.topRoutes].slice(0, 8).map((r) => ({ ...r, shortRoute: r.route.length > 24 ? `${r.route.slice(0, 24)}...` : r.route })),
    [revenueData.topRoutes]
  );

  const handleSort = (field: 'route' | 'revenue' | 'ticketsSold') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('desc');
  };

  const handleExportCSV = () => {
    const rows: Array<Array<string | number>> = [];

    rows.push(['Revenue Report']);
    rows.push(['Date Range', startDate || 'All', endDate || 'All']);
    rows.push([]);
    rows.push(['Summary Metric', 'Value']);
    rows.push(['Today Revenue', rwf(revenueData.todayRevenue)]);
    rows.push(['Week Revenue', rwf(revenueData.weekRevenue)]);
    rows.push(['Month Revenue', rwf(revenueData.monthRevenue)]);
    rows.push(['Total Revenue', rwf(revenueData.totalRevenue)]);
    rows.push(['Total Tickets', numberFmt(revenueData.totalTickets)]);
    rows.push(['Average Ticket Price', rwf(revenueData.averageTicketPrice)]);
    rows.push(['Occupancy Rate', `${revenueData.occupancyRate.toFixed(2)}%`]);
    rows.push([]);
    rows.push(['Ticket Sales Breakdown']);
    rows.push(['Route', 'Date', 'Departure Time', 'Tickets Sold', 'Revenue']);

    sortedData.forEach((item) => {
      rows.push([item.route, item.scheduleDate || '—', item.departureTime || '—', item.ticketsSold, item.revenue]);
    });

    const csvContent = rows
      .map((row) => row.map((cell) => toCsvCell(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderPrintableReportHtml = (withChart = true) => {
    const storedUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        return null;
      }
    })();

    const companyName = storedUser?.companyName || storedUser?.company_name || 'SafariTix Company';
    const dateRange = `${startDate || 'All time'} to ${endDate || 'All time'}`;
    const chartMarkup = withChart ? (document.getElementById('revenue-chart-print')?.innerHTML || '') : '';

    const summaryRows = [
      ['Today Revenue', rwf(revenueData.todayRevenue)],
      ['Week Revenue', rwf(revenueData.weekRevenue)],
      ['Month Revenue', rwf(revenueData.monthRevenue)],
      ['Total Revenue', rwf(revenueData.totalRevenue)],
      ['Total Tickets', numberFmt(revenueData.totalTickets)],
      ['Average Ticket Price', rwf(revenueData.averageTicketPrice)],
      ['Bus Occupancy Rate', `${revenueData.occupancyRate.toFixed(2)}%`],
    ]
      .map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`)
      .join('');

    const topRoutesRows = revenueData.topRoutes
      .map((item) => `<tr><td>${item.route}</td><td>${item.ticketsSold}</td><td>${rwf(item.revenue)}</td></tr>`)
      .join('');

    const breakdownRows = sortedData
      .slice(0, 30)
      .map((item) => `<tr><td>${item.route}</td><td>${item.scheduleDate || '—'}</td><td>${item.departureTime || '—'}</td><td>${item.ticketsSold}</td><td>${rwf(item.revenue)}</td></tr>`)
      .join('');

    return `
      <html>
        <head>
          <title>Revenue Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { color: #0077B6; margin: 0 0 8px 0; }
            h2 { margin-top: 24px; color: #2B2D42; }
            .subtle { color: #6b7280; margin: 0 0 12px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f8fafc; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
            .chart { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-top: 12px; }
          </style>
        </head>
        <body>
          <h1>Revenue Report</h1>
          <p class="subtle">${companyName}</p>
          <p class="subtle">Period: ${dateRange}</p>

          <h2>Summary</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>${summaryRows}</tbody>
          </table>

          ${withChart && chartMarkup ? `<h2>Revenue Over Time</h2><div class="chart">${chartMarkup}</div>` : ''}

          <div class="grid">
            <div class="box">
              <h2>Top Routes</h2>
              <table>
                <thead><tr><th>Route</th><th>Tickets</th><th>Revenue</th></tr></thead>
                <tbody>${topRoutesRows || '<tr><td colspan="3">No data</td></tr>'}</tbody>
              </table>
            </div>
            <div class="box">
              <h2>Peak Times</h2>
              <table>
                <thead><tr><th>Hour</th><th>Tickets</th></tr></thead>
                <tbody>${(revenueData.peakTimes.hours || []).slice(0, 6).map((h) => `<tr><td>${h.hour}</td><td>${h.tickets}</td></tr>`).join('') || '<tr><td colspan="2">No data</td></tr>'}</tbody>
              </table>
            </div>
          </div>

          <h2>Ticket Sales Breakdown</h2>
          <table>
            <thead><tr><th>Route</th><th>Date</th><th>Departure</th><th>Tickets</th><th>Revenue</th></tr></thead>
            <tbody>${breakdownRows || '<tr><td colspan="5">No data</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const openPrintWindow = (html: string) => {
    const reportWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!reportWindow) {
      alert('Unable to open print window. Please allow popups for this site.');
      return;
    }
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const handleExportPDF = () => {
    // Browser print dialog supports Save as PDF with professional layout.
    openPrintWindow(renderPrintableReportHtml(true));
  };

  const handlePrintReport = () => {
    window.print();
  };

  const infoDateRangeText = startDate && endDate ? `${startDate} to ${endDate}` : 'All available dates';

  return (
    <div className="space-y-6 report-page">
      <style>
        {`
          @media print {
            body, .report-page { background: #fff !important; }
            .no-print { display: none !important; }
            .print-card { break-inside: avoid; }
            table { font-size: 12px; }
            th, td { border-color: #d1d5db !important; }
          }
        `}
      </style>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print-card">
        <div>
          <h1 className="text-3xl font-['Montserrat'] font-bold text-[#2B2D42] mb-2">Revenue & Reports</h1>
          <p className="text-gray-600">Track your revenue, analyze performance, and export reports</p>
        </div>
        <div className="flex flex-wrap gap-3 no-print">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2 bg-[#0077B6] text-white rounded-lg hover:bg-[#005F8E] transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 print-card">
        <div className="flex flex-wrap items-end gap-4 no-print">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleApplyFilter}
            disabled={loading}
            className="px-6 py-2 bg-[#0077B6] text-white rounded-lg hover:bg-[#005F8E] transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Apply Filter'}
          </button>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                fetchRevenueData();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Clear
            </button>
          )}
        </div>
        <div className="text-sm text-gray-500 mt-3">Selected range: {infoDateRangeText}</div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 print-card">
            <SummaryCard title="Today's Revenue" value={rwf(revenueData.todayRevenue)} subtitle={`${numberFmt(revenueData.todayTickets)} tickets`} icon={DollarSign} color={COLORS.primary} trend={revenueData.previousPeriodChange.revenuePct} />
            <SummaryCard title="This Week" value={rwf(revenueData.weekRevenue)} subtitle={`${numberFmt(revenueData.weekTickets)} tickets`} icon={TrendingUp} color={COLORS.success} />
            <SummaryCard title="This Month" value={rwf(revenueData.monthRevenue)} subtitle={`${numberFmt(revenueData.monthTickets)} tickets`} icon={Calendar} color={COLORS.warning} />
            <SummaryCard title="Total Revenue" value={rwf(revenueData.totalRevenue)} subtitle="All time" icon={BarChart3} color={COLORS.slate} />
            <SummaryCard title="Total Tickets" value={numberFmt(revenueData.totalTickets)} subtitle="All time" icon={Ticket} color={COLORS.primaryDark} trend={revenueData.previousPeriodChange.ticketsPct} />
            <SummaryCard title="Average Ticket Price" value={rwf(revenueData.averageTicketPrice)} subtitle="Across selected period" icon={Activity} color={COLORS.success} />
            <SummaryCard title="Bus Occupancy Rate" value={`${revenueData.occupancyRate.toFixed(2)}%`} subtitle="Sold seats vs capacity" icon={Bus} color={COLORS.warning} />
            <SummaryCard title="Period Trend" value={pctFmt(revenueData.previousPeriodChange.revenuePct)} subtitle="Revenue vs previous period" icon={revenueData.previousPeriodChange.revenuePct !== null && revenueData.previousPeriodChange.revenuePct < 0 ? TrendingDown : TrendingUp} color={revenueData.previousPeriodChange.revenuePct !== null && revenueData.previousPeriodChange.revenuePct < 0 ? COLORS.danger : COLORS.success} />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 print-card" id="revenue-chart-print">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-['Montserrat'] font-bold text-[#2B2D42]">Revenue Over Time</h3>
              <span className="text-sm text-gray-500 capitalize">{chartGranularity} view</span>
            </div>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    formatter={(value: any, name: string) => (name.toLowerCase().includes('revenue') ? [rwf(Number(value)), name] : [value, name])}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke={COLORS.primary} strokeWidth={3} dot={{ fill: COLORS.primary, r: 3 }} name="Revenue" />
                  <Line type="monotone" dataKey="tickets" stroke={COLORS.success} strokeWidth={2} dot={{ fill: COLORS.success, r: 2 }} name="Tickets" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No data available for selected period" suggestion="Try adjusting date range" />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-card">
            <AnalyticsTableCard
              title="Top Routes"
              icon={Route}
              headers={['Route', 'Tickets Sold', 'Revenue']}
              rows={revenueData.topRoutes.map((item) => [item.route, numberFmt(item.ticketsSold), rwf(item.revenue)])}
            />
            <AnalyticsTableCard
              title="Peak Times"
              icon={Clock}
              headers={['Most Popular Hours', 'Tickets']}
              rows={(revenueData.peakTimes.hours || []).slice(0, 6).map((item) => [item.hour, numberFmt(item.tickets)])}
              footerTitle="Most Active Days"
              footerRows={(revenueData.peakTimes.days || []).slice(0, 7).map((item) => [item.day, numberFmt(item.tickets)])}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-card">
            <AnalyticsTableCard
              title="Bus Performance"
              icon={Bus}
              headers={['Bus Plate', 'Trips', 'Passengers', 'Revenue']}
              rows={revenueData.busPerformance.map((item) => [item.busPlate, numberFmt(item.totalTrips), numberFmt(item.passengersCarried), rwf(item.revenueGenerated)])}
            />
            <AnalyticsTableCard
              title="Driver Performance"
              icon={User}
              headers={['Driver', 'Trips Completed', 'Passengers Handled']}
              rows={revenueData.driverPerformance.map((item) => [item.driverName, numberFmt(item.tripsCompleted), numberFmt(item.passengersHandled)])}
            />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 print-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-['Montserrat'] font-bold text-[#2B2D42]">Ticket Sales Breakdown</h3>
              <span className="text-sm text-gray-500">Table + route revenue bars</span>
            </div>

            {breakdownBarData.length > 0 ? (
              <div className="mb-8">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={breakdownBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="shortRoute" stroke="#94a3b8" style={{ fontSize: '11px' }} interval={0} angle={-18} textAnchor="end" height={70} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <Tooltip formatter={(value: any) => rwf(Number(value))} />
                    <Bar dataKey="revenue" fill={COLORS.primary} radius={[6, 6, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('route')}>
                      <div className="flex items-center gap-2">Route{sortField === 'route' ? <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}</div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Departure</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('ticketsSold')}>
                      <div className="flex items-center gap-2">Tickets Sold{sortField === 'ticketsSold' ? <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}</div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('revenue')}>
                      <div className="flex items-center gap-2">Revenue{sortField === 'revenue' ? <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span> : null}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.length > 0 ? (
                    sortedData.map((item, index) => (
                      <tr key={`${item.route}-${item.scheduleDate}-${item.departureTime}-${index}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.route}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.scheduleDate || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.departureTime || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.ticketsSold}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#27AE60]">{rwf(item.revenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                        <EmptyState message="No data available for selected period" suggestion="Try adjusting date range" compact />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!hasAnyData && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-dashed border-gray-300 print-card">
              <EmptyState message="No data available for selected period" suggestion="Try adjusting date range" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
  trend?: number | null;
}) {
  const trendColor = trend === null || trend === undefined ? 'text-gray-500' : trend >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 print-card">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`text-xs font-semibold ${trendColor}`}>
            {pctFmt(trend)}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <p className="text-2xl font-['Montserrat'] font-bold text-[#2B2D42] leading-tight">{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function AnalyticsTableCard({
  title,
  icon: Icon,
  headers,
  rows,
  footerTitle,
  footerRows,
}: {
  title: string;
  icon: any;
  headers: string[];
  rows: Array<Array<string>>;
  footerTitle?: string;
  footerRows?: Array<Array<string>>;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 print-card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-[#0077B6]" />
        <h3 className="text-lg font-['Montserrat'] font-bold text-[#2B2D42]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr key={`${title}-row-${idx}`} className="border-b border-gray-100">
                  {row.map((cell, cellIdx) => (
                    <td key={`${title}-${idx}-${cellIdx}`} className="px-3 py-2 text-sm text-gray-800">{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-3 py-6 text-sm text-gray-500 text-center">
                  No data available for selected period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {footerTitle && footerRows && (
        <>
          <div className="mt-5 mb-2 text-sm font-semibold text-gray-700">{footerTitle}</div>
          <div className="grid grid-cols-2 gap-2">
            {footerRows.length > 0 ? (
              footerRows.map((row, idx) => (
                <div key={`${title}-footer-${idx}`} className="rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between text-sm">
                  <span className="text-gray-700">{row[0]}</span>
                  <span className="font-semibold text-[#2B2D42]">{row[1]}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No data</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({
  message,
  suggestion,
  compact,
}: {
  message: string;
  suggestion: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-2' : 'py-8'}`}>
      <TrendingUp className={`text-gray-300 ${compact ? 'w-8 h-8 mb-1' : 'w-12 h-12 mb-3'}`} />
      <p className={`text-gray-600 ${compact ? 'text-sm' : 'text-base'} font-medium`}>{message}</p>
      <p className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'} mt-1`}>{suggestion}</p>
    </div>
  );
}
