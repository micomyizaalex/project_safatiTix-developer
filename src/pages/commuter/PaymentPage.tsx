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

type ResolvedScheduleDetails = {
  routeFrom: string;
  routeTo: string;
  departureTime: string;
  scheduleDate: string;
  busPlateNumber: string;
  companyName: string;
};

// TODO: Backend must return dates in ISO format (YYYY-MM-DD)
// Legacy formats are temporarily supported but should be removed
const toIsoDate = (value?: string) => {
  if (!value) return '';
  const trimmed = String(value).trim();

  // Accept ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Accept ISO datetime and keep only the date part.
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);

  // Accept DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Handle legacy format like "Mar 21T17:39:00"
  const legacy = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2})T/);
  if (legacy) {
    const monthMap: Record<string, number> = {
      Jan: 1, Feb: 2, Mar: 3, Apr: 4,
      May: 5, Jun: 6, Jul: 7, Aug: 8,
      Sep: 9, Oct: 10, Nov: 11, Dec: 12,
    };

    const month = monthMap[legacy[1]];
    const day = Number(legacy[2]);
    const year = new Date().getFullYear();

    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Reject all other formats
  return '';
};

const formatScheduleDate = (value?: string) => {
  const isoDate = toIsoDate(value);
  if (!isoDate) return 'Date unavailable';

  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
};

