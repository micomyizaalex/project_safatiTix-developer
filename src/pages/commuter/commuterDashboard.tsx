import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, Bus, Calendar, Navigation, Search, Ticket, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import PassengerTracking from '../../components/PassengerTracking';
import BookingList from './dashboard/components/BookingList';
import ComplaintSection from './dashboard/components/ComplaintSection';
import DashboardHeader from './dashboard/components/DashboardHeader';
import DashboardMetrics from './dashboard/components/DashboardMetrics';
import Notifications from './dashboard/components/Notifications';
import { AppAlert, BookingFilter, BookingRecord, NotificationRecord } from './dashboard/types';
import {
  authHeaders,
  dedupeBookings,
  formatCurrency,
  formatDate,
  formatTime,
  isActiveBooking,
  isCanceledBooking,
  isPastBooking,
  normalizeBooking,
  normalizeNotification,
  parseMaybeJson,
} from './dashboard/utils';

function isCancelable(booking: BookingRecord) {
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') return false;
  if (!booking.scheduleDate || !booking.departureTime) return true;

  const departureDateTime = new Date(`${booking.scheduleDate}T${booking.departureTime}`);
  if (Number.isNaN(departureDateTime.getTime())) return true;

  const diffMinutes = (departureDateTime.getTime() - Date.now()) / (1000 * 60);
  return diffMinutes >= 15;
}

function filterBookings(bookings: BookingRecord[], filter: BookingFilter) {
  if (filter === 'all') return bookings;
  if (filter === 'canceled') return bookings.filter(isCanceledBooking);
  if (filter === 'past') return bookings.filter((booking) => !isCanceledBooking(booking) && isPastBooking(booking));
  return bookings.filter((booking) => !isCanceledBooking(booking) && isActiveBooking(booking));
}

