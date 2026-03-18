import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Bus,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  HelpCircle,
  History,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  RefreshCw,
  Search,
  Share2,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import PassengerTracking from '../../components/PassengerTracking';
import AccountSettings from '../account/AccountSettings';

type DashboardTab = 'shared' | 'bookings' | 'map' | 'history' | 'help' | 'profile';

interface SearchTrip {
  schedule_id: string;
  bus_id?: string;
  route_id?: string;
  bus_plate?: string;
  company_name?: string;
  departure_date?: string | null;
  departure_time?: string | null;
  pickup_stop: string;
  dropoff_stop: string;
  from_location?: string | null;
  to_location?: string | null;
  available_seats?: number;
  capacity?: number;
  price?: number;
}

interface TicketRecord {
  id: string;
  scheduleId: string;
  bookingRef: string;
  status: string;
  fromStop: string;
  toStop: string;
  scheduleDate: string | null;
  departureTime: string | null;
  seatNumber: string;
  busPlate: string;
  price: number | null;
  createdAt: string | null;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string | null;
  link: string | null;
}

const FALLBACK_STOPS = [
  'Kigali',
  'Nyabugogo',
  'Huye',
  'Musanze',
  'Rubavu',
  'Rusizi',
  'Muhanga',
  'Rwamagana',
  'Kamonyi',
  'Nyanza',
];

const statusTone: Record<string, string> = {
  CONFIRMED: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  IN_PROGRESS: 'border border-sky-200 bg-sky-50 text-sky-700',
  COMPLETED: 'border border-slate-200 bg-slate-100 text-slate-700',
  CANCELLED: 'border border-rose-200 bg-rose-50 text-rose-700',
  SCHEDULED: 'border border-amber-200 bg-amber-50 text-amber-700',
};

const cardClassName = 'rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]';
const mutedCardClassName = 'rounded-[16px] border border-slate-200 bg-slate-50';
const fieldClassName = 'w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/15';
const primaryButtonClassName = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#0077B6] px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,119,182,0.26)] transition hover:bg-[#005F8E] hover:shadow-[0_18px_34px_rgba(0,119,182,0.3)] disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClassName = 'inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-[#0077B6]/25 hover:bg-[#0077B6]/5';

