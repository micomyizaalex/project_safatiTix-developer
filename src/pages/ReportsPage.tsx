import { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '../components/AuthContext';
import { BarChart3, Download, Calendar, Filter, FileText, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

interface ReportData {
  totalBookings: number;
  totalRevenue: number;
  totalPassengers: number;
  averageOccupancy: number;
  popularRoutes: RouteData[];
  busPerformance: BusPerformance[];
}

interface RouteData {
  route: string;
  bookings: number;
  revenue: number;
}

interface BusPerformance {
  busNumber: string;
  trips: number;
  revenue: number;
  occupancy: number;
}

export default function Reports() {
  const { accessToken } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterMonth, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Fetch real data from API
      const [ticketsResponse, busesResponse, schedulesResponse] = await Promise.all([
        fetch(`${API_URL}/company/tickets`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/company/buses`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/company/schedules`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!ticketsResponse.ok || !busesResponse.ok || !schedulesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const ticketsData = await ticketsResponse.json();
      const busesData = await busesResponse.json();
      const schedulesData = await schedulesResponse.json();

      console.log('Tickets data:', ticketsData);
      console.log('Buses data:', busesData);
      console.log('Schedules data:', schedulesData);

      // Filter tickets by date range and confirmed status
      const tickets = (ticketsData.tickets || []).filter((ticket: any) => {
        const ticketDate = new Date(ticket.bookedAt || ticket.booked_at || ticket.createdAt);
        const isPaid = 
          ticket.status === 'CONFIRMED' || 
          ticket.status === 'CHECKED_IN' || 
          ticket.status === 'booked' ||
          ticket.paymentStatus === 'paid';
        return ticketDate >= startDate && isPaid && ticket.status !== 'CANCELLED' && ticket.status !== 'EXPIRED';
      });

      // Calculate metrics
      const totalBookings = tickets.length;
      const totalRevenue = tickets.reduce((sum: number, ticket: any) => sum + parseFloat(ticket.price || 0), 0);
      const totalPassengers = tickets.length; // Each ticket = 1 passenger

      // Calculate route statistics
      const routeStats = new Map<string, { bookings: number; revenue: number }>();
      tickets.forEach((ticket: any) => {
        const route = `${ticket.routeFrom || 'N/A'} → ${ticket.routeTo || 'N/A'}`;
        const existing = routeStats.get(route) || { bookings: 0, revenue: 0 };
        routeStats.set(route, {
          bookings: existing.bookings + 1,
          revenue: existing.revenue + parseFloat(ticket.price || 0),
        });
      });

      // Sort routes by bookings and get top 5
      const popularRoutes = Array.from(routeStats.entries())
        .map(([route, stats]) => ({ route, ...stats }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5);

      // Calculate bus performance
      const busStats = new Map<string, { trips: number; revenue: number; totalSeats: number; bookedSeats: number }>();
      const buses = busesData.buses || [];
      
      // Initialize bus stats with all buses
      buses.forEach((bus: any) => {
        busStats.set(bus.plateNumber || bus.plate_number, {
          trips: 0,
          revenue: 0,
          totalSeats: 0,
          bookedSeats: 0,
        });
      });

      // Count trips from schedules that match date range
      const schedules = (schedulesData.schedules || []).filter((schedule: any) => {
        const scheduleDate = new Date(schedule.departureTime || schedule.departure_time);
        return scheduleDate >= startDate;
      });

      schedules.forEach((schedule: any) => {
        const busPlate = schedule.busPlateNumber || schedule.bus_plate_number;
        if (busPlate) {
          const existing = busStats.get(busPlate) || { trips: 0, revenue: 0, totalSeats: 0, bookedSeats: 0 };
          const bus = buses.find((b: any) => (b.plateNumber || b.plate_number) === busPlate);
          const capacity = bus ? (bus.capacity || 40) : 40;
          
          // Count tickets for this schedule
          const scheduleTickets = tickets.filter((t: any) => t.scheduleId === schedule.id);
          const scheduleRevenue = scheduleTickets.reduce((sum: number, t: any) => sum + parseFloat(t.price || 0), 0);
          
          busStats.set(busPlate, {
            trips: existing.trips + 1,
            revenue: existing.revenue + scheduleRevenue,
            totalSeats: existing.totalSeats + capacity,
            bookedSeats: existing.bookedSeats + scheduleTickets.length,
          });
        }
      });

      // Convert to array and calculate occupancy
      const busPerformance = Array.from(busStats.entries())
        .map(([busNumber, stats]) => ({
          busNumber,
          trips: stats.trips,
          revenue: stats.revenue,
          occupancy: stats.totalSeats > 0 ? (stats.bookedSeats / stats.totalSeats) * 100 : 0,
        }))
        .filter(bus => bus.trips > 0) // Only show buses with trips
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate average occupancy across all buses
      const totalOccupancy = busPerformance.reduce((sum, bus) => sum + bus.occupancy, 0);
      const averageOccupancy = busPerformance.length > 0 ? totalOccupancy / busPerformance.length : 0;

      const reportDataResult: ReportData = {
        totalBookings,
        totalRevenue,
        totalPassengers,
        averageOccupancy: parseFloat(averageOccupancy.toFixed(1)),
        popularRoutes,
        busPerformance: busPerformance.slice(0, 5), // Top 5 buses
      };
      
      setReportData(reportDataResult);
    } catch (error) {
      console.error('Error fetching report data:', error);
      
      // Set empty data on error
      setReportData({
        totalBookings: 0,
        totalRevenue: 0,
        totalPassengers: 0,
        averageOccupancy: 0,
        popularRoutes: [],
        busPerformance: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!reportData) return;

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Overview Summary
    const summaryData = [
      ['SafariTix Analytics Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Report Type:', reportType],
      ['Period:', dateRange],
      [],
      ['Key Metrics'],
      ['Metric', 'Value'],
      ['Total Bookings', reportData.totalBookings],
      ['Total Revenue (RWF)', reportData.totalRevenue],
      ['Total Passengers', reportData.totalPassengers],
      ['Average Occupancy (%)', reportData.averageOccupancy],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Overview');

    // Sheet 2: Popular Routes
    const routesData: (string | number)[][] = [
      ['Most Popular Routes'],
      [],
      ['Route', 'Bookings', 'Revenue (RWF)'],
      ...reportData.popularRoutes.map(r => [r.route, r.bookings, r.revenue])
    ];

    const routesSheet = XLSX.utils.aoa_to_sheet(routesData);
    routesSheet['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, routesSheet, 'Popular Routes');

    // Sheet 3: Bus Performance
    const busData: (string | number)[][] = [
      ['Bus Performance Analysis'],
      [],
      ['Bus Number', 'Trips', 'Revenue (RWF)', 'Occupancy (%)'],
      ...reportData.busPerformance.map(b => [
        b.busNumber,
        b.trips,
        b.revenue,
        parseFloat(b.occupancy.toFixed(1))
      ])
    ];

    const busSheet = XLSX.utils.aoa_to_sheet(busData);
    busSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, busSheet, 'Bus Performance');

    // Generate filename
    const fileName = `SafariTix_${reportType}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write the file
    XLSX.writeFile(workbook, fileName);
  };

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
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      marginBottom: '24px',
    },
    controlsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      alignItems: 'end',
    },
    formGroup: {
      marginBottom: '0',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      boxSizing: 'border-box' as const,
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
      justifyContent: 'center',
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
    },
    contentGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
      gap: '24px',
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      padding: '24px',
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    th: {
      textAlign: 'left' as const,
      padding: '12px 8px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#6B7280',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid #E5E7EB',
    },
    td: {
      padding: '16px 8px',
      fontSize: '14px',
      color: '#374151',
      borderBottom: '1px solid #F3F4F6',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      background: '#E5E7EB',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '8px',
    },
    progressFill: {
      height: '100%',
      background: SAFARITIX.primary,
      borderRadius: '4px',
      transition: 'width 0.3s',
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
        <div style={styles.loading}>Generating reports...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <BarChart3 size={32} color={SAFARITIX.primary} />
          Reports & Analytics
        </h1>
        <p style={styles.subtitle}>
          Comprehensive insights and performance metrics
        </p>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlsGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Report Type
            </label>
            <select
              style={styles.select}
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="overview">Overview Report</option>
              <option value="revenue">Revenue Report</option>
              <option value="bookings">Bookings Report</option>
              <option value="performance">Performance Report</option>
              <option value="occupancy">Occupancy Report</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Date Range
            </label>
            <select
              style={styles.select}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div>
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
      </div>

      {/* Stats Overview */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Total Bookings</span>
            <FileText size={20} color={SAFARITIX.primary} />
          </div>
          <div style={styles.statValue}>{reportData?.totalBookings.toLocaleString()}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Total Revenue</span>
            <TrendingUp size={20} color={SAFARITIX.primary} />
          </div>
          <div style={styles.statValue}>
            RWF {reportData?.totalRevenue.toLocaleString()}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Total Passengers</span>
            <BarChart3 size={20} color={SAFARITIX.primary} />
          </div>
          <div style={styles.statValue}>{reportData?.totalPassengers.toLocaleString()}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Avg. Occupancy</span>
            <TrendingUp size={20} color={SAFARITIX.primary} />
          </div>
          <div style={styles.statValue}>{reportData?.averageOccupancy}%</div>
        </div>
      </div>

      {/* Detailed Reports */}
      <div style={styles.contentGrid}>
        {/* Popular Routes */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <BarChart3 size={20} color={SAFARITIX.primary} />
            Most Popular Routes
          </h2>
          
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Route</th>
                <th style={styles.th}>Bookings</th>
                <th style={styles.th}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.popularRoutes.map((route, index) => (
                <tr key={index}>
                  <td style={styles.td}>
                    <strong>{route.route}</strong>
                  </td>
                  <td style={styles.td}>{route.bookings}</td>
                  <td style={styles.td}>
                    <strong>RWF {route.revenue.toLocaleString()}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bus Performance */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <TrendingUp size={20} color={SAFARITIX.primary} />
            Bus Performance
          </h2>
          
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Bus</th>
                <th style={styles.th}>Trips</th>
                <th style={styles.th}>Revenue</th>
                <th style={styles.th}>Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.busPerformance.map((bus, index) => (
                <tr key={index}>
                  <td style={styles.td}>
                    <strong>{bus.busNumber}</strong>
                  </td>
                  <td style={styles.td}>{bus.trips}</td>
                  <td style={styles.td}>
                    RWF {bus.revenue.toLocaleString()}
                  </td>
                  <td style={styles.td}>
                    <div>
                      {bus.occupancy.toFixed(1)}%
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${bus.occupancy}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
