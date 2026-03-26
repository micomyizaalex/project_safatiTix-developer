import { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '../components/AuthContext';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download, CreditCard, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

interface RevenueData {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  growth: number;
  weekGrowth: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  date: string;
  bookingRef: string;
  passengerName: string;
  route: string;
  amount: number;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'refunded';
}

export default function Revenue() {
  const { accessToken } = useAuth();
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [weekData, setWeekData] = useState<{ day: string; value: number }[]>([
    { day: 'Mon', value: 0 },
    { day: 'Tue', value: 0 },
    { day: 'Wed', value: 0 },
    { day: 'Thu', value: 0 },
    { day: 'Fri', value: 0 },
    { day: 'Sat', value: 0 },
    { day: 'Sun', value: 0 },
  ]);
  const API_URL = import.meta.env.VITE_API_URL || 'https://backend-v2-wjcs.onrender.com/api';

  useEffect(() => {
    fetchRevenueData();
  }, [filterPeriod]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRevenueData(true); // Silent refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [filterPeriod]);

  const fetchRevenueData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      // Fetch real payments/tickets data from database
      const response = await fetch(`${API_URL}/company/tickets`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue data');
      }

      const data = await response.json();
      console.log('Tickets/Revenue data:', data);

      // Calculate revenue from tickets
      const tickets = data.tickets || [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const lastWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      let totalRevenue = 0;
      let todayRevenue = 0;
      let weekRevenue = 0;
      let lastWeekRevenue = 0;
      let monthRevenue = 0;
      let lastMonthRevenue = 0;

      const transactions: Transaction[] = [];

      tickets.forEach((ticket: any) => {
        const ticketDate = new Date(ticket.bookedAt || ticket.booked_at || ticket.createdAt);
        const amount = parseFloat(ticket.price || 0);
        
        // Count all paid/confirmed tickets (including 'booked' status from old data)
        const isPaid = 
          ticket.status === 'CONFIRMED' || 
          ticket.status === 'CHECKED_IN' || 
          ticket.status === 'booked' ||  // Legacy status
          ticket.paymentStatus === 'paid';
        
        // Skip expired or cancelled tickets with 0 amount
        if (amount > 0 && isPaid && ticket.status !== 'CANCELLED' && ticket.status !== 'EXPIRED') {
          totalRevenue += amount;

          if (ticketDate >= todayStart) {
            todayRevenue += amount;
          }

          if (ticketDate >= weekStart) {
            weekRevenue += amount;
          }

          if (ticketDate >= lastWeekStart && ticketDate < lastWeekEnd) {
            lastWeekRevenue += amount;
          }

          if (ticketDate >= monthStart) {
            monthRevenue += amount;
          }

          if (ticketDate >= lastMonthStart && ticketDate <= lastMonthEnd) {
            lastMonthRevenue += amount;
          }

          // Add to transactions list (most recent first)
          transactions.push({
            id: ticket.id,
            date: ticketDate.toISOString(),
            bookingRef: ticket.bookingRef || `TK-${ticket.id.slice(0, 8)}`,
            passengerName: ticket.passengerName || 'N/A',
            route: `${ticket.routeFrom || 'N/A'} → ${ticket.routeTo || 'N/A'}`,
            amount: amount,
            paymentMethod: ticket.paymentMethod || 'M-money',
            status: isPaid ? 'completed' : 'pending',
          });
        }
      });

      // Sort transactions by date (most recent first)
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate weekly revenue breakdown (last 7 days)
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyBreakdown = new Array(7).fill(0);
      const today = new Date();
      const todayDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

      tickets.forEach((ticket: any) => {
        const ticketDate = new Date(ticket.createdAt || ticket.created_at);
        const daysAgo = Math.floor((today.getTime() - ticketDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysAgo >= 0 && daysAgo < 7 && (ticket.status === 'CONFIRMED' || ticket.status === 'CHECKED_IN')) {
          const amount = parseFloat(ticket.price || ticket.amount || 0);
          const dayIndex = (todayDay - daysAgo + 7) % 7;
          weeklyBreakdown[dayIndex] += amount;
        }
      });

      // Create week data starting from Monday
      const mondayIndex = 1;
      const reorderedWeekData = [];
      for (let i = 0; i < 7; i++) {
        const dayIndex = (mondayIndex + i) % 7;
        reorderedWeekData.push({
          day: dayNames[dayIndex],
          value: Math.round(weeklyBreakdown[dayIndex]),
        });
      }
      
      setWeekData(reorderedWeekData);

      // Calculate growth percentage
      const growth = lastMonthRevenue > 0 
        ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      const weekGrowth = lastWeekRevenue > 0
        ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
        : 0;

      const revenueStats: RevenueData = {
        totalRevenue,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        growth: parseFloat(growth.toFixed(1)),
        weekGrowth: parseFloat(weekGrowth.toFixed(1)),
        transactions: transactions.slice(0, 10), // Show last 10 transactions
      };
      
      setRevenueData(revenueStats);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      
      // Set empty state on error
      setRevenueData({
        totalRevenue: 0,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        growth: 0,
        weekGrowth: 0,
        transactions: [],
      });
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchRevenueData();
  };

  const formatLastRefresh = () => {
    if (!lastRefresh) return '';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    return lastRefresh.toLocaleTimeString();
  };

  const handleExportReport = () => {
    if (!revenueData) return;

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Revenue Summary
    const summaryData = [
      ['SafariTix Revenue Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Period:', filterPeriod],
      [],
      ['Revenue Summary'],
      ['Metric', 'Amount (RWF)', 'Growth (%)'],
      ['Total Revenue', revenueData.totalRevenue, ''],
      ['Today\'s Revenue', revenueData.todayRevenue, ''],
      ['This Week', revenueData.weekRevenue, revenueData.weekGrowth],
      ['This Month', revenueData.monthRevenue, revenueData.growth],
      [],
      ['Weekly Breakdown (Last 7 Days)'],
      ['Day', 'Revenue (RWF)'],
      ...weekData.map(item => [item.day, item.value]),
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Revenue Summary');

    // Sheet 2: Transactions Detail
    const transactionsData = [
      ['Transaction Details'],
      [],
      ['Date & Time', 'Booking Reference', 'Passenger Name', 'Route', 'Payment Method', 'Amount (RWF)', 'Status'],
      ...revenueData.transactions.map(t => [
        new Date(t.date).toLocaleString(),
        t.bookingRef,
        t.passengerName,
        t.route,
        t.paymentMethod,
        t.amount,
        t.status.toUpperCase()
      ])
    ];

    const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);
    
    // Set column widths
    transactionsSheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 30 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

    // Sheet 3: Daily Breakdown
    const dailyData: (string | number)[][] = [
      ['Daily Revenue Breakdown'],
      [],
      ['Day', 'Revenue (RWF)', 'Percentage of Week'],
    ];

    const weekTotal = weekData.reduce((sum, item) => sum + item.value, 0);
    weekData.forEach(item => {
      const percentage = weekTotal > 0 ? ((item.value / weekTotal) * 100).toFixed(1) : '0.0';
      dailyData.push([item.day, item.value, `${percentage}%`]);
    });
    dailyData.push([]);
    dailyData.push(['Total Week Revenue', weekTotal, '100%']);

    const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
    dailySheet['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Breakdown');

    // Generate filename with current date
    const fileName = `SafariTix_Revenue_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write the file
    XLSX.writeFile(workbook, fileName);
  };

  const maxValue = Math.max(...weekData.map(d => d.value), 1); // Minimum 1 to avoid division by zero

  const styles: Record<string, CSSProperties> = {
    container: {
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#6B7280',
    },
    controls: {
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      marginBottom: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    filterSelect: {
      padding: '10px 36px 10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
    },
    exportButton: {
      padding: '10px 20px',
      background: SAFARITIX.primary,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    refreshButton: {
      padding: '10px 20px',
      background: 'white',
      color: SAFARITIX.primary,
      border: `2px solid ${SAFARITIX.primary}`,
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
    },
    lastRefreshText: {
      fontSize: '13px',
      color: '#6B7280',
      marginRight: '12px',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    statCard: {
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
    },
    statHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    statLabel: {
      fontSize: '14px',
      color: '#6B7280',
      fontWeight: '500',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '8px',
    },
    growth: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '13px',
      fontWeight: '600',
    },
    chartCard: {
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      marginBottom: '24px',
    },
    chartTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '0',
    },
    chartWrapper: {
      position: 'relative' as const,
      paddingTop: '20px',
    },
    gridLines: {
      position: 'absolute' as const,
      top: '20px',
      left: '0',
      right: '0',
      height: '200px',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'space-between',
      pointerEvents: 'none' as const,
      zIndex: 0,
    },
    gridLine: {
      width: '100%',
      height: '1px',
      background: '#F3F4F6',
      position: 'relative' as const,
    },
    gridLabel: {
      position: 'absolute' as const,
      left: '-50px',
      top: '-8px',
      fontSize: '11px',
      color: '#9CA3AF',
      fontWeight: '500',
    },
    chart: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: '200px',
      gap: '16px',
      padding: '0 60px 0 0',
      position: 'relative' as const,
      zIndex: 1,
    },
    bar: {
      borderRadius: '8px 8px 0 0',
      position: 'relative' as const,
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      minHeight: '8px',
    },
    tableContainer: {
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      overflow: 'hidden',
    },
    tableHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #E5E7EB',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    thead: {
      background: '#F9FAFB',
      borderBottom: '1px solid #E5E7EB',
    },
    th: {
      padding: '16px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: '600',
      color: '#6B7280',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #F3F4F6',
      fontSize: '14px',
      color: '#374151',
    },
    statusBadge: {
      display: 'inline-flex',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
    },
    loading: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      fontSize: '16px',
      color: '#6B7280',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading revenue data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <DollarSign size={32} color={SAFARITIX.primary} />
          Revenue Analytics
        </h1>
        <p style={styles.subtitle}>
          Track your earnings and financial performance
        </p>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <select
          style={styles.filterSelect}
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefresh && (
            <span style={styles.lastRefreshText}>
              Updated: {formatLastRefresh()}
            </span>
          )}
          <button 
            style={{
              ...styles.refreshButton,
              opacity: refreshing ? 0.7 : 1,
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
            onClick={handleManualRefresh}
            disabled={refreshing}
            onMouseEnter={(e) => {
              if (!refreshing) {
                e.currentTarget.style.background = SAFARITIX.primarySoft;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            <RefreshCw 
              size={18} 
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            style={styles.exportButton}
            onClick={handleExportReport}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = SAFARITIX.primaryDark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = SAFARITIX.primary;
            }}
          >
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Total Revenue</span>
            <DollarSign size={20} color={SAFARITIX.primary} />
          </div>
          <div style={styles.statValue}>
            RWF {revenueData?.totalRevenue.toLocaleString()}
          </div>
          <div style={{ 
            ...styles.growth, 
            color: (revenueData?.growth || 0) >= 0 ? '#15803D' : '#DC2626' 
          }}>
            {(revenueData?.growth || 0) >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {(revenueData?.growth || 0) >= 0 ? '+' : ''}{revenueData?.growth}% from last period
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Today's Revenue</span>
            <Calendar size={20} color={SAFARITIX.primary} />
          </div>
          <div style={styles.statValue}>
            RWF {revenueData?.todayRevenue.toLocaleString()}
          </div>
          <div style={{ ...styles.growth, color: '#6B7280' }}>
            Last updated just now
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>This Week</span>
            <TrendingUp size={20} color={SAFARITIX.primary} />
          </div>
          <div style={styles.statValue}>
            RWF {revenueData?.weekRevenue.toLocaleString()}
          </div>
          <div style={{ 
            ...styles.growth, 
            color: (revenueData?.weekGrowth || 0) >= 0 ? '#15803D' : '#DC2626' 
          }}>
            {(revenueData?.weekGrowth || 0) >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {(revenueData?.weekGrowth || 0) >= 0 ? '+' : ''}{revenueData?.weekGrowth}% from last week
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>This Month</span>
            <CreditCard size={20} color={SAFARITIX.primary} />
          </div>
          <div style={styles.statValue}>
            RWF {revenueData?.monthRevenue.toLocaleString()}
          </div>
          <div style={{ 
            ...styles.growth, 
            color: (revenueData?.growth || 0) >= 0 ? '#15803D' : '#DC2626' 
          }}>
            {(revenueData?.growth || 0) >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {(revenueData?.growth || 0) >= 0 ? '+' : ''}{revenueData?.growth}% from last month
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={styles.chartCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={styles.chartTitle}>Weekly Revenue Trend</h2>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>
            Last 7 Days
          </div>
        </div>
        
        <div style={styles.chartWrapper}>
          {weekData.every(item => item.value === 0) && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px',
              color: '#9CA3AF',
              background: '#F9FAFB',
              borderRadius: '8px',
              border: '2px dashed #E5E7EB',
              marginBottom: '20px',
            }}>
              <TrendingUp size={32} color="#D1D5DB" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: '#6B7280' }}>
                No Revenue This Week
              </div>
              <div style={{ fontSize: '13px' }}>
                The chart will update automatically when tickets are purchased. Auto-refreshing every 30 seconds.
              </div>
            </div>
          )}
            {/* Grid Lines */}
            <div style={styles.gridLines}>
              {[0, 25, 50, 75, 100].map((percent) => (
                <div key={percent} style={styles.gridLine}>
                  <span style={styles.gridLabel}>
                    {Math.round((maxValue * percent) / 100).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Bars */}
            <div style={styles.chart}>
              {weekData.map((item, index) => {
                const barHeight = item.value > 0 
                  ? Math.max((item.value / maxValue) * 100, 5) // Minimum 5% height
                  : 3; // Small indicator for empty days
                const isToday = item.day === ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
                
                return (
                  <div
                    key={item.day}
                    style={{
                      flex: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Value Label Above Bar */}
                    {item.value > 0 && (
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: SAFARITIX.primary,
                        marginBottom: '8px',
                        minHeight: '20px',
                      }}>
                        {item.value.toLocaleString()}
                      </div>
                    )}
                    
                    {/* Bar Container */}
                    <div style={{ 
                      flex: 1, 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'flex-end',
                      minHeight: '200px'
                    }}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${barHeight}%`,
                          background: item.value > 0 
                            ? `linear-gradient(180deg, ${SAFARITIX.primary} 0%, #005A8D 100%)`
                            : '#E5E7EB',
                          boxShadow: item.value > 0 ? '0 4px 12px rgba(0, 119, 182, 0.2)' : 'none',
                          border: isToday ? '2px solid #27AE60' : 'none',
                          opacity: item.value > 0 ? 1 : 0.3,
                          width: '100%',
                        }}
                        title={`${item.day}: RWF ${item.value.toLocaleString()}`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = item.value > 0 
                            ? '0 8px 20px rgba(0, 119, 182, 0.3)' 
                            : 'none';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = item.value > 0 
                            ? '0 4px 12px rgba(0, 119, 182, 0.2)' 
                            : 'none';
                        }}
                      />
                    </div>
                    
                    {/* Day Label */}
                    <div style={{
                      marginTop: '12px',
                      fontSize: '13px',
                      fontWeight: isToday ? '700' : '500',
                      color: isToday ? '#27AE60' : '#6B7280',
                      textAlign: 'center',
                    }}>
                      {item.day}
                      {isToday && (
                        <div style={{ 
                          fontSize: '10px', 
                          color: '#27AE60',
                          fontWeight: '600',
                          marginTop: '2px'
                        }}>
                          TODAY
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>

      {/* Recent Transactions */}
      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <h2 style={styles.chartTitle}>Recent Transactions</h2>
        </div>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Date & Time</th>
              <th style={styles.th}>Booking Ref</th>
              <th style={styles.th}>Passenger</th>
              <th style={styles.th}>Route</th>
              <th style={styles.th}>Payment Method</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {revenueData?.transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...styles.td, textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                  <DollarSign size={48} color="#D1D5DB" style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Transactions Yet</div>
                  <div style={{ fontSize: '14px' }}>Revenue data will appear here once tickets are sold and confirmed.</div>
                </td>
              </tr>
            ) : (
              revenueData?.transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td style={styles.td}>
                    {new Date(transaction.date).toLocaleString()}
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {transaction.bookingRef}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <strong>{transaction.passengerName}</strong>
                  </td>
                  <td style={styles.td}>{transaction.route}</td>
                  <td style={styles.td}>{transaction.paymentMethod}</td>
                  <td style={styles.td}>
                    <strong>RWF {transaction.amount.toLocaleString()}</strong>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background:
                          transaction.status === 'completed'
                            ? '#DCFCE7'
                            : transaction.status === 'pending'
                            ? '#FEF3C7'
                            : '#FEE2E2',
                        color:
                          transaction.status === 'completed'
                            ? '#15803D'
                            : transaction.status === 'pending'
                            ? '#D97706'
                            : '#DC2626',
                      }}
                    >
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