const authHeaders = (accessToken?: string, includeJson = false): HeadersInit => {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'TBD';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatShortDate = (value?: string | null) => {
  if (!value) return 'TBD';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (value?: string | null) => {
  if (!value) return 'TBD';
  return String(value).slice(0, 5);
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'RWF 0';
  return `RWF ${Number(value).toLocaleString()}`;
};

const parseMaybeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const normalizeTicket = (source: any): TicketRecord => ({
  id: String(source?.id || source?.ticket_id || source?.booking_ref || ''),
  scheduleId: String(source?.scheduleId || source?.schedule_id || ''),
  bookingRef: String(source?.bookingRef || source?.booking_ref || source?.id || ''),
  status: String(source?.status || 'CONFIRMED').toUpperCase(),
  fromStop: String(source?.fromStop || source?.from_stop || source?.from || source?.from_location || 'N/A'),
  toStop: String(source?.toStop || source?.to_stop || source?.to || source?.to_location || 'N/A'),
  scheduleDate: source?.scheduleDate || source?.schedule_date || source?.date || null,
  departureTime: source?.departureTime || source?.departure_time || source?.time || null,
  seatNumber: String(source?.seatNumber || source?.seat_number || source?.seat || 'N/A'),
  busPlate: String(source?.busPlate || source?.bus_plate || source?.plate_number || 'N/A'),
  price: source?.price !== undefined && source?.price !== null ? Number(source.price) : null,
  createdAt: source?.createdAt || source?.created_at || source?.booked_at || null,
});

const normalizeNotification = (source: any): NotificationItem => ({
  id: String(source?.id || ''),
  title: String(source?.title || 'Notification'),
  message: String(source?.message || ''),
  type: String(source?.type || 'system'),
  isRead: Boolean(source?.is_read),
  createdAt: source?.created_at || null,
  link: source?.link || null,
});

const dedupeTickets = (tickets: TicketRecord[]) => {
  const seen = new Set<string>();
  return tickets.filter((ticket) => {
    const key = ticket.id || `${ticket.scheduleId}:${ticket.seatNumber}:${ticket.bookingRef}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getGreetingLabel = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const isTrackableTicket = (ticket: TicketRecord) => {
  if (!ticket.scheduleId) return false;
  const status = ticket.status.toUpperCase();
  if (status === 'CANCELLED' || status === 'COMPLETED') return false;

  if (!ticket.scheduleDate) return true;
  const travelDate = new Date(`${ticket.scheduleDate}T00:00:00`);
  if (Number.isNaN(travelDate.getTime())) return true;
  return travelDate.getTime() >= startOfToday().getTime();
};

const isHistoryTicket = (ticket: TicketRecord) => {
  if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') return true;
  if (!ticket.scheduleDate) return false;
  const travelDate = new Date(`${ticket.scheduleDate}T00:00:00`);
  if (Number.isNaN(travelDate.getTime())) return false;
  return travelDate.getTime() < startOfToday().getTime();
};

const metricCard = (label: string, value: string, accent: string) => (
  <div className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
      <span className="h-2 w-2 rounded-full bg-[#0077B6]" />
      {label}
    </div>
    <div className={`mt-3 text-2xl font-bold leading-none ${accent}`}>{value}</div>
  </div>
);

export default function CommuterDashboard() {
  const { user, signOut, accessToken } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>('shared');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [availableStops, setAvailableStops] = useState<string[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<SearchTrip[]>([]);
  const [searchResults, setSearchResults] = useState<SearchTrip[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [selectedTrackingTicketId, setSelectedTrackingTicketId] = useState<string | null>(null);
  const [viewTicket, setViewTicket] = useState<TicketRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const stopOptions = availableStops.length > 0 ? availableStops : FALLBACK_STOPS;

  const trackableTickets = useMemo(() => {
    return tickets.filter(isTrackableTicket).sort((left, right) => {
      const leftStamp = `${left.scheduleDate || ''} ${left.departureTime || ''}`;
      const rightStamp = `${right.scheduleDate || ''} ${right.departureTime || ''}`;
      return leftStamp.localeCompare(rightStamp);
    });
  }, [tickets]);

  const historyTickets = useMemo(() => {
    return tickets.filter(isHistoryTicket).sort((left, right) => {
      return `${right.scheduleDate || ''} ${right.departureTime || ''}`.localeCompare(
        `${left.scheduleDate || ''} ${left.departureTime || ''}`
      );
    });
  }, [tickets]);
  const greetingLabel = useMemo(() => getGreetingLabel(), []);
  const nextTrip = useMemo(() => trackableTickets[0] || null, [trackableTickets]);

  const selectedTrackingTicket = useMemo(() => {
    return trackableTickets.find((ticket) => ticket.id === selectedTrackingTicketId) || trackableTickets[0] || null;
  }, [selectedTrackingTicketId, trackableTickets]);

  const unreadNotifications = useMemo(() => notifications.filter((notification) => !notification.isRead), [notifications]);
  const totalSpent = useMemo(() => {
    return tickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0);
  }, [tickets]);

  useEffect(() => {
    if (!selectedTrackingTicketId && trackableTickets.length > 0) {
      setSelectedTrackingTicketId(trackableTickets[0].id);
      return;
    }

    if (selectedTrackingTicketId && !trackableTickets.some((ticket) => ticket.id === selectedTrackingTicketId)) {
      setSelectedTrackingTicketId(trackableTickets[0]?.id || null);
    }
  }, [selectedTrackingTicketId, trackableTickets]);

  const loadStops = async () => {
    try {
      const response = await fetch('/api/stops');
      const payload = await parseMaybeJson(response);
      if (response.ok && payload?.success && Array.isArray(payload.stops) && payload.stops.length > 0) {
        setAvailableStops(payload.stops.map((stop: unknown) => String(stop)));
      }
    } catch {
      // Keep fallback stops.
    }
  };

  const loadPopularRoutes = async () => {
    try {
      const response = await fetch('/api/schedules', { headers: authHeaders(accessToken) });
      const payload = await parseMaybeJson(response);
      const routes = Array.isArray(payload?.schedules) ? payload.schedules : [];
      const normalized = routes.map((route: any) => ({
        schedule_id: String(route.id || route.schedule_id || route.scheduleId || ''),
        bus_id: route.bus_id || route.busId,
        route_id: route.route_id || route.routeId,
        bus_plate: route.bus_plate || route.busPlateNumber || route.plate_number || '',
        company_name: route.company_name || route.companyName || '',
        departure_date: route.date || route.schedule_date || route.tripDate || null,
        departure_time: route.departure_time || route.departureTime || route.time || null,
        pickup_stop: route.routeFrom || route.from_location || route.from || route.departureLocation || 'Unknown',
        dropoff_stop: route.routeTo || route.to_location || route.to || route.destination || 'Unknown',
        from_location: route.routeFrom || route.from_location || route.from || null,
        to_location: route.routeTo || route.to_location || route.to || null,
        available_seats: Number(route.available_seats ?? route.seatsAvailable ?? route.availableSeats ?? 0),
        capacity: Number(route.capacity ?? route.totalSeats ?? route.seatCapacity ?? 0),
        price: Number(route.price ?? 0),
      }));
      setPopularRoutes(normalized.slice(0, 6));
    } catch {
      setPopularRoutes([]);
    }
  };

  const loadTickets = async () => {
    if (!accessToken) {
      setTickets([]);
      return;
    }

    setTicketsLoading(true);
    setTicketsError('');
    try {
      const [myTicketsResponse, ticketsResponse] = await Promise.all([
        fetch('/api/my-tickets', { headers: authHeaders(accessToken) }),
        fetch('/api/tickets', { headers: authHeaders(accessToken) }),
      ]);

      const [myTicketsPayload, ticketsPayload] = await Promise.all([
        parseMaybeJson(myTicketsResponse),
        parseMaybeJson(ticketsResponse),
      ]);

      const myTicketsList = Array.isArray(myTicketsPayload?.tickets) ? myTicketsPayload.tickets : [];
      const ticketsList = Array.isArray(ticketsPayload?.tickets) ? ticketsPayload.tickets : [];
      const normalized = dedupeTickets([...myTicketsList, ...ticketsList].map(normalizeTicket).filter((ticket) => Boolean(ticket.id)));
      setTickets(normalized);

      if (!myTicketsResponse.ok && !ticketsResponse.ok) {
        setTicketsError((myTicketsPayload?.message || ticketsPayload?.message || 'Failed to load your tickets.'));
      }
    } catch {
      setTicketsError('Network error while loading your commuter data.');
    } finally {
      setTicketsLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!accessToken) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError('');
    try {
      const response = await fetch('/api/notifications?limit=6', { headers: authHeaders(accessToken) });
      const payload = await parseMaybeJson(response);
      if (response.ok) {
        setNotifications(Array.isArray(payload?.data) ? payload.data.map(normalizeNotification) : []);
      } else {
        setNotifications([]);
        setNotificationsError(payload?.message || 'Failed to load notifications.');
      }
    } catch {
      setNotifications([]);
      setNotificationsError('Unable to load notifications right now.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    await Promise.all([loadStops(), loadPopularRoutes(), loadTickets(), loadNotifications()]);
    setRefreshing(false);
  };

  useEffect(() => {
    void refreshDashboard();
  }, [accessToken]);

  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!fromLocation || !toLocation) {
      setBookingError('Select both departure and destination to search trips.');
      return;
    }

    if (fromLocation === toLocation) {
      setBookingError('Departure and destination must be different.');
      return;
    }

    setBookingError('');
    setBookingSuccess('');
    setSearchPerformed(true);
    setSearchLoading(true);

    try {
      let query = `?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}`;
      if (travelDate) {
        query += `&date=${encodeURIComponent(travelDate)}`;
      }

      const response = await fetch(`/api/search-trips${query}`, { headers: authHeaders(accessToken) });
      const payload = await parseMaybeJson(response);
      if (response.ok && payload?.success) {
        setSearchResults(Array.isArray(payload.trips) ? payload.trips : []);
      } else {
        setSearchResults([]);
        setBookingError(payload?.message || 'Failed to search trips.');
      }
    } catch {
      setSearchResults([]);
      setBookingError('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSeat = (trip: SearchTrip) => {
    const params = new URLSearchParams({
      trip_id: trip.schedule_id,
      from: trip.pickup_stop,
      to: trip.dropoff_stop,
    });

    navigate(`/dashboard/commuter/seatmap?${params.toString()}`, {
      state: {
        trip: {
          trip_id: trip.schedule_id,
          route_id: trip.route_id || '',
          route: `${trip.pickup_stop} -> ${trip.dropoff_stop}`,
          from_stop: trip.pickup_stop,
          to_stop: trip.dropoff_stop,
          departure_time: trip.departure_time || '',
          departure_date: trip.departure_date || '',
          available_seats: trip.available_seats ?? 0,
          capacity: trip.capacity ?? 0,
          price: trip.price ?? 0,
          bus_plate: trip.bus_plate || '',
          company_name: trip.company_name || 'SafariTix operator',
        },
      },
    });
  };

  const openTracking = (ticket: TicketRecord) => {
    setSelectedTrackingTicketId(ticket.id);
    setActiveTab('map');
  };

  const shareTicket = async (ticket: TicketRecord) => {
    const text = [
      'SafariTix ticket',
      `${ticket.fromStop} -> ${ticket.toStop}`,
      `Date: ${formatDate(ticket.scheduleDate)}`,
      `Time: ${formatTime(ticket.departureTime)}`,
      `Seat: ${ticket.seatNumber}`,
      `Reference: ${ticket.bookingRef}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'SafariTix ticket', text });
        return;
      } catch {
        // Fall back to clipboard below.
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setBookingSuccess('Ticket details copied to clipboard.');
      return;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const navItems: Array<{ id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'shared', label: 'Book Trip', icon: Search },
    { id: 'bookings', label: 'My Bookings', icon: Ticket },
    { id: 'map', label: 'Track Bus', icon: Navigation },
    { id: 'history', label: 'Trip History', icon: History },
    { id: 'help', label: 'Help Center', icon: HelpCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <EmptyPanel
          icon={RefreshCw}
          title="Searching available trips"
          description="We are checking current shared routes, fares, and seat availability for your journey."
          spinning={true}
        />
      );
    }

    if (!searchPerformed) {
      return null;
    }

    if (searchResults.length === 0) {
      return (
        <EmptyPanel
          icon={Bus}
          title="No matching trips found"
          description="Try another date or a different pickup and destination combination."
        />
      );
    }

    return (
      <div className="grid gap-5 2xl:grid-cols-3 xl:grid-cols-2">
        {searchResults.map((trip) => (
          <div key={`${trip.schedule_id}-${trip.pickup_stop}-${trip.dropoff_stop}`} className={`${cardClassName} overflow-hidden p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0077B6]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">
                  Available trip
                </div>
                <div className="mt-4">
                  <RouteLine from={trip.pickup_stop} to={trip.dropoff_stop} prominent={true} />
                </div>
                <p className="mt-3 text-sm text-slate-500">{trip.company_name || 'SafariTix operator'}{trip.bus_plate ? ` · ${trip.bus_plate}` : ''}</p>
              </div>
              <div className="rounded-[22px] border border-[#0077B6]/15 bg-[#0077B6]/5 px-4 py-3 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Fare</div>
                <div className="mt-1 text-xl font-black text-slate-900">{formatCurrency(trip.price)}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className={mutedCardClassName + ' p-4'}>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <Calendar className="h-4 w-4" /> Departure
                </div>
                <div className="mt-3 text-sm font-black text-slate-900">{formatShortDate(trip.departure_date)}</div>
              </div>
              <div className={mutedCardClassName + ' p-4'}>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <Clock className="h-4 w-4" /> Time
                </div>
                <div className="mt-3 text-sm font-black text-slate-900">{formatTime(trip.departure_time)}</div>
              </div>
              <div className={mutedCardClassName + ' p-4'}>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <CreditCard className="h-4 w-4" /> Seats left
                </div>
                <div className="mt-3 text-sm font-black text-slate-900">{trip.available_seats ?? 0} / {trip.capacity ?? 0}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-500">Booking will reserve {passengers} seat{passengers > 1 ? 's' : ''} for this segment.</p>
              <button
                onClick={() => handleSelectSeat(trip)}
                disabled={(trip.available_seats ?? 0) <= 0}
                className={primaryButtonClassName + ' min-w-[150px]'}
              >
                <Ticket className="h-4 w-4" />
                {(trip.available_seats ?? 0) <= 0 ? 'Sold out' : 'Select Seat'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBookings = () => {
    if (ticketsLoading) {
      return (
        <EmptyPanel
          icon={RefreshCw}
          title="Loading your bookings"
          description="Preparing your active tickets, seat assignments, and boarding codes."
          spinning={true}
        />
      );
    }

    if (tickets.length === 0) {
      return (
        <EmptyPanel
          icon={Ticket}
          title="No bookings yet"
          description="Book a trip to see your tickets, boarding QR codes, and trip details here."
        />
      );
    }

    return (
      <div className="space-y-5">
        {tickets.map((ticket) => (
          <div key={ticket.id} className={`${cardClassName} overflow-hidden`}>
            <div className="border-b border-[#0077B6]/15 bg-[#f4f9ff] px-6 py-6 text-slate-900">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#0077B6]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Active boarding pass</div>
                  <div className="mt-4">
                    <RouteLine from={ticket.fromStop} to={ticket.toStop} prominent={true} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{formatDate(ticket.scheduleDate)} · {formatTime(ticket.departureTime)} · Seat {ticket.seatNumber}</p>
                </div>
                <span className={`inline-flex h-fit items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] ${statusTone[ticket.status] || 'border border-slate-200 bg-slate-100 text-slate-700'}`}>
                  {ticket.status}
                </span>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-6 xl:grid-cols-[1.35fr_0.95fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={mutedCardClassName + ' p-4'}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Reference</div>
                  <div className="mt-2 font-mono text-sm font-bold text-slate-900">{ticket.bookingRef || ticket.id}</div>
                </div>
                <div className={mutedCardClassName + ' p-4'}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Bus</div>
                  <div className="mt-2 text-sm font-bold text-slate-900">{ticket.busPlate}</div>
                </div>
                <div className={mutedCardClassName + ' p-4'}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Passenger</div>
                  <div className="mt-2 text-sm font-bold text-slate-900">{user?.name || 'Commuter'}</div>
                </div>
                <div className={mutedCardClassName + ' p-4'}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Price</div>
                  <div className="mt-2 text-sm font-bold text-slate-900">{formatCurrency(ticket.price)}</div>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Boarding QR</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">Ready to scan at boarding</div>
                  </div>
                  <QrPreview value={ticket.bookingRef || ticket.id} />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button onClick={() => setViewTicket(ticket)} className={primaryButtonClassName + ' !rounded-[20px] !px-4 !py-3'}>
                    <Eye className="h-4 w-4" /> View
                  </button>
                  <button onClick={() => void shareTicket(ticket)} className={secondaryButtonClassName + ' !rounded-[20px] !px-4 !py-3'}>
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                  <button
                    onClick={() => openTracking(ticket)}
                    disabled={!isTrackableTicket(ticket)}
                    className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-[#0077B6]/20 bg-[#0077B6]/8 px-4 py-3 text-sm font-bold text-[#0077B6] transition hover:bg-[#0077B6]/12 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Navigation className="h-4 w-4" /> Track
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTracking = () => {
    if (!selectedTrackingTicket) {
      return (
        <EmptyPanel
          icon={Navigation}
          title="You have no active trips to track"
          description="Confirmed upcoming trips will appear here automatically when a schedule is available for live tracking."
        />
      );
    }

    return (
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className={`${cardClassName} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Track Bus</div>
              <h3 className="mt-2 text-xl font-black text-slate-900">Active trips</h3>
              <p className="mt-2 text-sm text-slate-500">Choose the ticket you want to follow live.</p>
            </div>
            <span className="rounded-full bg-[#0077B6]/10 px-3 py-1 text-xs font-bold text-[#0077B6]">{trackableTickets.length}</span>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {metricCard('Trackable trips', String(trackableTickets.length), 'text-slate-900')}
              {metricCard('Booked seats', String(tickets.length), 'text-slate-900')}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {trackableTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTrackingTicketId(ticket.id)}
                className={`w-full rounded-[16px] border p-4 text-left transition ${selectedTrackingTicket.id === ticket.id ? 'border-[#0077B6]/35 bg-[#0077B6]/7 shadow-[0_8px_20px_rgba(0,119,182,0.12)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'}`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{formatShortDate(ticket.scheduleDate)}</div>
                <div className="mt-3"><RouteLine from={ticket.fromStop} to={ticket.toStop} /></div>
                <div className="mt-2 text-sm text-slate-500">Seat {ticket.seatNumber} · {formatTime(ticket.departureTime)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${cardClassName} overflow-hidden`}>
            <div className="bg-[#f4f9ff] px-6 py-6 text-slate-900 border-b border-[#0077B6]/15">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#0077B6]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Currently selected</div>
                  <div className="mt-4">
                    <RouteLine from={selectedTrackingTicket.fromStop} to={selectedTrackingTicket.toStop} prominent={true} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Reference {selectedTrackingTicket.bookingRef} · Bus {selectedTrackingTicket.busPlate}</p>
                </div>
                <span className={`inline-flex h-fit items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] ${statusTone[selectedTrackingTicket.status] || 'border border-slate-200 bg-slate-100 text-slate-700'}`}>
                  {selectedTrackingTicket.status}
                </span>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-4">
              {metricCard('Departure', formatShortDate(selectedTrackingTicket.scheduleDate), 'text-slate-900')}
              {metricCard('Time', formatTime(selectedTrackingTicket.departureTime), 'text-slate-900')}
              {metricCard('Seat', selectedTrackingTicket.seatNumber, 'text-slate-900')}
              {metricCard('Reference', selectedTrackingTicket.bookingRef, 'text-[#0077B6]')}
            </div>
          </div>

          <PassengerTracking
            scheduleId={selectedTrackingTicket.scheduleId}
            ticketId={selectedTrackingTicket.id}
            routeFrom={selectedTrackingTicket.fromStop}
            routeTo={selectedTrackingTicket.toStop}
            departureTime={selectedTrackingTicket.departureTime || undefined}
            autoStart={true}
          />
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    const completedCount = historyTickets.filter((ticket) => ticket.status === 'COMPLETED').length;
    const cancelledCount = historyTickets.filter((ticket) => ticket.status === 'CANCELLED').length;

    return (
      <div className="space-y-6">
        <div className={`${cardClassName} p-6`}>
          <SectionHeader
            eyebrow="Trip History"
            title="Your recent travel archive"
            description="Review completed and cancelled trips, seat details, and how much you have spent through SafariTix."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {metricCard('History', String(historyTickets.length), 'text-slate-900')}
            {metricCard('Completed', String(completedCount), 'text-emerald-600')}
            {metricCard('Cancelled', String(cancelledCount), 'text-rose-600')}
            {metricCard('Spent', formatCurrency(totalSpent), 'text-[#0077B6]')}
          </div>
        </div>

        {historyTickets.length === 0 ? (
          <EmptyPanel
            icon={History}
            title="No trip history yet"
            description="Completed and cancelled trips will appear here automatically once you have traveled."
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {historyTickets.map((ticket) => (
              <div key={ticket.id} className={`${cardClassName} p-6`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Archived trip</div>
                    <div className="mt-4"><RouteLine from={ticket.fromStop} to={ticket.toStop} prominent={true} /></div>
                    <p className="mt-3 text-sm text-slate-500">{formatDate(ticket.scheduleDate)} · {formatTime(ticket.departureTime)}</p>
                  </div>
                  <span className={`inline-flex h-fit items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] ${statusTone[ticket.status] || 'border border-slate-200 bg-slate-100 text-slate-700'}`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className={mutedCardClassName + ' p-4'}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Seat</div>
                    <div className="mt-2 text-sm font-black text-slate-900">{ticket.seatNumber}</div>
                  </div>
                  <div className={mutedCardClassName + ' p-4'}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Bus</div>
                    <div className="mt-2 text-sm font-black text-slate-900">{ticket.busPlate}</div>
                  </div>
                  <div className={mutedCardClassName + ' p-4'}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Fare</div>
                    <div className="mt-2 text-sm font-black text-slate-900">{formatCurrency(ticket.price)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHelp = () => {
    return (
      <div className="space-y-6">
        <div className={`${cardClassName} p-6`}>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
            <div>
              <SectionHeader
                eyebrow="Help Center"
                title="Support built into your commuter dashboard"
                description="Travel alerts, booking help, and direct support contacts are available here whenever you need them."
              />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {metricCard('Active trips', String(trackableTickets.length), 'text-slate-900')}
                {metricCard('Past journeys', String(historyTickets.length), 'text-slate-900')}
                {metricCard('Unread alerts', String(unreadNotifications.length), 'text-amber-600')}
              </div>
            </div>
            <div className="rounded-[18px] border border-[#0077B6]/20 bg-[#f6fbff] p-6 text-slate-900 shadow-[0_8px_24px_rgba(0,119,182,0.08)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#0077B6]/10 p-3 text-[#0077B6]">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Priority support</div>
                  <div className="mt-1 text-2xl font-bold">Travel assistance</div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">If your trip changes, boarding details update, or you need help with a booking, this panel keeps everything within reach.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className={`${cardClassName} p-6`}>
            <SectionHeader
              eyebrow="Notifications"
              title="Recent support and trip updates"
              description="Latest alerts connected to your travel, booking, and account activity."
            />

            {notificationsLoading ? (
              <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-6 text-center text-sm font-semibold text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-6 text-center text-sm text-slate-500">No support notifications yet.</div>
            ) : (
              <div className="mt-6 space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-black text-slate-900">{notification.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</div>
                      </div>
                      {!notification.isRead && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">New</span>}
                    </div>
                    <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Recently'}</div>
                  </div>
                ))}
              </div>
            )}

            {notificationsError && (
              <div className="mt-4 flex items-start gap-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notificationsError}</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className={`${cardClassName} p-6`}>
              <SectionHeader
                eyebrow="Quick Actions"
                title="Get where you need to go"
                description="Fast links to the most important commuter tasks."
              />
              <div className="mt-5 grid gap-3">
                <ShortcutCard
                  icon={Ticket}
                  title="Open My Bookings"
                  description="View your boarding passes and seat details."
                  onClick={() => setActiveTab('bookings')}
                />
                <ShortcutCard
                  icon={Navigation}
                  title="Track a Bus"
                  description="See live location, ETA, and route progress."
                  onClick={() => setActiveTab('map')}
                />
                <ShortcutCard
                  icon={Search}
                  title="Book another trip"
                  description="Search shared routes and reserve a seat."
                  onClick={() => setActiveTab('shared')}
                />
              </div>
            </div>

            <div className={`${cardClassName} p-6`}>
              <SectionHeader
                eyebrow="Support Contacts"
                title="Reach SafariTix support"
                description="Dedicated commuter help channels and support windows."
              />
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <ContactCard label="Email support" value="safaritixrwanda@gmail.com" />
                <ContactCard label="Phone assistance" value="+250 793 216 602" />
                <ContactCard label="Support hours" value="Every day, 06:00 - 22:00 CAT" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSharedTab = () => {
    return (
      <div className="space-y-6">
        <div className={`${cardClassName} overflow-hidden`}>
          <div className="relative overflow-hidden bg-[#f7fbff] px-6 py-6 text-slate-900 lg:px-8 lg:py-8 border-b border-[#0077B6]/15">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#0077B6]" />
            <div className="relative grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0077B6]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#0077B6]">
                  <Bus className="h-4 w-4" /> Digital commuter platform
                </div>
                <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-slate-900 lg:text-4xl">Book faster, manage live tickets, and track every journey with confidence.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 lg:text-base">SafariTix brings booking, boarding passes, and live trip visibility into one modern commuter workspace designed for daily transport.
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  {metricCard('Upcoming trips', String(trackableTickets.length), 'text-slate-900')}
                  {metricCard('Booked tickets', String(tickets.length), 'text-slate-900')}
                  {metricCard('Unread alerts', String(unreadNotifications.length), 'text-[#0077B6]')}
                </div>
              </div>

              <form onSubmit={handleSearch} className="rounded-[16px] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.08)] lg:p-6">
                <SectionHeader
                  eyebrow="Search Trips"
                  title="Find your next seat"
                  description="Search available buses by route, date, and passenger count."
                />

                <div className="mt-5 grid gap-4">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">From</span>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input list="commuter-stop-options-from" value={fromLocation} onChange={(event) => setFromLocation(event.target.value)} placeholder="Select departure" className={fieldClassName + ' pl-12'} />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">To</span>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input list="commuter-stop-options-to" value={toLocation} onChange={(event) => setToLocation(event.target.value)} placeholder="Select destination" className={fieldClassName + ' pl-12'} />
                    </div>
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Date</span>
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input type="date" value={travelDate} onChange={(event) => setTravelDate(event.target.value)} className={fieldClassName + ' pl-12'} />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Passengers</span>
                      <div className="flex h-[54px] items-center rounded-[20px] border border-slate-200 bg-white px-4 shadow-sm">
                        <User className="h-5 w-5 text-slate-400" />
                        <button type="button" onClick={() => setPassengers((current) => Math.max(1, current - 1))} className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-lg font-black text-slate-600 transition hover:bg-slate-200">-</button>
                        <span className="w-10 text-center text-sm font-black text-slate-900">{passengers}</span>
                        <button type="button" onClick={() => setPassengers((current) => Math.min(10, current + 1))} className="rounded-full bg-slate-100 px-3 py-1 text-lg font-black text-slate-600 transition hover:bg-slate-200">+</button>
                      </div>
                    </label>
                  </div>

                  <button type="submit" disabled={searchLoading} className={primaryButtonClassName + ' w-full'}>
                    {searchLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {searchLoading ? 'Searching...' : 'Search available buses'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {(bookingError || bookingSuccess || ticketsError) && (
          <div className="space-y-3">
            {bookingError && (
              <div className="flex items-start gap-3 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}
            {bookingSuccess && (
              <div className="flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{bookingSuccess}</span>
              </div>
            )}
            {ticketsError && (
              <div className="flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{ticketsError}</span>
              </div>
            )}
          </div>
        )}

        {renderSearchResults()}

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div className={`${cardClassName} p-6`}>
            <SectionHeader
              eyebrow="Quick Actions"
              title="Move through the platform faster"
              description="Access booking management, live tracking, support, and history from one place."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <ShortcutCard icon={Ticket} title="My Bookings" description="Open your tickets and boarding QR codes." onClick={() => setActiveTab('bookings')} />
              <ShortcutCard icon={Navigation} title="Track Bus" description="See live movement and estimated arrival time." onClick={() => setActiveTab('map')} />
              <ShortcutCard icon={History} title="Trip History" description="Review completed and cancelled trips." onClick={() => setActiveTab('history')} />
              <ShortcutCard icon={HelpCircle} title="Help Center" description="Support notifications and contact details." onClick={() => setActiveTab('help')} />
            </div>
          </div>

          <div className={`${cardClassName} p-6`}>
            <SectionHeader
              eyebrow="Popular Routes"
              title="Fast route shortcuts"
              description="Tap a route to prefill your search and book faster."
            />

            <div className="mt-6 grid gap-3">
              {popularRoutes.length === 0 ? (
                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5 text-sm text-slate-500">Popular schedules will appear here once route data is available.</div>
              ) : (
                popularRoutes.map((route) => (
                  <button
                    key={`${route.schedule_id}-${route.pickup_stop}-${route.dropoff_stop}`}
                    onClick={() => {
                      setFromLocation(route.pickup_stop);
                      setToLocation(route.dropoff_stop);
                    }}
                    className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 text-left transition hover:border-[#0077B6]/20 hover:bg-[#0077B6]/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <RouteLine from={route.pickup_stop} to={route.dropoff_stop} />
                        <div className="mt-2 text-sm text-slate-500">{formatShortDate(route.departure_date)} · {formatTime(route.departure_time)}</div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">{route.available_seats ?? 0} seats</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'shared':
        return renderSharedTab();
      case 'bookings':
        return renderBookings();
      case 'map':
        return renderTracking();
      case 'history':
        return renderHistory();
      case 'help':
        return renderHelp();
      case 'profile':
        return <AccountSettings />;
      default:
        return renderSharedTab();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,119,182,0.05),transparent_32%)]" />
      <datalist id="commuter-stop-options-from">
        {stopOptions.filter((stop) => stop !== toLocation).map((stop) => <option key={`from-${stop}`} value={stop} />)}
      </datalist>
      <datalist id="commuter-stop-options-to">
        {stopOptions.filter((stop) => stop !== fromLocation).map((stop) => <option key={`to-${stop}`} value={stop} />)}
      </datalist>

      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between gap-3 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setMobileMenuOpen((current) => !current)} className="inline-flex rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="rounded-[16px] bg-[#0077B6] p-2.5 text-white shadow-[0_12px_24px_rgba(0,119,182,0.3)]">
                <Bus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#0077B6]">SafariTix</div>
                <div className="truncate text-base font-black font-montserrat text-slate-900 sm:text-lg">Commuter Dashboard</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => void refreshDashboard()} className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[#0077B6]/25 hover:bg-[#0077B6]/5 md:inline-flex">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <NotificationBell />
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 xl:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0077B6]/10 text-[#0077B6]">
                  <User className="h-4 w-4" />
                </div>
                <div className="max-w-[180px] truncate text-xs font-semibold text-slate-600">{user?.name || 'Commuter'}</div>
              </div>
              <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3.5 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 sm:px-4">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>

          <div className="hidden pb-3 lg:block">
            <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${isActive ? 'bg-[#0077B6] text-white shadow-[0_10px_20px_rgba(0,119,182,0.24)]' : 'bg-white text-slate-600 hover:bg-[#0077B6]/8 hover:text-[#0077B6]'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="mx-auto grid max-w-[1440px] gap-2 sm:grid-cols-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${activeTab === item.id ? 'bg-[#0077B6] text-white shadow-[0_10px_18px_rgba(0,119,182,0.24)]' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-[#0077B6]/5'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-6 xl:px-8">
        <aside className="hidden lg:block">
          <div className={`${cardClassName} sticky top-28 overflow-hidden p-5`}>
            <div className="rounded-[16px] border border-[#0077B6]/20 bg-[#f7fbff] p-5 shadow-[0_8px_24px_rgba(0,119,182,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0077B6]">Welcome back</div>
              <div className="mt-2 text-2xl font-bold leading-tight text-slate-900">{user?.name || 'Commuter'}</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">A single workspace for booking, boarding, and live transport visibility.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <SidebarMiniStat label="Active trips" value={String(trackableTickets.length)} />
                <SidebarMiniStat label="Unread alerts" value={String(unreadNotifications.length)} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {metricCard('Active trips', String(trackableTickets.length), 'text-slate-900')}
              {metricCard('Trip history', String(historyTickets.length), 'text-slate-900')}
              {metricCard('Unread alerts', String(unreadNotifications.length), 'text-[#0077B6]')}
            </div>

            <div className="mt-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center justify-between rounded-[20px] px-4 py-3.5 text-left text-sm font-bold transition ${activeTab === item.id ? 'bg-[#0077B6] text-white shadow-[0_12px_24px_rgba(0,119,182,0.2)]' : 'bg-slate-50 text-slate-700 hover:bg-[#0077B6]/5'}`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-[16px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Member profile</div>
              <div className="mt-3 text-sm font-black text-slate-900">{user?.email || 'Passenger account'}</div>
              <button onClick={() => setActiveTab('profile')} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0077B6] transition hover:text-[#005F8E]">
                Open profile
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <section className={`${cardClassName} relative overflow-hidden`}>
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#0077B6]" />
            <div className="relative grid gap-6 px-6 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-7">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0077B6]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">
                  <Bus className="h-3.5 w-3.5" />
                  Today at a glance
                </div>
                <h2 className="mt-4 text-3xl font-bold leading-tight text-slate-950 lg:text-4xl lg:leading-tight">
                  {greetingLabel}, {user?.name || 'Commuter'}.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 lg:text-base">
                  Plan, book, and track from one calm dashboard designed for daily travel decisions.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button onClick={() => setActiveTab('shared')} className={primaryButtonClassName + ' !px-4 !py-2.5'}>
                    <Search className="h-4 w-4" /> Book a trip
                  </button>
                  <button onClick={() => setActiveTab('bookings')} className={secondaryButtonClassName + ' !px-4 !py-2.5'}>
                    <BookOpen className="h-4 w-4" /> Open tickets
                  </button>
                  <button onClick={() => setActiveTab('map')} className="inline-flex items-center gap-2 rounded-full border border-[#0077B6]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#0077B6] transition hover:bg-[#0077B6]/8">
                    <Navigation className="h-4 w-4" /> Live tracking
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {metricCard('Active trips', String(trackableTickets.length), 'text-slate-900')}
                {metricCard('Booked tickets', String(tickets.length), 'text-slate-900')}
                {metricCard('Unread alerts', String(unreadNotifications.length), 'text-[#0077B6]')}
                <div className={mutedCardClassName + ' p-5'}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Next trip</div>
                    <span className="rounded-full bg-[#0077B6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0077B6]">Upcoming</span>
                  </div>
                  {nextTrip ? (
                    <>
                      <div className="mt-3"><RouteLine from={nextTrip.fromStop} to={nextTrip.toStop} /></div>
                      <div className="mt-2 text-sm text-slate-500">{formatShortDate(nextTrip.scheduleDate)} · {formatTime(nextTrip.departureTime)} · Seat {nextTrip.seatNumber}</div>
                    </>
                  ) : (
                    <div className="mt-3 text-sm text-slate-500">Book your next journey to populate this preview.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {renderContent()}
        </main>
      </div>

      {viewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setViewTicket(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]" onClick={(event) => event.stopPropagation()}>
            <div className="bg-[#f4f9ff] px-6 pb-8 pt-6 text-slate-900 border-b border-[#0077B6]/15">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Boarding pass</div>
                  <div className="mt-4"><RouteLine from={viewTicket.fromStop} to={viewTicket.toStop} prominent={true} /></div>
                  <p className="mt-3 text-sm text-slate-600">{formatDate(viewTicket.scheduleDate)} · {formatTime(viewTicket.departureTime)}</p>
                </div>
                <button onClick={() => setViewTicket(null)} className="rounded-full bg-slate-200 p-2 transition hover:bg-slate-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <TicketFact label="Passenger" value={user?.name || 'Commuter'} />
                <TicketFact label="Seat" value={viewTicket.seatNumber} />
                <TicketFact label="Bus" value={viewTicket.busPlate} />
                <TicketFact label="Reference" value={viewTicket.bookingRef} mono={true} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                <div className="mx-auto inline-flex rounded-3xl bg-white p-4 shadow-sm">
                  <QRCodeSVG value={viewTicket.bookingRef || viewTicket.id} size={200} level="H" includeMargin={true} />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-500">Show this QR code to the driver when boarding.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className={`mt-2 text-sm font-black text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function QrPreview({ value }: { value: string }) {
  return (
    <div className="rounded-[18px] bg-white p-2 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
      <QRCodeSVG value={value} size={48} level="H" includeMargin={false} />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0077B6]">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-bold text-slate-950 lg:text-[30px] lg:leading-[1.1]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function RouteLine({
  from,
  to,
  prominent = false,
  light = false,
}: {
  from: string;
  to: string;
  prominent?: boolean;
  light?: boolean;
}) {
  const textClassName = light ? 'text-white' : 'text-slate-950';
  const subClassName = light ? 'text-sky-100/90' : 'text-slate-400';

  return (
    <div className={`flex items-center gap-3 ${prominent ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
      <span className={`font-black ${textClassName}`}>{from}</span>
      <span className={`inline-flex items-center gap-2 ${subClassName}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${light ? 'bg-white/75' : 'bg-[#0077B6]'}`} />
        <ArrowRight className="h-4 w-4" />
        <span className={`h-2.5 w-2.5 rounded-full ${light ? 'bg-white/75' : 'bg-slate-300'}`} />
      </span>
      <span className={`font-black ${textClassName}`}>{to}</span>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  spinning = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  spinning?: boolean;
}) {
  return (
    <div className={`${cardClassName} p-10 text-center`}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0077B6]/10 text-[#0077B6]">
        <Icon className={`h-7 w-7 ${spinning ? 'animate-spin' : ''}`} />
      </div>
      <h3 className="mt-5 text-2xl font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ShortcutCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="rounded-[22px] border border-slate-200 bg-white p-5 text-left transition hover:border-[#0077B6]/20 hover:shadow-[0_12px_26px_rgba(0,119,182,0.1)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white text-[#0077B6] shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-4 text-lg font-bold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </button>
  );
}

function ContactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function SidebarMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#0077B6]/10 bg-white px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}