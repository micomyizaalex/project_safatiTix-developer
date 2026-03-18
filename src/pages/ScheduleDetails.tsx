const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

import React, { useEffect, useState, CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { API_URL } from '../utils/supabase-client';
import SeatMap from '../components/SeatMap';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Bus, Calendar, Clock, MapPin, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

export default function ScheduleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [schedule, setSchedule] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<any>(null);
  const [lockInfo, setLockInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/schedules/${id}` } });
      return;
    }
    fetchSchedule();
  }, [id, user]);

  const fetchSchedule = async () => {
    try {
      const res = await fetch(`${API_URL}/schedules/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch schedule details');
      }
      const data = await res.json();
      setSchedule(data.schedule);
    } catch (err: any) {
      setError(err.message || 'Failed to load schedule');
    }
  };

  const onSeatSelect = (seat: any, lock?: any) => {
    setSelectedSeat(seat);
    if (lock) setLockInfo(lock);
  };

  const handlePay = async () => {
    if (!selectedSeat) {
      setError('Select a seat before continuing to payment');
      return;
    }

    navigate('/dashboard/commuter/payment', {
      state: {
        selectedSeats: [String(selectedSeat.seat_number || selectedSeat.seatNumber || selectedSeat.number || selectedSeat)],
        scheduleId: schedule.id,
        price: Number(schedule.price_per_seat || schedule.price || 0),
        scheduleDetails: {
          routeFrom: schedule.route?.origin || schedule.origin || 'Origin',
          routeTo: schedule.route?.destination || schedule.destination || 'Destination',
          departureTime: schedule.departure_time,
          scheduleDate: schedule.schedule_date,
          busPlateNumber: schedule.bus?.plate_number || schedule.bus_plate || 'TBA',
          companyName: schedule.company?.company_name || schedule.company_name || 'SafariTix',
        },
      },
    });
  };

  const styles: Record<string, CSSProperties> = {
    container: {
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
      position: 'relative' as const,
    },
    blob1: {
      position: 'absolute' as const,
      top: '-10%',
      right: '-5%',
      width: '500px',
      height: '500px',
      background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
      borderRadius: '50%',
      filter: 'blur(60px)',
      zIndex: 0,
    },
    blob2: {
      position: 'absolute' as const,
      bottom: '-10%',
      left: '-5%',
      width: '400px',
      height: '400px',
      background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
      borderRadius: '50%',
      filter: 'blur(50px)',
      zIndex: 0,
    },
    header: {
      padding: '20px 16px',
      position: 'relative' as const,
      zIndex: 10,
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '12px',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.3s',
      marginBottom: '24px',
      fontSize: '14px',
      fontWeight: '500',
    },
    pageTitle: {
      fontSize: '32px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: 'white',
      marginBottom: '8px',
    },
    pageSubtitle: {
      fontSize: '16px',
      color: 'rgba(255,255,255,0.9)',
    },
    content: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 16px 24px',
      position: 'relative' as const,
      zIndex: 10,
    },
    // Trip Details Card
    tripCard: {
      background: 'white',
      borderRadius: '24px',
      padding: '28px',
      marginBottom: '20px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      borderLeft: `6px solid ${SAFARITIX.primary}`,
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: '#1a1a1a',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    detailLabel: {
      fontSize: '13px',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    detailValue: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a1a1a',
    },
    priceValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: SAFARITIX.primary,
      fontFamily: 'Montserrat, sans-serif',
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      paddingTop: '20px',
      borderTop: '1px solid #e5e7eb',
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    infoLabel: {
      fontSize: '12px',
      color: '#6b7280',
    },
    infoValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1a1a1a',
    },
    // Seat Map Card
    seatCard: {
      background: 'white',
      borderRadius: '24px',
      padding: '28px',
      marginBottom: '20px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    },
    seatCardTitle: {
      fontSize: '20px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: '#1a1a1a',
      marginBottom: '8px',
    },
    seatCardDesc: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '24px',
    },
    // Payment Sticky Bar
    paymentBar: {
      position: 'sticky' as const,
      bottom: '16px',
      background: 'white',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      border: '3px solid #27AE60',
      zIndex: 50,
    },
    paymentContent: {
      display: 'flex',
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
      flexWrap: 'wrap' as const,
    },
    paymentInfo: {
      flex: 1,
      minWidth: '200px',
    },
    paymentTitle: {
      fontSize: '20px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: '#1a1a1a',
      marginBottom: '4px',
    },
    paymentDesc: {
      fontSize: '13px',
      color: '#6b7280',
    },
    paymentRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      flexWrap: 'wrap' as const,
    },
    priceBox: {
      textAlign: 'center' as const,
    },
    priceLabel: {
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '4px',
    },
    priceAmount: {
      fontSize: '32px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: '#27AE60',
    },
    payButton: {
      padding: '16px 32px',
      background: 'linear-gradient(135deg, #27AE60 0%, #1e8c4d 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '16px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 8px 24px rgba(39,174,96,0.3)',
      whiteSpace: 'nowrap' as const,
    },
    // Error/Empty States
    centerCard: {
      maxWidth: '500px',
      margin: '100px auto',
      background: 'white',
      borderRadius: '24px',
      padding: '48px 32px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      textAlign: 'center' as const,
      position: 'relative' as const,
      zIndex: 10,
    },
    errorIcon: {
      width: '64px',
      height: '64px',
      margin: '0 auto 20px',
    },
    centerTitle: {
      fontSize: '24px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      marginBottom: '12px',
      color: '#1a1a1a',
    },
    centerText: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '28px',
      lineHeight: '1.6',
    },
    loadingSpinner: {
      width: '60px',
      height: '60px',
      border: '4px solid rgba(255,255,255,0.2)',
      borderTopColor: 'white',
      borderRadius: '50%',
      margin: '0 auto 24px',
      animation: 'spin 1s linear infinite',
    },
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.blob1} />
        <div style={styles.blob2} />
        <div style={{ ...styles.content, paddingTop: '40px' }}>
          <div style={styles.centerCard}>
            <AlertCircle style={{ ...styles.errorIcon, color: '#dc2626' }} />
            <h2 style={{ ...styles.centerTitle, color: '#dc2626' }}>Error</h2>
            <p style={styles.centerText}>{error}</p>
            <button
              onClick={() => navigate('/dashboard/commuter')}
              style={{
                ...styles.backButton,
                background: SAFARITIX.primary,
                color: 'white',
                border: 'none',
                margin: '0 auto',
              }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              Back to Dashboard
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div style={styles.container}>
        <div style={styles.blob1} />
        <div style={styles.blob2} />
        <div style={{ ...styles.content, paddingTop: '40px' }}>
          <div style={styles.centerCard}>
            <div style={styles.loadingSpinner} />
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading schedule...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!schedule.bookable) {
    return (
      <div style={styles.container}>
        <div style={styles.blob1} />
        <div style={styles.blob2} />
        <div style={{ ...styles.content, paddingTop: '40px' }}>
          <div style={styles.centerCard}>
            <AlertCircle style={{ ...styles.errorIcon, color: '#f59e0b' }} />
            <h2 style={styles.centerTitle}>Booking Unavailable</h2>
            <p style={styles.centerText}>
              This trip is no longer available for booking. It may have departed or ticket sales have closed.
            </p>
            <button
              onClick={() => navigate('/dashboard/commuter')}
              style={{
                ...styles.backButton,
                background: SAFARITIX.primary,
                color: 'white',
                border: 'none',
                margin: '0 auto',
              }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              Back to Dashboard
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Background Blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <button
            onClick={() => navigate('/dashboard/commuter')}
            style={styles.backButton}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Back to Search
          </button>
          <h1 style={styles.pageTitle}>Select Your Seat</h1>
          <p style={styles.pageSubtitle}>Choose an available seat for your journey</p>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Trip Details Card */}
        <div style={styles.tripCard}>
          <div style={styles.cardTitle}>
            <Bus style={{ width: '24px', height: '24px', color: SAFARITIX.primary }} />
            Trip Details
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>
                <MapPin style={{ width: '16px', height: '16px' }} />
                Route
              </div>
              <div style={styles.detailValue}>
                {schedule.routeFrom} → {schedule.routeTo}
              </div>
            </div>

            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>
                <Calendar style={{ width: '16px', height: '16px' }} />
                Departure
              </div>
              <div style={styles.detailValue}>
                {new Date(schedule.departureTime).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>

            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>
                <Clock style={{ width: '16px', height: '16px' }} />
                Time
              </div>
              <div style={styles.detailValue}>
                {new Date(schedule.departureTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>
                <DollarSign style={{ width: '16px', height: '16px' }} />
                Price
              </div>
              <div style={styles.priceValue}>
                RWF {schedule.price.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Bus</div>
              <div style={{ ...styles.infoValue, fontFamily: 'monospace' }}>
                {schedule.busPlate || 'N/A'}
              </div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Capacity</div>
              <div style={styles.infoValue}>
                {schedule.busCapacity || 'N/A'} seats
              </div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Available</div>
              <Badge style={{
                background: schedule.availableSeats > 5 ? '#27AE60' : '#f59e0b',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
              }}>
                {schedule.availableSeats} seats left
              </Badge>
            </div>
          </div>
        </div>

        {/* Seat Map Card */}
        <div style={styles.seatCard}>
          <div style={styles.seatCardTitle}>Select Your Seat</div>
          <div style={styles.seatCardDesc}>
            Tap an available seat to reserve it. Click Book to proceed to payment.
          </div>
          <SeatMap 
            scheduleId={schedule.id} 
            price={schedule.price}
            onSelect={onSeatSelect}
            scheduleDetails={{
              routeFrom: schedule.routeFrom || schedule.origin,
              routeTo: schedule.routeTo || schedule.destination,
              departureTime: schedule.departureTime,
              scheduleDate: schedule.scheduleDate,
              busPlateNumber: schedule.busPlateNumber || schedule.busNumber,
              companyName: schedule.companyName || 'SafariTix',
            }}
          />
        </div>

        {/* Payment Bar */}
        {selectedSeat && lockInfo && (
          <div style={styles.paymentBar}>
            <div style={styles.paymentContent}>
              <div style={styles.paymentInfo}>
                <div style={styles.paymentTitle}>
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#27AE60', display: 'inline', marginRight: '8px' }} />
                  Seat {selectedSeat.seat_number} Reserved
                </div>
                <div style={styles.paymentDesc}>
                  Complete payment to confirm your booking
                </div>
              </div>
              <div style={styles.paymentRight}>
                <div style={styles.priceBox}>
                  <div style={styles.priceLabel}>Total Amount</div>
                  <div style={styles.priceAmount}>
                    RWF {schedule.price.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={handlePay}
                  disabled={loading}
                  style={styles.payButton}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(39,174,96,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(39,174,96,0.3)';
                  }}
                >
                  {loading ? 'Processing...' : 'Proceed to Payment →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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