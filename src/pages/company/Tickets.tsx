import { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '../components/AuthContext';
import { Ticket, Eye, Search, Filter, Download, Calendar } from 'lucide-react';

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

interface TicketData {
  id: string;
  bookingRef: string;
  price: number;
  paymentStatus: string;
  seatNumber: string;
  qrCode: string | null;
  status: string;
  scanned: boolean;
  bookedAt: string;
  checkedInAt: string | null;
  scheduleId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  scheduleDate: string | null;
  departureTime: string | null;
  routeFrom: string;
  routeTo: string;
  busPlateNumber: string;
  busModel: string;
}

export default function Tickets() {
  const { accessToken } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching tickets from:', `${API_URL}/company/tickets`);
      
      const response = await fetch(`${API_URL}/company/tickets`, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Tickets data received:', data);
      console.log('Number of tickets:', data.tickets?.length || 0);
      
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load tickets';
      setError(errorMsg);
      alert(`Error loading tickets: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return '#10B981';
      case 'CHECKED_IN':
        return '#3B82F6';
      case 'PENDING_PAYMENT':
        return '#F59E0B';
      case 'CANCELLED':
        return '#EF4444';
      case 'EXPIRED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.seatNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.passengerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.routeFrom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.routeTo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      ticket.status.toUpperCase() === filterStatus.toUpperCase();

    return matchesSearch && matchesFilter;
  });

  const totalRevenue = tickets
    .filter(t => t.status === 'CONFIRMED' || t.status === 'CHECKED_IN')
    .reduce((sum, t) => sum + t.price, 0);

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
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    statCard: {
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
    },
    statLabel: {
      fontSize: '13px',
      color: '#6B7280',
      marginBottom: '8px',
      fontWeight: '500',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#111827',
    },
    controls: {
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      marginBottom: '24px',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap' as const,
      alignItems: 'center',
    },
    searchBox: {
      flex: '1',
      minWidth: '250px',
      position: 'relative' as const,
    },
    searchInput: {
      width: '100%',
      padding: '10px 10px 10px 40px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
    },
    searchIcon: {
      position: 'absolute' as const,
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9CA3AF',
    },
    filterSelect: {
      padding: '10px 36px 10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      background: 'white',
    },
    tableContainer: {
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      overflow: 'hidden',
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
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center' as const,
      minWidth: '100px',
    },
    scannedBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '500',
    },
    actionBtn: {
      padding: '8px',
      border: 'none',
      background: SAFARITIX.primarySoft,
      color: SAFARITIX.primary,
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#9CA3AF',
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
        <div style={styles.loading}>Loading tickets...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Ticket size={32} color={SAFARITIX.primary} />
          Tickets Management
        </h1>
        <p style={styles.subtitle}>
          View and manage all passenger tickets
        </p>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Tickets</div>
          <div style={styles.statValue}>{tickets.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Confirmed</div>
          <div style={styles.statValue}>
            {tickets.filter(t => t.status === 'CONFIRMED').length}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Checked In</div>
          <div style={styles.statValue}>
            {tickets.filter(t => t.status === 'CHECKED_IN').length}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending Payment</div>
          <div style={styles.statValue}>
            {tickets.filter(t => t.status === 'PENDING_PAYMENT').length}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Revenue</div>
          <div style={styles.statValue}>
            TZS {totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.searchBox}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by passenger, route, seat, booking ref..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select
          style={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Booking Ref</th>
              <th style={styles.th}>Passenger</th>
              <th style={styles.th}>Route</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Bus</th>
              <th style={styles.th}>Seat</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}>Scanned</th>
              <th style={styles.th}>Booked At</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={12} style={styles.emptyState}>
                  No tickets found
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td style={styles.td}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600' }}>
                      {ticket.bookingRef}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong>{ticket.passengerName}</strong>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{ticket.passengerPhone}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px' }}>{ticket.routeFrom}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>→</span>
                      <span style={{ fontSize: '13px' }}>{ticket.routeTo}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {ticket.scheduleDate ? (
                        <>
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>
                            {new Date(ticket.scheduleDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            {ticket.departureTime}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>N/A</span>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{ticket.busPlateNumber}</span>
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>{ticket.busModel}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <strong style={{ fontSize: '15px' }}>{ticket.seatNumber}</strong>
                  </td>
                  <td style={styles.td}>
                    <strong>TZS {ticket.price.toLocaleString()}</strong>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: `${getStatusColor(ticket.status)}15`,
                        color: getStatusColor(ticket.status),
                      }}
                    >
                      {getStatusLabel(ticket.status)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.scannedBadge,
                        background: ticket.paymentStatus === 'paid' ? '#DCFCE7' : '#FEF3C7',
                        color: ticket.paymentStatus === 'paid' ? '#15803D' : '#92400E',
                      }}
                    >
                      {ticket.paymentStatus.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.scannedBadge,
                        background: ticket.scanned ? '#DBEAFE' : '#F3F4F6',
                        color: ticket.scanned ? '#1E40AF' : '#6B7280',
                      }}
                    >
                      {ticket.scanned ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {new Date(ticket.bookedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.actionBtn}
                      onClick={() => {
                        alert(`Ticket Details:\n\nBooking Ref: ${ticket.bookingRef}\nPassenger: ${ticket.passengerName}\nEmail: ${ticket.passengerEmail}\nPhone: ${ticket.passengerPhone}\nRoute: ${ticket.routeFrom} → ${ticket.routeTo}\nSeat: ${ticket.seatNumber}\nPrice: TZS ${ticket.price}\nStatus: ${ticket.status}`);
                      }}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
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
