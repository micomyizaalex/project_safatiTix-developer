export type BookingStatus =
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SCHEDULED'
  | 'PENDING'
  | 'UNKNOWN';

export type BookingFilter = 'all' | 'upcoming' | 'past' | 'canceled';

export interface BookingRecord {
  id: string;
  scheduleId: string;
  bookingRef: string;
  status: BookingStatus;
  fromStop: string;
  toStop: string;
  scheduleDate: string | null;
  departureTime: string | null;
  seatNumber: string;
  busPlate: string;
  fare: number | null;
  createdAt: string | null;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string | null;
}

export interface AppAlert {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