function TicketPreviewModal({ booking, onClose }: { booking: BookingRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0077B6]">Boarding pass</p>
              <h4 className="mt-1 text-lg font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
                {booking.fromStop} to {booking.toStop}
              </h4>
              <p className="text-sm text-slate-500">
                {formatDate(booking.scheduleDate)} at {formatTime(booking.departureTime)}
              </p>
            </div>
            <button onClick={onClose} className="rounded-full bg-slate-200 p-2 transition hover:bg-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Seat</p>
              <p className="font-semibold text-slate-800">{booking.seatNumber}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Fare</p>
              <p className="font-semibold text-slate-800">{formatCurrency(booking.fare)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Bus Plate</p>
              <p className="font-semibold text-slate-800">{booking.busPlate}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Reference</p>
              <p className="truncate font-semibold text-slate-800">{booking.bookingRef || booking.id}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <div className="mx-auto inline-flex rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeSVG value={booking.bookingRef || booking.id} size={180} level="H" includeMargin={true} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Show this QR code to the driver when boarding.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommuterDashboard() {
  const { user, accessToken, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('all');
  const [selectedTrackingBooking, setSelectedTrackingBooking] = useState<BookingRecord | null>(null);
  const [ticketPreview, setTicketPreview] = useState<BookingRecord | null>(null);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState(new Date().toISOString().slice(0, 10));

  const pushAlert = (type: AppAlert['type'], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setAlerts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setAlerts((current) => current.filter((alert) => alert.id !== id));
    }, 5000);
  };

  const dismissAlert = (id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  const loadBookings = async () => {
    if (!accessToken) {
      setBookings([]);
      return;
    }

    setLoadingBookings(true);
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
      const merged = dedupeBookings([...myTicketsList, ...ticketsList].map(normalizeBooking));

      setBookings(merged.filter((booking) => Boolean(booking.id)));
    } catch {
      pushAlert('error', 'Failed to load your bookings. Please try again.');
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadNotifications = async () => {
    if (!accessToken) {
      setNotifications([]);
      setLoadingNotifications(false);
      return;
    }

    setLoadingNotifications(true);
    try {
      const response = await fetch('/api/notifications?limit=6', {
        headers: authHeaders(accessToken),
      });
      const payload = await parseMaybeJson(response);
      if (response.ok) {
        const list = Array.isArray(payload?.data) ? payload.data.map(normalizeNotification) : [];
        setNotifications(list);
      } else {
        pushAlert('info', 'Could not refresh notifications right now.');
      }
    } catch {
      pushAlert('info', 'Notifications are temporarily unavailable.');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    await Promise.all([loadBookings(), loadNotifications()]);
    setRefreshing(false);
  };

  useEffect(() => {
    void refreshDashboard();
  }, [accessToken]);

  useEffect(() => {
    if (!selectedTrackingBooking) {
      const firstTrackable = bookings.find(isActiveBooking) || null;
      setSelectedTrackingBooking(firstTrackable);
      return;
    }

    const stillExists = bookings.some((booking) => booking.id === selectedTrackingBooking.id);
    if (!stillExists) {
      setSelectedTrackingBooking(bookings.find(isActiveBooking) || null);
    }
  }, [bookings, selectedTrackingBooking]);

  useEffect(() => {
    if (location.pathname === '/commuter/bookings') {
      setActiveFilter('all');
      window.setTimeout(() => {
        document.getElementById('bookings-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, [location.pathname]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const filteredBookings = useMemo(() => {
    return filterBookings(bookings, activeFilter);
  }, [bookings, activeFilter]);

  const metrics = useMemo(() => {
    return {
      totalTrips: bookings.length,
      upcomingTrips: bookings.filter((booking) => !isCanceledBooking(booking) && isActiveBooking(booking)).length,
      canceledTrips: bookings.filter(isCanceledBooking).length,
    };
  }, [bookings]);

  const upcomingTrips = useMemo(() => {
    return bookings.filter((booking) => !isCanceledBooking(booking) && isActiveBooking(booking)).slice(0, 3);
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((left, right) => {
        const leftTs = new Date(left.createdAt || left.scheduleDate || 0).getTime();
        const rightTs = new Date(right.createdAt || right.scheduleDate || 0).getTime();
        return rightTs - leftTs;
      })
      .slice(0, 4);
  }, [bookings]);

  const handleTrackBus = (booking: BookingRecord) => {
    setSelectedTrackingBooking(booking);
    document.getElementById('track-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToSearch = () => {
    const params = new URLSearchParams();
    if (searchFrom.trim()) params.set('from', searchFrom.trim());
    if (searchTo.trim()) params.set('to', searchTo.trim());
    if (searchDate) params.set('date', searchDate);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    navigate(`/commuter/search${suffix}`);
  };

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    goToSearch();
  };

  const handleCancelBooking = async (booking: BookingRecord) => {
    if (!accessToken) {
      pushAlert('error', 'You are not authenticated.');
      return;
    }

    if (!isCancelable(booking)) {
      pushAlert('error', 'This booking can no longer be canceled (less than 15 minutes to departure).');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    setCancelingId(booking.id);
    try {
      const primaryResponse = await fetch(`/api/tickets/${booking.id}/cancel`, {
        method: 'PATCH',
        headers: authHeaders(accessToken, true),
      });

      const primaryPayload = await parseMaybeJson(primaryResponse);

      if (!primaryResponse.ok) {
        const message =
          primaryPayload?.message ||
          primaryPayload?.error ||
          'Failed to cancel booking.';
        throw new Error(message);
      }

      setBookings((current) =>
        current.map((item) => (
          item.id === booking.id ||
          item.id === primaryPayload?.ticket?.id ||
          item.bookingRef === booking.bookingRef
            ? { ...item, status: primaryPayload?.ticket?.status || 'CANCELLED' }
            : item
        ))
      );
      await loadBookings();
      pushAlert('success', 'Booking canceled successfully.');
    } catch (error: any) {
      pushAlert('error', error?.message || 'Failed to cancel booking.');
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 [font-family:Inter,Roboto,sans-serif]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(0,119,182,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(244,162,97,0.12),transparent_42%)]" />

      <DashboardHeader
        userName={user?.name || 'Commuter'}
        unreadCount={unreadCount}
        notifications={notifications}
        loadingNotifications={loadingNotifications}
        refreshing={refreshing}
        onRefresh={refreshDashboard}
        onLoadNotifications={loadNotifications}
        onSignOut={signOut}
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)] md:px-6">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Navigation</h3>
            <button
              onClick={() => document.getElementById('summary-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Dashboard Summary
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => document.getElementById('bookings-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Bookings
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => document.getElementById('track-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Bus Tracking
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => document.getElementById('complaints-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Complaints
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => document.getElementById('bookings-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0077B6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#005F8E]"
            >
              <Search className="h-4 w-4" />
              Book Another Trip
            </button>
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] md:p-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0077B6]">Search Bus</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
                  Plan your next trip in seconds
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Search by origin, destination, and date to instantly find buses and choose your seat.
                </p>

                <form onSubmit={onSearchSubmit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">From</span>
                    <input
                      value={searchFrom}
                      onChange={(event) => setSearchFrom(event.target.value)}
                      placeholder="Origin"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/15"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">To</span>
                    <input
                      value={searchTo}
                      onChange={(event) => setSearchTo(event.target.value)}
                      placeholder="Destination"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/15"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Date</span>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={searchDate}
                        onChange={(event) => setSearchDate(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 pl-9 text-sm outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/15"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0077B6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#005F8E]"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-[#F4A261]/35 bg-[linear-gradient(145deg,#fff7ed_0%,#ffffff_55%)] p-5 text-center shadow-sm md:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A76025]">Start Booking</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">Book a Bus</h3>
                <p className="mt-2 text-sm text-slate-600">Fast checkout with seat selection and live trip updates.</p>
                <button
                  onClick={goToSearch}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F4A261] px-5 py-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(244,162,97,0.35)] transition hover:bg-[#e38a3f]"
                >
                  <Bus className="h-5 w-5" />
                  Book a Bus
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0077B6]">Quick Actions</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                onClick={() => navigate('/commuter/search')}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#0077B6]/35 hover:bg-[#0077B6]/5"
              >
                <Search className="h-5 w-5 text-[#0077B6]" />
                <div className="mt-3 text-lg font-bold text-slate-900">Search Bus</div>
                <p className="mt-1 text-sm text-slate-500">Find available buses by route and date.</p>
              </button>

              <button
                onClick={() => navigate('/commuter/bookings')}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#0077B6]/35 hover:bg-[#0077B6]/5"
              >
                <Ticket className="h-5 w-5 text-[#0077B6]" />
                <div className="mt-3 text-lg font-bold text-slate-900">My Bookings</div>
                <p className="mt-1 text-sm text-slate-500">Review upcoming and past bookings quickly.</p>
              </button>

              <button
                onClick={() => {
                  if (selectedTrackingBooking) {
                    handleTrackBus(selectedTrackingBooking);
                  } else {
                    document.getElementById('track-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#0077B6]/35 hover:bg-[#0077B6]/5"
              >
                <Navigation className="h-5 w-5 text-[#0077B6]" />
                <div className="mt-3 text-lg font-bold text-slate-900">Track Bus</div>
                <p className="mt-1 text-sm text-slate-500">Open live tracking for your active trip.</p>
              </button>
            </div>
          </section>

          <section id="summary-panel" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0077B6]">Welcome back</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
                  Ready for your next trip?
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Manage active bookings, view ticket details, and track your bus in real time from one place.
                </p>
              </div>
              <button
                onClick={() => document.getElementById('bookings-panel')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 rounded-full border border-[#F4A261]/40 bg-[#F4A261]/15 px-4 py-2 text-sm font-semibold text-[#A76025] transition hover:bg-[#F4A261]/25"
              >
                <Ticket className="h-4 w-4" />
                Open My Tickets
              </button>
            </div>

            <div className="mt-4">
              <DashboardMetrics
                totalTrips={metrics.totalTrips}
                upcomingTrips={metrics.upcomingTrips}
                canceledTrips={metrics.canceledTrips}
              />
            </div>

            <div className="mt-5 hidden grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Upcoming Trips</h4>
                <div className="mt-3 space-y-2">
                  {upcomingTrips.length === 0 ? (
                    <p className="text-sm text-slate-500">No upcoming trips yet.</p>
                  ) : (
                    upcomingTrips.map((trip) => (
                      <div key={trip.id} className="rounded-xl bg-white px-3 py-2">
                        <div className="text-sm font-semibold text-slate-800">{trip.fromStop} to {trip.toStop}</div>
                        <div className="text-xs text-slate-500">
                          {formatDate(trip.scheduleDate)} at {formatTime(trip.departureTime)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Recent Bookings</h4>
                <div className="mt-3 space-y-2">
                  {recentBookings.length === 0 ? (
                    <p className="text-sm text-slate-500">No recent bookings yet.</p>
                  ) : (
                    recentBookings.map((trip) => (
                      <div key={`${trip.id}-recent`} className="rounded-xl bg-white px-3 py-2">
                        <div className="text-sm font-semibold text-slate-800">{trip.fromStop} to {trip.toStop}</div>
                        <div className="text-xs text-slate-500">{trip.bookingRef || trip.id} • {formatCurrency(trip.fare)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section id="notifications-panel" className="hidden">
            <Notifications
              alerts={alerts}
              notifications={notifications}
              loading={loadingNotifications}
              onDismissAlert={dismissAlert}
            />
          </section>

          <section id="bookings-panel">
            <BookingList
              bookings={filteredBookings}
              loading={loadingBookings}
              activeFilter={activeFilter}
              cancelingId={cancelingId}
              accessToken={accessToken}
              onFilterChange={setActiveFilter}
              onViewTicket={setTicketPreview}
              onCancelBooking={handleCancelBooking}
              onTrackBus={handleTrackBus}
            />
          </section>

          <section id="track-panel" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0077B6]">Bus Tracking</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
                  Live trip view
                </h3>
              </div>
              {selectedTrackingBooking && (
                <span className="rounded-full bg-[#0077B6]/10 px-3 py-1 text-xs font-semibold text-[#005F8E]">
                  {selectedTrackingBooking.fromStop} to {selectedTrackingBooking.toStop}
                </span>
              )}
            </div>

            {selectedTrackingBooking ? (
              <div className="space-y-4">
                <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Departure</p>
                    <p className="font-semibold text-slate-800">
                      {formatDate(selectedTrackingBooking.scheduleDate)} at{' '}
                      {formatTime(selectedTrackingBooking.departureTime)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Seat</p>
                    <p className="font-semibold text-slate-800">{selectedTrackingBooking.seatNumber}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Reference</p>
                    <p className="font-semibold text-slate-800">{selectedTrackingBooking.bookingRef}</p>
                  </div>
                </div>

                <PassengerTracking
                  scheduleId={selectedTrackingBooking.scheduleId}
                  ticketId={selectedTrackingBooking.id}
                  routeFrom={selectedTrackingBooking.fromStop}
                  routeTo={selectedTrackingBooking.toStop}
                  departureTime={selectedTrackingBooking.departureTime || undefined}
                  autoStart={true}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                <Navigation className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">
                  Select an active booking and tap Track Bus to open detailed live tracking.
                </p>
              </div>
            )}
          </section>

          <ComplaintSection
            accessToken={accessToken}
            bookings={bookings.map((b) => ({
              id: b.id,
              scheduleId: b.scheduleId,
              fromStop: b.fromStop,
              toStop: b.toStop,
              scheduleDate: b.scheduleDate,
            }))}
          />
        </main>
      </div>

      {ticketPreview && <TicketPreviewModal booking={ticketPreview} onClose={() => setTicketPreview(null)} />}
    </div>
  );
}
