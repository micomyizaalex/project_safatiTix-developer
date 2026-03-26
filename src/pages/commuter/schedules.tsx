import React, { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '../../components/AuthContext';
import { API_URL } from '../../config';
import {
  Calendar,
  Clock,
  MapPin,
  Bus,
  Users,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ArrowRight,
  Filter,
  Search,
  ChevronDown,
} from 'lucide-react';

interface Schedule {
  id: string;
  routeFrom: string;
  routeTo: string;
  departureTime: string;
  scheduleDate: string;
  seatsAvailable: number;
  totalSeats: number;
  bookedSeats: number;
  price: number;
  busPlateNumber: string;
  driverName: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  companyName?: string;
}

interface SchedulesProps {
  onBack?: () => void;
}

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

export function Schedules({ onBack }: SchedulesProps) {
  const { accessToken } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    routeFrom: '',
    routeTo: '',
    scheduleDate: '',
    departureTime: '',
    busPlateNumber: '',
    price: '',
    totalSeats: '',
  });

  useEffect(() => {
    if (accessToken) {
      fetchSchedules();
    }
  }, [accessToken]);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/company/schedules`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`${API_URL}/company/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        await fetchSchedules();
        alert('Schedule deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error deleting schedule');
    }
  }

  function openEditModal(schedule: Schedule) {
    setEditMode(true);
    setSelectedSchedule(schedule);
    setFormData({
      routeFrom: schedule.routeFrom,
      routeTo: schedule.routeTo,
      scheduleDate: schedule.scheduleDate ? new Date(schedule.scheduleDate).toISOString().split('T')[0] : '',
      departureTime: schedule.departureTime ? new Date(schedule.departureTime).toTimeString().slice(0, 5) : '',
      busPlateNumber: schedule.busPlateNumber || '',
      price: schedule.price.toString(),
      totalSeats: schedule.totalSeats.toString(),
    });
    setShowAddModal(true);
  }

  function openAddModal() {
    setEditMode(false);
    setSelectedSchedule(null);
    setFormData({
      routeFrom: '',
      routeTo: '',
      scheduleDate: '',
      departureTime: '',
      busPlateNumber: '',
      price: '',
      totalSeats: '',
    });
    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setSelectedSchedule(null);
    setEditMode(false);
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();

    try {
      const url = editMode && selectedSchedule
        ? `${API_URL}/company/schedules/${selectedSchedule.id}`
        : `${API_URL}/company/schedules`;

      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          route_from: formData.routeFrom,
          route_to: formData.routeTo,
          schedule_date: formData.scheduleDate,
          departure_time: `${formData.scheduleDate}T${formData.departureTime}`,
          bus_plate_number: formData.busPlateNumber,
          price_per_seat: parseFloat(formData.price),
          total_seats: parseInt(formData.totalSeats),
        }),
      });

      if (response.ok) {
        await fetchSchedules();
        closeModal();
        alert(editMode ? 'Schedule updated successfully!' : 'Schedule created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error saving schedule');
    }
  }

  const filteredSchedules = schedules.filter((schedule) => {
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    const matchesSearch =
      schedule.routeFrom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.routeTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.busPlateNumber.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: schedules.length,
    scheduled: schedules.filter((s) => s.status === 'scheduled').length,
    completed: schedules.filter((s) => s.status === 'completed').length,
    cancelled: schedules.filter((s) => s.status === 'cancelled').length,
    totalRevenue: schedules
      .filter((s) => s.status !== 'cancelled')
      .reduce((sum, s) => sum + s.price * s.bookedSeats, 0),
  };

  const styles: Record<string, CSSProperties> = {
    container: {
      minHeight: '100vh',
      background: '#F5F5F5',
      padding: '32px',
    },
    header: {
      marginBottom: '32px',
    },
    headerTop: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: 'white',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: '#6B7280',
      transition: 'all 0.2s',
    },
    headerTitle: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#111827',
      fontFamily: 'Montserrat, sans-serif',
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 24px',
      background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(0,119,182,0.3)',
      transition: 'all 0.2s',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '16px',
      marginBottom: '24px',
    },
    statCard: {
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    statIcon: {
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '12px',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: '#111827',
      marginBottom: '4px',
    },
    statLabel: {
      fontSize: '13px',
      color: '#6B7280',
    },
    controlsBar: {
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    controlsRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    searchWrapper: {
      flex: 1,
      position: 'relative' as const,
      maxWidth: '400px',
    },
    searchInput: {
      width: '100%',
      padding: '10px 16px 10px 40px',
      borderRadius: '10px',
      border: '1px solid #E5E7EB',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s',
    },
    searchIcon: {
      position: 'absolute' as const,
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9CA3AF',
    },
    filterGroup: {
      display: 'flex',
      gap: '8px',
    },
    filterButton: {
      padding: '10px 16px',
      borderRadius: '10px',
      border: '1px solid #E5E7EB',
      background: 'white',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      color: '#6B7280',
      transition: 'all 0.2s',
    },
    filterButtonActive: {
      background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
      color: 'white',
      border: 'none',
    },
    tableContainer: {
      background: 'white',
      borderRadius: '16px',
      overflow: 'hidden' as const,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    tableHeader: {
      background: '#F9FAFB',
      borderBottom: '2px solid #E5E7EB',
    },
    th: {
      padding: '16px 20px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: '600',
      color: '#6B7280',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    td: {
      padding: '20px',
      fontSize: '14px',
      color: '#111827',
      borderBottom: '1px solid #F3F4F6',
    },
    tableRow: {
      transition: 'all 0.2s',
      cursor: 'pointer',
    },
    routeCell: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      color: '#111827',
    },
    statusBadge: {
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      display: 'inline-block',
    },
    seatsCell: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
    },
    seatsProgress: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    seatsLabel: {
      fontSize: '12px',
      color: '#6B7280',
      minWidth: '80px',
    },
    seatsCount: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#111827',
    },
    progressBar: {
      width: '100px',
      height: '8px',
      background: '#E5E7EB',
      borderRadius: '4px',
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.3s',
    },
    priceRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      background: `linear-gradient(135deg, ${SAFARITIX.primarySoft} 0%, #E0F2FE 100%)`,
      borderRadius: '12px',
      marginBottom: '16px',
    },
    priceLabel: {
      fontSize: '12px',
      color: SAFARITIX.primary,
      fontWeight: '500',
    },
    priceAmount: {
      fontSize: '20px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: SAFARITIX.primary,
    },
    actions: {
      display: 'flex',
      gap: '8px',
    },
    actionButton: {
      padding: '8px',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
      background: 'white',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      transition: 'all 0.2s',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '80px 20px',
    },
    emptyIllustration: {
      width: '120px',
      height: '120px',
      margin: '0 auto 24px',
      background: `linear-gradient(135deg, ${SAFARITIX.primarySoft} 0%, #E0F2FE 100%)`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '8px',
    },
    emptyText: {
      fontSize: '14px',
      color: '#6B7280',
    },
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: `4px solid ${SAFARITIX.primary}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: '#6B7280' }}>Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {onBack && (
              <button
                style={styles.backButton}
                onClick={onBack}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              >
                ← Back
              </button>
            )}
            <h1 style={styles.headerTitle}>Schedules</h1>
          </div>
          <button
            style={styles.addButton}
            onClick={openAddModal}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,119,182,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,119,182,0.3)';
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            Add Schedule
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E0F2FE' }}>
              <Calendar style={{ width: '20px', height: '20px', color: SAFARITIX.primary }} />
            </div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Schedules</div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#DCFCE7' }}>
              <Check style={{ width: '20px', height: '20px', color: '#10B981' }} />
            </div>
            <div style={styles.statValue}>{stats.scheduled}</div>
            <div style={styles.statLabel}>Scheduled</div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#FEF3C7' }}>
              <Clock style={{ width: '20px', height: '20px', color: '#F59E0B' }} />
            </div>
            <div style={styles.statValue}>{stats.completed}</div>
            <div style={styles.statLabel}>Completed</div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#FEE2E2' }}>
              <X style={{ width: '20px', height: '20px', color: '#EF4444' }} />
            </div>
            <div style={styles.statValue}>{stats.cancelled}</div>
            <div style={styles.statLabel}>Cancelled</div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E0E7FF' }}>
              <DollarSign style={{ width: '20px', height: '20px', color: '#6366F1' }} />
            </div>
            <div style={styles.statValue}>RWF {stats.totalRevenue.toLocaleString()}</div>
            <div style={styles.statLabel}>Revenue</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controlsBar}>
        <div style={styles.controlsRow}>
          <div style={styles.searchWrapper}>
            <Search style={styles.searchIcon} size={18} />
            <input
              type="text"
              placeholder="Search by route or bus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              onFocus={(e) => (e.currentTarget.style.borderColor = SAFARITIX.primary)}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
            />
          </div>

          <div style={styles.filterGroup}>
            <button
              style={{
                ...styles.filterButton,
                ...(filterStatus === 'all' ? styles.filterButtonActive : {}),
              }}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(filterStatus === 'scheduled' ? styles.filterButtonActive : {}),
              }}
              onClick={() => setFilterStatus('scheduled')}
            >
              Scheduled
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(filterStatus === 'completed' ? styles.filterButtonActive : {}),
              }}
              onClick={() => setFilterStatus('completed')}
            >
              Completed
            </button>
            <button
              style={{
                ...styles.filterButton,
                ...(filterStatus === 'cancelled' ? styles.filterButtonActive : {}),
              }}
              onClick={() => setFilterStatus('cancelled')}
            >
              Cancelled
            </button>
          </div>
        </div>
      </div>

      {/* Schedules Table */}
      {filteredSchedules.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIllustration}>
            <Calendar style={{ width: '60px', height: '60px', color: SAFARITIX.primary }} />
          </div>
          <div style={styles.emptyTitle}>No Schedules Found</div>
          <div style={styles.emptyText}>
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Create your first schedule to get started'}
          </div>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.th}>Route</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Departure</th>
                <th style={styles.th}>Bus</th>
                <th style={styles.th}>Driver</th>
                <th style={styles.th}>Seats</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Revenue</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((schedule) => {
                const bookedPercentage = (schedule.bookedSeats / schedule.totalSeats) * 100;
                const isLowSeats = schedule.seatsAvailable <= 5;

                return (
                  <tr
                    key={schedule.id}
                    style={styles.tableRow}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <td style={styles.td}>
                      <div style={styles.routeCell}>
                        {schedule.routeFrom}
                        <ArrowRight style={{ width: '16px', height: '16px', color: SAFARITIX.primary }} />
                        {schedule.routeTo}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {new Date(schedule.scheduleDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={styles.td}>
                      {new Date(schedule.departureTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={styles.td}>{schedule.busPlateNumber || '-'}</td>
                    <td style={styles.td}>{schedule.driverName || 'Unassigned'}</td>
                    <td style={styles.td}>
                      <div style={styles.seatsCell}>
                        <div style={styles.seatsProgress}>
                          <span style={styles.seatsLabel}>
                            {schedule.bookedSeats}/{schedule.totalSeats}
                          </span>
                        </div>
                        <div style={styles.progressBar}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${bookedPercentage}%`,
                              background: isLowSeats
                                ? 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)'
                                : 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <strong>RWF {schedule.price.toLocaleString()}</strong>
                    </td>
                    <td style={styles.td}>
                      <strong>RWF {(schedule.price * schedule.bookedSeats).toLocaleString()}</strong>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          background:
                            schedule.status === 'scheduled'
                              ? '#DCFCE7'
                              : schedule.status === 'completed'
                              ? '#E0E7FF'
                              : '#FEE2E2',
                          color:
                            schedule.status === 'scheduled'
                              ? '#10B981'
                              : schedule.status === 'completed'
                              ? '#6366F1'
                              : '#EF4444',
                        }}
                      >
                        {schedule.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          style={styles.actionButton}
                          onClick={() => openEditModal(schedule)}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                          title="Edit"
                        >
                          <Edit2 style={{ width: '16px', height: '16px' }} />
                        </button>
                        <button
                          style={{ ...styles.actionButton, color: '#EF4444' }}
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FEE2E2';
                            e.currentTarget.style.borderColor = '#EF4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#E5E7EB';
                          }}
                          title="Delete"
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Add Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                {editMode ? 'Edit Schedule' : 'Add New Schedule'}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveSchedule}>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      From
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.routeFrom}
                      onChange={(e) => setFormData({ ...formData, routeFrom: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                      placeholder="e.g., Kigali"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      To
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.routeTo}
                      onChange={(e) => setFormData({ ...formData, routeTo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                      placeholder="e.g., Musanze"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.scheduleDate}
                      onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Departure Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.departureTime}
                      onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Bus Plate Number
                  </label>
                  <input
                    type="text"
                    value={formData.busPlateNumber}
                    onChange={(e) => setFormData({ ...formData, busPlateNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                    placeholder="e.g., RAD 123 A"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Price per Seat (RWF)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                      placeholder="e.g., 2800"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Total Seats
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={formData.totalSeats}
                      onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                      placeholder="e.g., 40"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    color: 'white',
                  }}
                >
                  {editMode ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