const formatScheduleTime = (timeValue?: string, dateValue?: string) => {
  if (!timeValue) return 'N/A';
  const trimmedTime = String(timeValue).trim();

  // Handle DB time columns like HH:mm or HH:mm:ss directly.
  const timeMatch = trimmedTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const isoDate = toIsoDate(dateValue);

  // Handle legacy values like "Sat Mar 21T17:39:00" by injecting a valid year.
  const legacyDateTime = trimmedTime.match(/^(?:[A-Za-z]{3}\s+)?([A-Za-z]{3})\s+(\d{1,2})T(\d{1,2}:\d{2})(?::\d{2})?$/);
  if (legacyDateTime) {
    const month = legacyDateTime[1];
    const day = legacyDateTime[2];
    const hhmm = legacyDateTime[3];
    const year = isoDate ? Number(isoDate.slice(0, 4)) : new Date().getFullYear();
    const normalized = `${month} ${day} ${year} ${hhmm}`;
    const parsedLegacy = new Date(normalized);
    if (!Number.isNaN(parsedLegacy.getTime())) {
      return parsedLegacy.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  const combinedDateTime = isoDate && !trimmedTime.includes('T') ? `${isoDate}T${trimmedTime}` : trimmedTime;

  const parsed = new Date(combinedDateTime);
  if (Number.isNaN(parsed.getTime())) return timeValue;
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const normalizeRwandaPhoneInput = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('250')) return digits;
  if (digits.startsWith('0')) return `250${digits.slice(1)}`;
  if (digits.length === 9) return `250${digits}`;
  return digits;
};

const isValidRwandaPhone = (value: string) => /^2507\d{8}$/.test(String(value || ''));

const maskPhone = (value: string) => {
  if (!value) return 'unknown number';
  const clean = String(value).replace(/\D/g, '');
  if (clean.length < 4) return 'unknown number';
  return `***${clean.slice(-4)}`;
};

const hasReasonableScheduleYear = (value?: string) => {
  const iso = toIsoDate(value);
  if (!iso) return false;
  const year = Number(iso.slice(0, 4));
  const current = new Date().getFullYear();
  return Number.isFinite(year) && year >= current - 1 && year <= current + 2;
};

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
  const [resolvedScheduleDetails, setResolvedScheduleDetails] = useState<ResolvedScheduleDetails | null>(null);
  
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
  const [createdTickets, setCreatedTickets] = useState<Array<{ ticketId: string; bookingRef: string; qrCodeUrl?: string }>>([]);

  const isMountedRef = useRef(true);
  const pollingTimeoutRef = useRef<number | null>(null);
  const activeBookingRef = useRef<string | null>(null);
  const paymentCompletedRef = useRef(false);
  const paymentInitiatedRef = useRef(false);
  const pollStartTimeRef = useRef<number>(0);

  // Maximum time (ms) to poll before giving up waiting for the phone confirmation
  const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  const totalAmount = selectedSeats.length * pricePerSeat;
  // Demo mode: always treat payment as successful immediately after booking-hold.
  // This skips provider initiation + polling and instead calls the backend demo-confirm endpoint.
  const DEMO_MODE = true;

  useEffect(() => {
    // Redirect if no booking data
    if (!scheduleId || selectedSeats.length === 0) {
      navigate('/dashboard/commuter');
    }
  }, [scheduleId, selectedSeats, navigate]);

  useEffect(() => {
    let cancelled = false;

    const fallbackDetails: ResolvedScheduleDetails | null = scheduleDetails
      ? {
          routeFrom: scheduleDetails.routeFrom,
          routeTo: scheduleDetails.routeTo,
          departureTime: scheduleDetails.departureTime,
          scheduleDate: scheduleDetails.scheduleDate,
          busPlateNumber: scheduleDetails.busPlateNumber,
          companyName: scheduleDetails.companyName,
        }
      : null;

    const safeFallbackDetails =
      fallbackDetails && hasReasonableScheduleYear(fallbackDetails.scheduleDate)
        ? fallbackDetails
        : null;

    setResolvedScheduleDetails(safeFallbackDetails);

    const fetchCanonicalSchedule = async () => {
      if (!scheduleId) return;

      const applyResolved = (raw: any) => {
        if (!raw || cancelled) return;

        setResolvedScheduleDetails({
          routeFrom: raw.routeFrom || raw.route_from || raw.from_stop || safeFallbackDetails?.routeFrom || fromStop || 'Origin',
          routeTo: raw.routeTo || raw.route_to || raw.to_stop || safeFallbackDetails?.routeTo || toStop || 'Destination',
          departureTime: raw.departureTime || raw.departure_time || safeFallbackDetails?.departureTime || '',
          scheduleDate:
            raw.date ||
            raw.schedule_date ||
            raw.scheduleDate ||
            raw.departure_date ||
            raw.departureDate ||
            safeFallbackDetails?.scheduleDate ||
            '',
          busPlateNumber: raw.busPlate || raw.bus_plate || raw.plate_number || safeFallbackDetails?.busPlateNumber || 'TBA',
          companyName: raw.companyName || raw.company_name || safeFallbackDetails?.companyName || 'SafariTix',
        });
      };

      try {
        const response = await fetch(`${API_URL}/schedules/${scheduleId}`);
        if (response.ok) {
          const payload = await response.json().catch(() => ({}));
          const schedule = payload?.schedule;
          if (schedule) {
            applyResolved(schedule);
            return;
          }
        }
      } catch {
        // Continue to shared search fallback.
      }

      // Shared-route schedule IDs may not exist under /schedules/:id; resolve via trip search.
      const fromQuery = fromStop || safeFallbackDetails?.routeFrom;
      const toQuery = toStop || safeFallbackDetails?.routeTo;
      if (!fromQuery || !toQuery) return;

      try {
        const dateHint = toIsoDate(safeFallbackDetails?.scheduleDate);
        const currentYear = new Date().getFullYear();
        const hintedYear = dateHint ? Number(dateHint.slice(0, 4)) : NaN;
        const useDateHint = Number.isFinite(hintedYear) && hintedYear >= currentYear - 1 && hintedYear <= currentYear + 2;

        const queries: URLSearchParams[] = [];
        if (useDateHint && dateHint) {
          queries.push(new URLSearchParams({ from: fromQuery, to: toQuery, date: dateHint }));
        }
        // Always try broad lookup so stale years like 2001 cannot block canonical resolution.
        queries.push(new URLSearchParams({ from: fromQuery, to: toQuery }));

        for (const qs of queries) {
          const tripsResponse = await fetch(`${API_URL}/search-trips?${qs.toString()}`);
          if (!tripsResponse.ok) continue;

          const tripsPayload = await tripsResponse.json().catch(() => ({}));
          const trips = Array.isArray(tripsPayload?.trips) ? tripsPayload.trips : [];
          const matchedTrip = trips.find((trip: any) => String(trip.schedule_id) === String(scheduleId));
          if (matchedTrip) {
            applyResolved(matchedTrip);
            return;
          }
        }
      } catch {
        // Keep fallback navigation state if both canonical sources fail.
      }
    };

    void fetchCanonicalSchedule();

    return () => {
      cancelled = true;
    };
  }, [scheduleId, scheduleDetails, fromStop, toStop]);

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
        // If provider initiation already happened, do not auto-cancel on unmount.
        // Late provider/webhook confirmation can still arrive after navigation.
        if (paymentInitiatedRef.current) return;

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
    paymentInitiatedRef.current = false;
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
      try {
        // Final reconciliation before declaring timeout, to reduce false negatives
        // when provider/webhook confirmation arrives close to the polling limit.
        const finalResponse = await fetch(`${API_URL}/payments/${bookingId}/status`, {
          headers: getHeaders(),
        });
        const finalData = await finalResponse.json().catch(() => ({}));
        const finalPayment = finalData?.payment;
        if (finalResponse.ok && finalPayment?.booking_status === 'paid') {
          finishSuccess('Payment confirmed! Your ticket is now available.');
          return;
        }
      } catch {
        // Fall through to timeout message.
      }

      clearPolling();
      setProcessing(false);
      setStatusMessage(null);
      setError(
        'Payment confirmation timed out. If you approved the payment on your phone, ' +
        'please check My Tickets - your booking may have been confirmed.'
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

      const elapsedMs = Date.now() - pollStartTimeRef.current;
      const noProviderReference = !payment.provider_reference;
      const providerStatus = String(payment.provider_status || '').toLowerCase();

      // Only treat as success when booking is fully confirmed (tickets created)
      if (payment.booking_status === 'paid') {
        finishSuccess('Payment confirmed! Your ticket is now available.');
        return;
      }

      if (payment.booking_status === 'cancelled' || payment.status === 'failed') {
        clearPolling();
        setProcessing(false);
        setSuccess(false);
        paymentInitiatedRef.current = false;
        activeBookingRef.current = null;
        setActiveBookingId(null);
        setBookingExpiresAt(null);
        setStatusMessage(null);
        setError('Payment failed or expired. Your seat hold was released.');
        return;
      }

      // Guard against long "waiting" loops when provider never issued a push.
      if (elapsedMs > 90_000 && noProviderReference && !providerStatus) {
        clearPolling();
        setProcessing(false);
        setSuccess(false);
        paymentInitiatedRef.current = false;
        if (activeBookingRef.current) {
          await cancelBookingHold(activeBookingRef.current);
        }
        activeBookingRef.current = null;
        setActiveBookingId(null);
        setBookingExpiresAt(null);
        setStatusMessage(null);
        setError('No payment prompt was detected on provider side. Please retry payment.');
        return;
      }

      if (elapsedMs > 120_000 && ['not_found', 'unknown', 'error'].includes(providerStatus)) {
        clearPolling();
        setProcessing(false);
        setSuccess(false);
        paymentInitiatedRef.current = false;
        if (activeBookingRef.current) {
          await cancelBookingHold(activeBookingRef.current);
        }
        activeBookingRef.current = null;
        setActiveBookingId(null);
        setBookingExpiresAt(null);
        setStatusMessage(null);
        setError('Provider could not find this payment request. Please retry.');
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

    try {
      // 1) Create booking hold (seat lock only, no ticket creation yet).
      // In DEMO mode we don't require phone/card validation.
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
        throw new Error(holdData?.message || holdData?.error || 'Failed to reserve seats for payment.');
      }

      const bookingId = String(holdData?.booking?.id || holdData?.booking?.booking_id || '');
      if (!bookingId) {
        throw new Error('Booking hold response missing booking id.');
      }

      setActiveBookingId(bookingId);
      activeBookingRef.current = bookingId;
      setBookingExpiresAt(holdData?.booking?.expires_at || null);

      if (DEMO_MODE) {
        // 2) Demo confirm: finalize booking immediately (no provider).
        setStatusMessage('Confirming your booking...');
        const demoResponse = await fetch(`${API_URL}/payments/demo-confirm`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ bookingId }),
        });

        const demoData = await demoResponse.json().catch(() => ({}));
        if (!demoResponse.ok) {
          throw new Error(demoData?.message || demoData?.error || 'Failed to confirm booking.');
        }

        // Prevent cancel-on-unmount logic from releasing the hold.
        paymentCompletedRef.current = true;
        paymentInitiatedRef.current = false;
        activeBookingRef.current = null;
        setActiveBookingId(null);
        setBookingExpiresAt(null);
        clearPolling();

        const returnedTickets = Array.isArray(demoData?.tickets) ? demoData.tickets : [];
        setCreatedTickets(
          returnedTickets.map((t: any) => ({
            ticketId: t.ticketId || t.id || '',
            bookingRef: t.bookingRef || t.booking_ref || '',
            qrCodeUrl: t.qrCodeUrl || t.qr_code_url || undefined,
          }))
        );

        setSuccess(true);
        setProcessing(false);
        setStatusMessage(null);
        setError(null);

        navigate('/dashboard/commuter/booking-success', {
          state: {
            booking: demoData?.booking,
            tickets: returnedTickets,
            qrCodeUrl: demoData?.qrCodeUrl || returnedTickets?.[0]?.qr_code_url || null,
          },
        });
        return;
      }

      // Non-demo (legacy) behavior: provider initiate + poll.
      const phoneOrCard = paymentMethod === 'card_payment' ? cardNumber : phoneNumber;
      if (!phoneOrCard?.trim()) {
        throw new Error(paymentMethod === 'card_payment' ? 'Card number is required.' : 'Phone number is required.');
      }

      const normalizedPhone = paymentMethod === 'card_payment'
        ? ''
        : normalizeRwandaPhoneInput(phoneNumber);

      if (paymentMethod !== 'card_payment' && !isValidRwandaPhone(normalizedPhone)) {
        throw new Error('Enter a valid Rwanda phone number (07XXXXXXXX or 2507XXXXXXXX).');
      }

      // 2) Initiate provider payment for that booking.
      const initiateResponse = await fetch(`${API_URL}/payments/initiate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          booking_id: bookingId,
          payment_method: paymentMethod,
          phone_number: normalizedPhone,
          amount: totalAmount,
        }),
      });

      const initiateData = await initiateResponse.json().catch(() => ({}));
      if (!initiateResponse.ok) {
        await cancelBookingHold(bookingId);
        throw new Error(initiateData?.message || initiateData?.error || 'Failed to initiate payment.');
      }

      paymentInitiatedRef.current = true;

      const payment = initiateData?.payment;
      if (payment?.booking_status === 'paid') {
        const tickets = Array.isArray(initiateData?.tickets) ? initiateData.tickets : [];
        setCreatedTickets(
          tickets.map((t: any) => ({
            ticketId: t.ticketId || t.id || '',
            bookingRef: t.bookingRef || t.booking_ref || '',
            qrCodeUrl: t.qrCodeUrl || t.qr_code_url || undefined,
          }))
        );
        finishSuccess('Payment confirmed! Your ticket is now available.');
        return;
      }

      // 3) Poll until backend confirms paid and creates the ticket.
      setStatusMessage(`Waiting for payment confirmation on your phone (${maskPhone(normalizedPhone)})...`);
      pollStartTimeRef.current = Date.now();
      await pollPaymentStatus(bookingId);
    } catch (err: any) {
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

          {resolvedScheduleDetails && (
            <div style={styles.bookingInfo}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>
                  <MapPin size={14} />
                  Route
                </div>
                <div style={styles.infoValue}>
                  {resolvedScheduleDetails.routeFrom} → {resolvedScheduleDetails.routeTo}
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>
                  <Calendar size={14} />
                  Date
                </div>
                <div style={styles.infoValue}>
                  {formatScheduleDate(resolvedScheduleDetails.scheduleDate)}
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>
                  <Clock size={14} />
                  Time
                </div>
                <div style={styles.infoValue}>
                  {formatScheduleTime(resolvedScheduleDetails.departureTime, resolvedScheduleDetails.scheduleDate)}
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>
                  <Bus size={14} />
                  Bus
                </div>
                <div style={styles.infoValue}>
                  {resolvedScheduleDetails.busPlateNumber}
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
                <span>
                  Booking successful! Redirecting to your tickets...
                  {createdTickets.length > 0 ? ` (Ref: ${createdTickets[0].bookingRef || createdTickets[0].ticketId})` : ''}
                </span>
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
