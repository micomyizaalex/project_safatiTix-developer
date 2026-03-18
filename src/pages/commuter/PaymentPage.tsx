import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import { API_URL } from '../../utils/supabase-client';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Phone,
  Check,
  Loader2,
  AlertCircle,
  Bus,
  MapPin,
  Clock,
  Calendar,
  User as UserIcon,
} from 'lucide-react';

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

type PaymentMethod = 'mobile_money' | 'airtel_money' | 'card_payment';

interface LocationState {
  selectedSeats: string[];
  scheduleId: string | number;
  price: number;
  tripId?: string | number;
  fromStop?: string;
  toStop?: string;
  scheduleDetails?: {
    routeFrom: string;
    routeTo: string;
    departureTime: string;
    scheduleDate: string;
    busPlateNumber: string;
    companyName: string;
  };
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user } = useAuth();
  
  // Get data from navigation state
  const state = location.state as LocationState;
  const selectedSeats = state?.selectedSeats || [];
  const scheduleId = state?.scheduleId;
  const pricePerSeat = state?.price || 0;
  const scheduleDetails = state?.scheduleDetails;
  const fromStop = state?.fromStop;
  const toStop = state?.toStop;
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [bookingExpiresAt, setBookingExpiresAt] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const pollingTimeoutRef = useRef<number | null>(null);
  const activeBookingRef = useRef<string | null>(null);
  const paymentCompletedRef = useRef(false);
  const pollStartTimeRef = useRef<number>(0);

  // Maximum time (ms) to poll before giving up waiting for the phone confirmation
  const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  const totalAmount = selectedSeats.length * pricePerSeat;

  useEffect(() => {
    // Redirect if no booking data
    if (!scheduleId || selectedSeats.length === 0) {
      navigate('/dashboard/commuter');
    }
  }, [scheduleId, selectedSeats, navigate]);

  useEffect(() => {
    activeBookingRef.current = activeBookingId;
  }, [activeBookingId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollingTimeoutRef.current) {
        window.clearTimeout(pollingTimeoutRef.current);
      }

      if (activeBookingRef.current && !paymentCompletedRef.current) {
        const hdrs: Record<string, string> = {};
        if (accessToken) hdrs.Authorization = `Bearer ${accessToken}`;

        fetch(`${API_URL}/payments/${activeBookingRef.current}/cancel`, {
          method: 'POST',
          headers: hdrs,
        }).catch(() => undefined);
      }
    };
  }, [accessToken]);

  const clearPolling = () => {
    if (pollingTimeoutRef.current) {
      window.clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  const getHeaders = () => {
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) hdrs.Authorization = `Bearer ${accessToken}`;
    return hdrs;
  };

  const cancelBookingHold = async (bookingId: string) => {
    try {
      const hdrs: Record<string, string> = {};
      if (accessToken) hdrs.Authorization = `Bearer ${accessToken}`;

      await fetch(`${API_URL}/payments/${bookingId}/cancel`, {
        method: 'POST',
        headers: hdrs,
      });
    } catch {
      // Best-effort cleanup only.
    }
  };

  const finishSuccess = (message?: string) => {
    paymentCompletedRef.current = true;
    clearPolling();
    setProcessing(false);
    setError(null);
    setStatusMessage(message || 'Payment confirmed. Your ticket is being prepared.');
    setSuccess(true);
    activeBookingRef.current = null;
    setActiveBookingId(null);
    setBookingExpiresAt(null);

    window.setTimeout(() => {
      navigate('/dashboard/commuter', { state: { tab: 'tickets' } });
    }, 1800);
  };

  const pollPaymentStatus = async (bookingId: string) => {
    // Guard: stop polling if the component unmounted or payment already finished
    if (!isMountedRef.current || paymentCompletedRef.current) return;

    // Hard cap: if we've been polling for longer than POLL_TIMEOUT_MS, abort
    if (Date.now() - pollStartTimeRef.current > POLL_TIMEOUT_MS) {
      clearPolling();
      setProcessing(false);
      setStatusMessage(null);
      setError(
        'Payment confirmation timed out. If you approved the payment on your phone, ' +
        'please check My Tickets — your booking may have been confirmed.'
      );
      return;
    }

    try {
      const response = await fetch(`${API_URL}/payments/${bookingId}/status`, {
        headers: getHeaders(),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to check payment status');
      }

      const payment = data?.payment;
      if (!payment) {
        throw new Error('Payment status response is incomplete');
      }

      // Only treat as success when booking is fully confirmed (tickets created)
      if (payment.booking_status === 'paid') {
        finishSuccess('Payment confirmed! Your ticket is now available.');
        return;
      }

      if (payment.booking_status === 'cancelled' || payment.status === 'failed') {
        clearPolling();
        setProcessing(false);
        setSuccess(false);
        activeBookingRef.current = null;
        setActiveBookingId(null);
        setBookingExpiresAt(null);
        setStatusMessage(null);
        setError('Payment failed or expired. Your seat hold was released.');
        return;
      }

      if (!isMountedRef.current) return;

      setStatusMessage('Waiting for payment confirmation on your phone...');
      // Poll every 4 seconds while payment is pending
      pollingTimeoutRef.current = window.setTimeout(() => {
        void pollPaymentStatus(bookingId);
      }, 4000);
    } catch (err: any) {
      if (!isMountedRef.current) return;

      clearPolling();
      setProcessing(false);
      setStatusMessage(null);
      setError(err.message || 'Unable to confirm payment status.');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    setSuccess(false);
    setStatusMessage(null);

    let createdBookingId: string | null = null;

    try {
      if (activeBookingRef.current && !paymentCompletedRef.current) {
        await cancelBookingHold(activeBookingRef.current);
        activeBookingRef.current = null;
        setActiveBookingId(null);
        setBookingExpiresAt(null);
      }

      const holdResponse = await fetch(`${API_URL}/payments/booking-hold`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          scheduleId,
          selectedSeats,
          paymentMethod,
          amount: totalAmount,
          pricePerSeat,
          fromStop,
          toStop,
        }),
      });

      const holdData = await holdResponse.json().catch(() => ({}));
      if (!holdResponse.ok) {
        throw new Error(holdData?.message || holdData?.error || 'Failed to reserve the selected seats');
      }

      const booking = holdData?.booking;
      if (!booking?.booking_id) {
        throw new Error('Seat hold was created without a booking reference');
      }

      createdBookingId = booking.booking_id;
      activeBookingRef.current = createdBookingId;
      setActiveBookingId(createdBookingId);
      setBookingExpiresAt(booking.expires_at || null);
      setStatusMessage('Seats reserved. Sending payment request to your phone...');

      const payerReference = paymentMethod === 'card_payment' ? cardNumber.trim() : phoneNumber.trim();
      const initiateResponse = await fetch(`${API_URL}/payments/initiate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          booking_id: createdBookingId,
          phone_number: payerReference,
          phoneOrCard: payerReference,
          payment_method: paymentMethod,
          amount: totalAmount,
        }),
      });

      const initiateData = await initiateResponse.json().catch(() => ({}));
      if (!initiateResponse.ok) {
        if (createdBookingId) {
          await cancelBookingHold(createdBookingId);
          activeBookingRef.current = null;
          setActiveBookingId(null);
          setBookingExpiresAt(null);
        }
        throw new Error(initiateData?.message || initiateData?.error || 'Failed to initiate payment');
      }

      const initiatedPayment = initiateData?.payment;

      // If the provider confirmed synchronously (e.g. after a status poll that
      // already called finalizeSuccessfulPayment), finish immediately.
      // Otherwise enter the polling loop and wait for the user to approve on phone.
      if (initiatedPayment?.booking_status === 'paid') {
        finishSuccess('Payment confirmed! Your ticket is ready.');
        return;
      }

      setStatusMessage('Waiting for payment confirmation on your phone...');
      pollStartTimeRef.current = Date.now();
      // createdBookingId is guaranteed non-null here — we throw earlier if absent
      await pollPaymentStatus(createdBookingId!);
    } catch (err: any) {
      if (createdBookingId && !paymentCompletedRef.current) {
        await cancelBookingHold(createdBookingId);
        activeBookingRef.current = null;
        setActiveBookingId(null);
        setBookingExpiresAt(null);
      }
      clearPolling();
      setError(err.message || 'Booking failed. Please try again.');
      setStatusMessage(null);
    } finally {
      if (!paymentCompletedRef.current && !activeBookingRef.current) {
        setProcessing(false);
      }
    }
  };

  const styles: Record<string, CSSProperties> = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #E6F4FB 0%, #fff 100%)',
      padding: '20px',
    },
    content: {
      maxWidth: '900px',
      margin: '0 auto',
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: 'white',
      border: 'none',
      padding: '12px 20px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      color: SAFARITIX.primary,
      cursor: 'pointer',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'all 0.2s',
    },
    header: {
      background: 'white',
      borderRadius: '24px',
      padding: '32px',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    },
    title: {
      fontSize: '32px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: '#1a1a1a',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      marginBottom: '24px',
    },
    bookingInfo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      padding: '20px',
      background: SAFARITIX.primarySoft,
      borderRadius: '16px',
      marginTop: '20px',
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    infoLabel: {
      fontSize: '12px',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    infoValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1a1a1a',
    },
    mainContent: {
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      gap: '24px',
    },
    paymentSection: {
      background: 'white',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    },
    summarySection: {
      background: 'white',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      height: 'fit-content',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '700',
      fontFamily: 'Montserrat, sans-serif',
      color: '#1a1a1a',
      marginBottom: '20px',
    },
    methodGrid: {
      display: 'grid',
      gap: '12px',
      marginBottom: '24px',
    },
    methodCard: {
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '16px',
      padding: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    methodCardActive: {
      borderColor: SAFARITIX.primary,
      background: SAFARITIX.primarySoft,
    },
    methodIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    methodInfo: {
      flex: 1,
    },
    methodTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '2px',
    },
    methodDesc: {
      fontSize: '13px',
      color: '#6b7280',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#1a1a1a',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '14px',
      transition: 'all 0.2s',
      outline: 'none',
    },
    submitButton: {
      width: '100%',
      background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
      color: 'white',
      border: 'none',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      marginTop: '24px',
      transition: 'all 0.3s',
    },
    summaryItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #e5e7eb',
    },
    summaryLabel: {
      fontSize: '14px',
      color: '#6b7280',
    },
    summaryValue: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1a1a1a',
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 0',
      marginTop: '12px',
    },
    totalLabel: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#1a1a1a',
    },
    totalAmount: {
      fontSize: '28px',
      fontWeight: '700',
      color: SAFARITIX.primary,
      fontFamily: 'Montserrat, sans-serif',
    },
    errorAlert: {
      background: '#FEE2E2',
      border: '1px solid #E63946',
      color: '#991B1B',
      padding: '12px 16px',
      borderRadius: '12px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
    },
    successAlert: {
      background: '#D1FAE5',
      border: '1px solid #27AE60',
      color: '#065F46',
      padding: '16px',
      borderRadius: '12px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '600',
    },
    statusAlert: {
      background: '#E6F4FB',
      border: `1px solid ${SAFARITIX.primary}`,
      color: SAFARITIX.primaryDark,
      padding: '14px 16px',
      borderRadius: '12px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px',
      fontWeight: '600',
    },
    seatsDisplay: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '8px',
      marginBottom: '8px',
    },
    seatBadge: {
      background: SAFARITIX.primarySoft,
      color: SAFARITIX.primary,
      padding: '6px 12px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
    },
  };

  if (!scheduleId || selectedSeats.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <button
          style={styles.backButton}
          onClick={() => navigate(-1)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>Complete Your Booking</h1>
          <p style={styles.subtitle}>
            Review your booking details and select a payment method
          </p>

          {scheduleDetails && (
            <div style={styles.bookingInfo}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>
                  <MapPin size={14} />
                  Route
                </div>
                <div style={styles.infoValue}>
                  {scheduleDetails.routeFrom} → {scheduleDetails.routeTo}
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>
                  <Calendar size={14} />
                  Date
                </div>
                <div style={styles.infoValue}>
                  {new Date(scheduleDetails.scheduleDate).toLocaleDateString()}
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>
                  <Clock size={14} />
                  Time
                </div>
                <div style={styles.infoValue}>
                  {new Date(scheduleDetails.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>
                  <Bus size={14} />
                  Bus
                </div>
                <div style={styles.infoValue}>
                  {scheduleDetails.busPlateNumber}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.mainContent}>
          <div style={styles.paymentSection}>
            <h2 style={styles.sectionTitle}>Payment Method</h2>

            {error && (
              <div style={styles.errorAlert}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={styles.successAlert}>
                <Check size={20} />
                <span>Booking successful! Redirecting to your tickets...</span>
              </div>
            )}

            {statusMessage && !success && (
              <div style={styles.statusAlert}>
                <Loader2 size={18} className={processing ? 'animate-spin' : ''} />
                <span>{statusMessage}</span>
              </div>
            )}

            <form onSubmit={handlePayment}>
              <div style={styles.methodGrid}>
                {/* MTN Mobile Money */}
                <div
                  style={{
                    ...styles.methodCard,
                    ...(paymentMethod === 'mobile_money' ? styles.methodCardActive : {}),
                  }}
                  onClick={() => setPaymentMethod('mobile_money')}
                >
                  <div style={{ ...styles.methodIcon, background: '#FFCB05' }}>
                    <Smartphone size={24} color="#000" />
                  </div>
                  <div style={styles.methodInfo}>
                    <div style={styles.methodTitle}>MTN Mobile Money</div>
                    <div style={styles.methodDesc}>Pay with MTN MoMo</div>
                  </div>
                  {paymentMethod === 'mobile_money' && (
                    <Check size={20} color={SAFARITIX.primary} />
                  )}
                </div>

                {/* Airtel Money */}
                <div
                  style={{
                    ...styles.methodCard,
                    ...(paymentMethod === 'airtel_money' ? styles.methodCardActive : {}),
                  }}
                  onClick={() => setPaymentMethod('airtel_money')}
                >
                  <div style={{ ...styles.methodIcon, background: '#E63946' }}>
                    <Phone size={24} color="#fff" />
                  </div>
                  <div style={styles.methodInfo}>
                    <div style={styles.methodTitle}>Airtel Money</div>
                    <div style={styles.methodDesc}>Pay with Airtel Money</div>
                  </div>
                  {paymentMethod === 'airtel_money' && (
                    <Check size={20} color={SAFARITIX.primary} />
                  )}
                </div>

                {/* Card Payment */}
                <div
                  style={{
                    ...styles.methodCard,
                    ...(paymentMethod === 'card_payment' ? styles.methodCardActive : {}),
                  }}
                  onClick={() => setPaymentMethod('card_payment')}
                >
                  <div style={{ ...styles.methodIcon, background: SAFARITIX.primary }}>
                    <CreditCard size={24} color="#fff" />
                  </div>
                  <div style={styles.methodInfo}>
                    <div style={styles.methodTitle}>Credit/Debit Card</div>
                    <div style={styles.methodDesc}>Visa, Mastercard</div>
                  </div>
                  {paymentMethod === 'card_payment' && (
                    <Check size={20} color={SAFARITIX.primary} />
                  )}
                </div>
              </div>

              {/* Payment Details Form */}
              {(paymentMethod === 'mobile_money' || paymentMethod === 'airtel_money') && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+250 7XX XXX XXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    style={styles.input}
                    required
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = SAFARITIX.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  />
                </div>
              )}

              {bookingExpiresAt && !success && (
                <div style={{ ...styles.formGroup, marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Seat hold expires at {new Date(bookingExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}

              {paymentMethod === 'card_payment' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      style={styles.input}
                      required
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = SAFARITIX.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      style={styles.input}
                      required
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = SAFARITIX.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        style={styles.input}
                        required
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = SAFARITIX.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        style={styles.input}
                        required
                        maxLength={3}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = SAFARITIX.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                style={styles.submitButton}
                disabled={processing || success}
                onMouseEnter={(e) => {
                  if (!processing && !success) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,119,182,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {processing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {statusMessage || 'Processing...'}
                  </>
                ) : success ? (
                  <>
                    <Check size={20} />
                    Booking Confirmed
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Confirm & Pay RWF {totalAmount.toLocaleString()}
                  </>
                )}
              </button>
            </form>
          </div>

          <div style={styles.summarySection}>
            <h2 style={styles.sectionTitle}>Booking Summary</h2>

            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Selected Seats</span>
              <span style={styles.summaryValue}>{selectedSeats.length}</span>
            </div>

            {selectedSeats.length > 0 && (
              <div style={{ padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <div style={styles.seatsDisplay}>
                  {selectedSeats.map((seat) => (
                    <span key={seat} style={styles.seatBadge}>
                      Seat {seat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Price per Seat</span>
              <span style={styles.summaryValue}>RWF {pricePerSeat.toLocaleString()}</span>
            </div>

            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Subtotal</span>
              <span style={styles.summaryValue}>RWF {totalAmount.toLocaleString()}</span>
            </div>

            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Service Fee</span>
              <span style={styles.summaryValue}>RWF 0</span>
            </div>

            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total</span>
              <span style={styles.totalAmount}>RWF {totalAmount.toLocaleString()}</span>
            </div>

            <div
              style={{
                background: SAFARITIX.primarySoft,
                padding: '16px',
                borderRadius: '12px',
                marginTop: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <UserIcon size={16} color={SAFARITIX.primary} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: SAFARITIX.primary }}>
                  Passenger Details
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {user?.name || 'Guest'}
                <br />
                {user?.email}
                <br />
                {user?.phone}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
