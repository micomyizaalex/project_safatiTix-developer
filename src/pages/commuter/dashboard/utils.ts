import { BookingRecord, BookingStatus, NotificationRecord } from './types';

export const authHeaders = (accessToken?: string, includeJson = false): HeadersInit => {
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
};

export const parseMaybeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const formatDate = (value?: string | null) => {
  if (!value) return 'TBD';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (value?: string | null) => {
  if (!value) return 'TBD';
  return String(value).slice(0, 5);
};

export const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'RWF 0';
  return `RWF ${Number(value).toLocaleString()}`;
};

export const normalizeStatus = (status: unknown): BookingStatus => {
  const upper = String(status || 'UNKNOWN').toUpperCase();
  if (
    upper === 'CONFIRMED' ||
    upper === 'IN_PROGRESS' ||
    upper === 'COMPLETED' ||
    upper === 'CANCELLED' ||
    upper === 'SCHEDULED' ||
    upper === 'PENDING'
  ) {
    return upper;
  }
  return 'UNKNOWN';
};

export const normalizeBooking = (source: any): BookingRecord => ({
  id: String(source?.id || source?.ticket_id || source?.booking_ref || ''),
  scheduleId: String(source?.scheduleId || source?.schedule_id || ''),
  bookingRef: String(source?.bookingRef || source?.booking_ref || source?.id || ''),
  status: normalizeStatus(source?.status),
  fromStop: String(
    source?.fromStop || source?.from_stop || source?.from || source?.from_location || 'N/A'
  ),
  toStop: String(source?.toStop || source?.to_stop || source?.to || source?.to_location || 'N/A'),
  scheduleDate: source?.scheduleDate || source?.schedule_date || source?.date || null,
  departureTime: source?.departureTime || source?.departure_time || source?.time || null,
  seatNumber: String(source?.seatNumber || source?.seat_number || source?.seat || 'N/A'),
  busPlate: String(source?.busPlate || source?.bus_plate || source?.plate_number || 'N/A'),
  fare: source?.price !== undefined && source?.price !== null ? Number(source.price) : null,
  createdAt: source?.createdAt || source?.created_at || source?.booked_at || null,
});

export const normalizeNotification = (source: any): NotificationRecord => ({
  id: String(source?.id || ''),
  title: String(source?.title || 'Notification'),
  message: String(source?.message || ''),
  type: String(source?.type || 'system'),
  isRead: Boolean(source?.is_read || source?.isRead),
  createdAt: source?.created_at || source?.createdAt || null,
});

export const dedupeBookings = (bookings: BookingRecord[]) => {
  const seen = new Set<string>();
  return bookings.filter((booking) => {
    const key = booking.id || `${booking.scheduleId}:${booking.seatNumber}:${booking.bookingRef}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getBookingDateTime = (booking: BookingRecord) => {
  if (!booking.scheduleDate) return null;
  const scheduleDate = String(booking.scheduleDate).trim();
  const timePart = booking.departureTime ? String(booking.departureTime).slice(0, 5) : '00:00';

  const isoDatePart = scheduleDate.includes('T') ? scheduleDate.split('T')[0] : scheduleDate;
  const isoWithTime = new Date(`${isoDatePart}T${timePart}:00`);
  if (!Number.isNaN(isoWithTime.getTime())) return isoWithTime;

  const naturalLanguageWithTime = new Date(`${scheduleDate} ${timePart}`);
  if (!Number.isNaN(naturalLanguageWithTime.getTime())) return naturalLanguageWithTime;

  const dateOnly = new Date(scheduleDate);
  if (!Number.isNaN(dateOnly.getTime())) return dateOnly;

  return null;
};

export const isPastBooking = (booking: BookingRecord) => {
  if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') return true;
  const tripDateTime = getBookingDateTime(booking);
  if (!tripDateTime) return false;
  return tripDateTime.getTime() < Date.now();
};

export const isCanceledBooking = (booking: BookingRecord) => booking.status === 'CANCELLED';

export const isActiveBooking = (booking: BookingRecord) => {
  if (!booking.scheduleId) return false;
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') return false;
  if (!booking.scheduleDate) return false;

  const tripDateTime = getBookingDateTime(booking);
  if (!tripDateTime) return false;
  return tripDateTime.getTime() >= Date.now();
};
