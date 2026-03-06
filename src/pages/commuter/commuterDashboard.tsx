import React, { useState, useEffect, useRef } from 'react';
import {
  Bus,
  Ticket,
  MapPin,
  User,
  Bell,
  Search,
  Calendar,
  Clock,
  ArrowRight,
  QrCode,
  Download,
  Navigation,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Award,
  Smartphone,
  CheckCircle,
  TrendingUp,
  Info,
  AlertCircle,
  History,
  Star,
  ArrowRightLeft,
  Sparkles,
  Zap,
  Share2,
  Eye,
  RefreshCw,
  CreditCard,
  XCircle,
  Timer,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../components/AuthContext';
import AccountSettings from '../account/AccountSettings';
import NotificationBell from '../../components/NotificationBell';

// ========================================
// COMMUTER DASHBOARD - REDESIGNED
// Main Landing: Shared Trip Search (replaces Home)
// ========================================

export default function CommuterDashboard() {
  const { user, signOut, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('shared'); // Default to Shared Trips
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Search state
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  
  // Data state
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [availableStops, setAvailableStops] = useState<string[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [myTicketsLoading, setMyTicketsLoading] = useState(false);
  const [myTicketsError, setMyTicketsError] = useState('');
  const [viewTicket, setViewTicket] = useState<any | null>(null); // full boarding-pass modal
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Static fallback cities shown while stops load from DB
  const fallbackCities = ['Kigali', 'Huye', 'Musanze', 'Rubavu', 'Rusizi', 'Muhanga', 'Rwamagana', 'Kamonyi', 'Ruhango', 'Nyanza'];
  const stopOptions = availableStops.length > 0 ? availableStops : fallbackCities;

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Fetch user's upcoming trips
    const fetchUpcomingTrips = async () => {
      try {
        const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
        const res = await fetch('/api/tickets', { headers: hdrs });
        if (res.ok) {
          const json = await res.json();
          const tickets = Array.isArray(json.tickets) ? json.tickets : [];
          const confirmed = tickets.filter((t: any) => t.status === 'CONFIRMED');
          setUpcomingTrips(confirmed);
        }
      } catch (e) {
        console.error('Failed to fetch tickets', e);
      }
    };

    // Fetch popular routes
    const fetchPopularRoutes = async () => {
      try {
        const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
        const res = await fetch('/api/schedules', { headers: hdrs });
        if (res.ok) {
          const json = await res.json();
          const schedules = Array.isArray(json.schedules) ? json.schedules : [];
          const normalized = schedules.map((s: any, idx: number) => ({
            id: s.id || s.schedule_id || idx,
            from: s.from || s.routeFrom || s.from_location || s.route_from || s.origin || 'Unknown',
            to: s.to || s.routeTo || s.to_location || s.route_to || s.destination || 'Unknown',
            scheduleDate: s.date || s.schedule_date || s.departureDate || '',
            departureTime: s.departureTime || s.departure_time || s.time || '',
            duration: s.duration || '2-3h',
            price: Number(s.price || s.price_per_seat || 0),
            availableSeats: Number(s.availableSeats ?? s.available_seats ?? s.seatsAvailable ?? 0),
          }));

          normalized.sort((a: any, b: any) => {
            const ad = `${a.scheduleDate || ''} ${a.departureTime || ''}`;
            const bd = `${b.scheduleDate || ''} ${b.departureTime || ''}`;
            return ad.localeCompare(bd);
          });

          // Show all available schedules to passengers
          setPopularRoutes(normalized);
        }
      } catch (e) {
        console.error('Failed to fetch schedules', e);
      }
    };

    // Fetch available bus stops from the route_stops table
    const fetchAvailableStops = async () => {
      try {
        const res = await fetch('/api/stops');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.stops) && json.stops.length > 0) {
            setAvailableStops(json.stops);
          }
        }
      } catch (e) {
        console.error('Failed to fetch stops', e);
      }
    };

    // Mock announcements
    setAnnouncements([
      { id: 1, type: 'info', title: 'Extended Service', message: 'Additional buses available during Easter weekend' },
      { id: 2, type: 'warning', title: 'Route Update', message: 'Kigali-Huye route has temporary detour due to road work' },
    ]);

    fetchUpcomingTrips();
    fetchPopularRoutes();
    fetchAvailableStops();
  }, [accessToken]);

  // Load tickets whenever the bookings tab becomes active
  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchMyTickets();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchMyTickets = async () => {
    if (!accessToken) return;
    setMyTicketsLoading(true);
    setMyTicketsError('');
    try {
      const res = await fetch('/api/my-tickets', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMyTickets(Array.isArray(json.tickets) ? json.tickets : []);
      } else {
        setMyTicketsError(json.message || 'Failed to load bookings.');
      }
    } catch {
      setMyTicketsError('Network error. Please check your connection.');
    } finally {
      setMyTicketsLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!fromLocation || !toLocation) {
      alert('Please select both departure and arrival cities');
      return;
    }

    if (fromLocation === toLocation) {
      alert('Departure and arrival cities must be different');
      return;
    }

    setSearchPerformed(true);
    setSearchLoading(true);
    setSearchResults([]);
    setSelectedTrip(null);

    try {
      const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;

      let qs = `?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}`;
      if (travelDate) qs += `&date=${encodeURIComponent(travelDate)}`;

      const res = await fetch(`/api/search-trips${qs}`, { headers: hdrs });
      if (res.ok) {
        const json = await res.json();
        setSearchResults(json.success ? (json.trips || []) : []);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const handleBookSeat = async (trip: any, seatNumber?: number) => {
    if (!user) {
      alert('Please log in to book a seat.');
      return;
    }
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');
    try {
      const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
      const body = {
        schedule_id: trip.schedule_id,
        from_stop: trip.pickup_stop,
        to_stop: trip.dropoff_stop,
        ...(seatNumber ? { seat_number: seatNumber } : {}),
        passenger_name: user?.name || '',
      };
      const res = await fetch('/api/book-ticket', {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBookingSuccess(`Booking confirmed! Ticket ID: ${json.ticket?.id || json.ticket?.ticket_id || 'N/A'}`);
        // Redirect to My Bookings tab after a short delay so user sees the confirmation
        setTimeout(() => {
          setSelectedTrip(null);
          setActiveTab('bookings');
        }, 1800);
        // Refresh search results to reflect updated seat counts
        handleSearch();
      } else {
        setBookingError(json.message || 'Booking failed. Please try again.');
      }
    } catch (err) {
      setBookingError('Network error. Please check your connection.');
    } finally {
      setBookingLoading(false);
    }
  };

  const parseDateLabel = (value?: string) => {
    if (!value) return 'Available soon';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Available soon';
    const today = new Date();
    const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((dd.getTime() - td.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Available today';
    if (diff === 1) return 'Available tomorrow';
    return `Available ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  };

  const formatTime = (value?: string) => {
    if (!value) return '--:--';
    const raw = String(value).trim();
    if (/^\d{1,2}:\d{2}/.test(raw)) return raw.slice(0, 5);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const normalizeTicketStatus = (status?: string) => {
    const current = String(status || '').toUpperCase();
    if (current === 'CHECKED_IN' || current === 'USED' || current === 'COMPLETED') return 'USED';
    if (current === 'CANCELLED') return 'CANCELLED';
    return 'CONFIRMED';
  };

  const buildTicketQrPayload = (ticket: any) => ({
    ticketId: ticket.booking_ref || ticket.id || 'N/A',
    route: `${ticket.from_stop || ''}-${ticket.to_stop || ''}`,
    date: String(ticket.schedule_date || '').slice(0, 10),
    time: formatTime(ticket.departure_time || ticket.time || ''),
    seat: Number(ticket.seat_number || 0),
    bus: ticket.bus_plate || '',
    price: Number(ticket.price || 0),
    status: normalizeTicketStatus(ticket.status),
  });

  // ========================================
  // SHARED TRIP SEARCH PAGE (NEW MAIN LANDING)
  // ========================================
  const renderSharedTripSearch = () => (
    <div className="space-y-8">
      {/* Hero Search Section */}
      <div className="relative bg-gradient-to-br from-[#0077B6] via-[#0088CC] to-[#00A8E8] rounded-3xl overflow-hidden shadow-2xl">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32"></div>
        </div>
        
        <div className="relative z-10 p-6 lg:p-12">
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">Welcome to SafariTix</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-black text-white mb-3">
              Book Your Bus Journey
            </h1>
            <p className="text-base lg:text-lg text-white/90 max-w-2xl mx-auto">
              Fast, safe, and reliable bus travel across Rwanda
            </p>
          </div>

          {/* Search Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-4 lg:p-8 max-w-5xl mx-auto">
            <form onSubmit={handleSearch}>
              {/* Desktop Layout */}
              <div className="hidden lg:grid lg:grid-cols-4 gap-4 mb-4">
                {/* From Location */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    From
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <select
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 outline-none transition-all text-gray-900 font-medium appearance-none bg-white cursor-pointer"
                    >
                      <option value="">Select city</option>
                      {stopOptions.filter(c => c !== toLocation).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex items-end justify-center">
                  <button
                    type="button"
                    onClick={swapLocations}
                    className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-[#0077B6] hover:text-white flex items-center justify-center transition-all duration-300 group"
                    disabled={!fromLocation || !toLocation}
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* To Location */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    To
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <select
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 outline-none transition-all text-gray-900 font-medium appearance-none bg-white cursor-pointer"
                    >
                      <option value="">Select city</option>
                      {stopOptions.filter(c => c !== fromLocation).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Travel Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Travel Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <input
                      type="date"
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20 outline-none transition-all text-gray-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="lg:hidden space-y-3 mb-4">
                {/* From Location */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <select
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] outline-none text-gray-900 font-medium appearance-none bg-white"
                    >
                      <option value="">Select departure city</option>
                      {stopOptions.filter(c => c !== toLocation).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={swapLocations}
                    className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    disabled={!fromLocation || !toLocation}
                  >
                    <ArrowRightLeft className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* To Location */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <select
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] outline-none text-gray-900 font-medium appearance-none bg-white"
                    >
                      <option value="">Select arrival city</option>
                      {stopOptions.filter(c => c !== fromLocation).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Travel Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Travel Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <input
                      type="date"
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-11 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] outline-none text-gray-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Passengers Selector */}
              <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-700">Passengers</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPassengers(Math.max(1, passengers - 1))}
                    className="w-9 h-9 rounded-lg bg-white border-2 border-gray-200 hover:border-[#0077B6] flex items-center justify-center font-bold text-gray-700 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-gray-900 text-lg">{passengers}</span>
                  <button
                    type="button"
                    onClick={() => setPassengers(Math.min(10, passengers + 1))}
                    className="w-9 h-9 rounded-lg bg-white border-2 border-gray-200 hover:border-[#0077B6] flex items-center justify-center font-bold text-gray-700 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Search Trips
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchPerformed && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          {searchLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#0077B6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Searching for available trips...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-gray-900">
                  Available Trips
                  <span className="ml-2 text-sm font-semibold bg-[#0077B6]/10 text-[#0077B6] px-2.5 py-1 rounded-full">
                    {searchResults.length} found
                  </span>
                </h3>
                <div className="text-sm text-gray-500">
                  {fromLocation} → {toLocation}
                  {travelDate && ` · ${new Date(travelDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                </div>
              </div>

              {/* Booking feedback messages */}
              {bookingSuccess && (
                <div className="mb-4 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-green-800">Booking Confirmed!</div>
                    <div className="text-sm text-green-700">{bookingSuccess}</div>
                  </div>
                  <button onClick={() => setBookingSuccess('')} className="ml-auto text-green-600 hover:text-green-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {bookingError && (
                <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">{bookingError}</div>
                  <button onClick={() => setBookingError('')} className="ml-auto text-red-600 hover:text-red-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {searchResults.map((trip: any, idx: number) => (
                  <div
                    key={trip.schedule_id || idx}
                    className={`border-2 rounded-2xl p-5 transition-all ${
                      selectedTrip?.schedule_id === trip.schedule_id
                        ? 'border-[#0077B6] bg-blue-50/50 shadow-md'
                        : 'border-gray-100 hover:border-[#0077B6]/50 hover:shadow-md'
                    }`}
                  >
                    {/* Trip header row */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Company & Bus Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center flex-shrink-0">
                          <Bus className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg text-gray-900 flex items-center gap-2 flex-wrap">
                            {trip.company_name && trip.company_name !== 'N/A'
                              ? trip.company_name
                              : 'Bus Company'}
                            {trip.bus_plate && trip.bus_plate !== 'N/A' && (
                              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                {trip.bus_plate}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-base font-semibold text-gray-700 mt-0.5">
                            <MapPin className="w-4 h-4 text-[#0077B6] flex-shrink-0" />
                            <span>{trip.pickup_stop}</span>
                            <ArrowRight className="w-4 h-4 text-gray-400 mx-1" />
                            <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span>{trip.dropoff_stop}</span>
                          </div>
                        </div>
                      </div>

                      {/* Trip Meta */}
                      <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 lg:gap-5">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="w-4 h-4 text-[#0077B6]" />
                          <div>
                            <div className="text-xs text-gray-500">Departure</div>
                            <div className="font-bold text-gray-900">
                              {formatTime(trip.departure_time)}
                            </div>
                          </div>
                        </div>
                        {trip.departure_date && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="w-4 h-4 text-[#0077B6]" />
                            <div>
                              <div className="text-xs text-gray-500">Date</div>
                              <div className="font-bold text-gray-900">
                                {new Date(trip.departure_date + 'T00:00:00').toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="w-4 h-4 text-[#0077B6]" />
                          <div>
                            <div className="text-xs text-gray-500">Seats left</div>
                            <div className={`font-bold ${
                              trip.available_seats <= 5 ? 'text-orange-600' : 'text-gray-900'
                            }`}>
                              {trip.available_seats}
                            </div>
                          </div>
                        </div>
                        <div className="text-right lg:text-left">
                          <div className="text-xs text-gray-500">Price / seat</div>
                          <div className="text-xl font-black text-[#0077B6]">
                            {trip.price > 0 ? `RWF ${Number(trip.price).toLocaleString()}` : 'Contact'}
                          </div>
                        </div>
                      </div>

                      {/* Book Button */}
                      <button
                        onClick={() => {
                          setBookingError('');
                          setBookingSuccess('');
                          setSelectedTrip(
                            selectedTrip?.schedule_id === trip.schedule_id ? null : trip
                          );
                        }}
                        className="w-full lg:w-auto bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 flex-shrink-0"
                      >
                        <Ticket className="w-4 h-4" />
                        Book Seat
                      </button>
                    </div>

                    {/* Inline Booking Panel */}
                    {selectedTrip?.schedule_id === trip.schedule_id && (
                      <div className="mt-5 pt-5 border-t border-[#0077B6]/20">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Ticket className="w-5 h-5 text-[#0077B6]" />
                          Confirm Booking
                        </h4>

                        {/* Summary */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                          {[{
                            label: 'Route',
                            value: `${trip.pickup_stop} → ${trip.dropoff_stop}`
                          }, {
                            label: 'Departure',
                            value: `${formatTime(trip.departure_time)}${trip.departure_date ? ' · ' + new Date(trip.departure_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`
                          }, {
                            label: 'Passengers',
                            value: String(passengers)
                          }, {
                            label: 'Total Price',
                            value: trip.price > 0 ? `RWF ${(Number(trip.price) * passengers).toLocaleString()}` : 'Contact company'
                          }].map((item) => (
                            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                              <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                              <div className="font-bold text-gray-900 text-sm">{item.value}</div>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => handleBookSeat(trip)}
                            disabled={bookingLoading}
                            className="flex-1 bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white py-3.5 rounded-xl font-bold text-base hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {bookingLoading ? (
                              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                            ) : (
                              <><CheckCircle className="w-5 h-5" /> Confirm Booking</>
                            )}
                          </button>
                          <button
                            onClick={() => setSelectedTrip(null)}
                            className="px-6 py-3.5 rounded-xl border-2 border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Bus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No trips found</h3>
              <p className="text-gray-600">Try a different date or check if this route is available</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { icon: Ticket, label: 'My Bookings', action: () => setActiveTab('bookings'), color: 'blue' },
            { icon: QrCode, label: 'Check Ticket', action: () => {}, color: 'green' },
            { icon: Download, label: 'Download', action: () => {}, color: 'purple' },
            { icon: Navigation, label: 'Track Bus', action: () => setActiveTab('map'), color: 'orange' },
            { icon: HelpCircle, label: 'Help', action: () => setActiveTab('help'), color: 'red' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-100 group text-center"
              >
                <div className={`w-14 h-14 rounded-xl bg-${item.color}-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 text-${item.color}-600`} />
                </div>
                <div className="text-sm font-bold text-gray-900">{item.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular Routes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Popular Routes</h2>
            <p className="text-sm text-gray-600">Quick access to frequently traveled routes</p>
          </div>
          <TrendingUp className="w-6 h-6 text-[#0077B6]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularRoutes.length > 0 ? popularRoutes.map((route: any) => (
            <div
              key={route.id}
              className="group bg-white border-2 border-gray-100 rounded-xl p-5 hover:border-[#0077B6] hover:shadow-lg transition-all cursor-pointer"
              onClick={() => {
                setFromLocation(route.from);
                setToLocation(route.to);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Bus className="w-5 h-5 text-gray-400 group-hover:text-[#0077B6] transition-colors" />
                <div className="text-xs text-gray-500 font-semibold">{parseDateLabel(route.scheduleDate)}</div>
              </div>
              
              <div className="mb-4">
                <div className="font-bold text-lg text-gray-900 mb-1">
                  {route.from || route.origin} → {route.to || route.destination}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{route.duration || '2-3h'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">From</div>
                  <div className="font-bold text-[#0077B6]">
                    RWF {(route.price || route.price_per_seat || 0).toLocaleString()}
                  </div>
                </div>
                <button className="w-9 h-9 rounded-lg bg-[#0077B6]/10 group-hover:bg-[#0077B6] flex items-center justify-center transition-colors">
                  <ArrowRight className="w-5 h-5 text-[#0077B6] group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-8">
              <Bus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Loading popular routes...</p>
            </div>
          )}
        </div>
      </div>

      {/* My Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">My Upcoming Trips</h2>
              <p className="text-sm text-gray-600">Your confirmed bookings</p>
            </div>
            <button
              onClick={() => setActiveTab('bookings')}
              className="text-[#0077B6] font-semibold text-sm hover:underline flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {upcomingTrips.slice(0, 2).map((trip: any) => (
              <div
                key={trip.id}
                className="border-2 border-gray-100 rounded-xl p-5 hover:border-[#0077B6] hover:shadow-md transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center">
                        <Bus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-lg text-gray-900">{trip.from} → {trip.to}</div>
                        <div className="text-sm text-gray-500">{trip.company || 'SafariTix Express'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Date</div>
                        <div className="font-semibold text-gray-900">
                          {new Date(trip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Time</div>
                        <div className="font-semibold text-gray-900">{trip.time}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Seat</div>
                        <div className="font-semibold text-gray-900">#{trip.seat}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg font-semibold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Confirmed
                    </span>
                    <button className="flex-1 lg:flex-initial bg-[#0077B6] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#005F8E] transition-colors">
                      View Ticket
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Travel Updates</h2>
              <p className="text-sm text-gray-600">Important announcements</p>
            </div>
          </div>

          <div className="space-y-3">
            {announcements.map((announcement: any) => (
              <div
                key={announcement.id}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 ${
                  announcement.type === 'warning' 
                    ? 'border-yellow-200 bg-yellow-50' 
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  announcement.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  {announcement.type === 'warning' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 mb-1">{announcement.title}</div>
                  <div className="text-sm text-gray-700">{announcement.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust & Features */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200 p-6 lg:p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Why Choose SafariTix?</h2>
          <p className="text-gray-600">Your trusted partner for bus travel across Rwanda</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              icon: Shield, 
              title: 'Secure Payments', 
              desc: 'MTN Mobile Money & card payments',
              color: 'blue'
            },
            { 
              icon: Award, 
              title: 'Verified Companies', 
              desc: 'RURA certified operators only',
              color: 'green'
            },
            { 
              icon: Smartphone, 
              title: 'Digital Tickets', 
              desc: 'QR code tickets on your phone',
              color: 'purple'
            },
            { 
              icon: CheckCircle, 
              title: 'Official Routes', 
              desc: 'Government-approved routes',
              color: 'orange'
            },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="text-center">
                <div className={`w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`w-8 h-8 text-${feature.color}-600`} />
                </div>
                <div className="font-bold text-gray-900 mb-1">{feature.title}</div>
                <div className="text-sm text-gray-600">{feature.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ========================================
  // SIDEBAR NAVIGATION
  // ========================================
  const navigationItems = [
    { id: 'shared', label: 'Shared Trips', icon: Search },
    { id: 'bookings', label: 'My Bookings', icon: Ticket },
    { id: 'history', label: 'Trip History', icon: History },
    { id: 'map', label: 'Track Bus', icon: Navigation },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'help', label: 'Help Center', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
        <div className="h-full px-4 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl text-gray-900">SafariTix</span>
          </div>

          <NotificationBell />
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200
        transition-transform duration-300 ease-out z-50
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center shadow-lg">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-black text-lg text-gray-900">SafariTix</div>
              <div className="text-[10px] text-gray-500 font-medium -mt-1">PASSENGER</div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-b border-gray-200">
          <div className="bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{user?.name || 'Passenger'}</div>
                <div className="text-xs text-white/70 truncate">{user?.email || 'passenger@example.com'}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-white/90">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                <span className="font-bold">250 pts</span>
              </div>
              <div className="h-3 w-px bg-white/30"></div>
              <div className="flex items-center gap-1">
                <Ticket className="w-3 h-3" />
                <span className="font-bold">{upcomingTrips.length} active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200 text-sm font-semibold
                  ${activeTab === item.id
                    ? 'bg-[#0077B6] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'shared' && activeTab === item.id && (
                  <Zap className="w-4 h-4" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all text-sm font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {activeTab === 'shared' && renderSharedTripSearch()}
          {activeTab === 'bookings' && (
            <div>
              {/* ── Header ── */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {myTickets.length > 0 ? `${myTickets.length} ticket${myTickets.length !== 1 ? 's' : ''}` : 'Your digital transport tickets'}
                  </p>
                </div>
                <button onClick={fetchMyTickets}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0077B6] text-white rounded-xl text-sm font-semibold hover:bg-[#005F8E] transition-colors shadow-sm">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>

              {/* ── Loading ── */}
              {myTicketsLoading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-[#0077B6]/20 border-t-[#0077B6] animate-spin" />
                  <p className="text-gray-400 font-medium">Loading your tickets…</p>
                </div>
              )}

              {/* ── Error ── */}
              {myTicketsError && !myTicketsLoading && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm font-medium">{myTicketsError}</p>
                </div>
              )}

              {/* ── Empty ── */}
              {!myTicketsLoading && !myTicketsError && myTickets.length === 0 && (
                <div className="text-center py-24">
                  <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
                    <Ticket className="w-9 h-9 text-[#0077B6]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No bookings yet</h3>
                  <p className="text-gray-500 mb-6 max-w-xs mx-auto">Search for a trip and book your seat to see your digital tickets here.</p>
                  <button onClick={() => setActiveTab('shared')}
                    className="px-7 py-3 bg-[#0077B6] text-white rounded-2xl font-bold text-sm hover:bg-[#005F8E] transition-colors shadow-md">
                    Search for a Trip
                  </button>
                </div>
              )}

              {/* ── Tickets Grid ── */}
              {!myTicketsLoading && myTickets.length > 0 && (() => {
                const fmtDate = (d: string) => {
                  if (!d) return '—';
                  const dt = new Date(d);
                  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                };
                const fmtTime = (t: string) => {
                  if (!t) return '—';
                  return String(t).slice(0, 5);
                };
                const statusStyle = (s: string) => {
                  const u = (s || '').toUpperCase();
                  if (u === 'CONFIRMED') return { bg: 'bg-emerald-500', text: 'text-white', dot: 'bg-emerald-300' };
                  if (u === 'BOARDING')  return { bg: 'bg-[#0077B6]',  text: 'text-white', dot: 'bg-blue-300' };
                  if (u === 'COMPLETED') return { bg: 'bg-gray-500',   text: 'text-white', dot: 'bg-gray-300' };
                  if (u === 'CANCELLED') return { bg: 'bg-red-500',    text: 'text-white', dot: 'bg-red-300' };
                  return { bg: 'bg-amber-400', text: 'text-amber-900', dot: 'bg-amber-200' };
                };
                const countdown = (dateStr: string, timeStr: string) => {
                  if (!dateStr || !timeStr) return null;
                  const raw = `${String(dateStr).slice(0, 10)}T${String(timeStr).slice(0, 5)}:00`;
                  const dep = new Date(raw);
                  const now = new Date();
                  const diff = dep.getTime() - now.getTime();
                  if (diff <= 0) return null;
                  const h = Math.floor(diff / 3600000);
                  const m = Math.floor((diff % 3600000) / 60000);
                  if (h > 48) return null;
                  return h > 0 ? `Boarding in ${h}h ${m}m` : `Boarding in ${m}m`;
                };
                const buildQrData = (t: any) => {
                  const id = t.booking_ref || t.id || 'N/A';
                  return `https://safaritix.com/scan/${id}`;
                };
                const canCancel = (t: any) => {
                  const u = (t.status || '').toUpperCase();
                  if (u === 'CANCELLED' || u === 'COMPLETED') return false;
                  if (!t.schedule_date || !t.departure_time) return true;
                  const dep = new Date(`${String(t.schedule_date).slice(0, 10)}T${String(t.departure_time).slice(0, 5)}:00`);
                  return dep.getTime() > Date.now();
                };

                return (
                  <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
                    {myTickets.map((ticket: any) => {
                      const st = statusStyle(ticket.status);
                      const timer = countdown(ticket.schedule_date, ticket.departure_time || ticket.time);
                      const qrData = buildQrData(ticket);
                      const ticketKey = ticket.id || ticket.booking_ref || Math.random();
                      return (
                        <div key={ticketKey}
                          className="bg-white rounded-3xl border border-gray-100 shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow">

                          {/* ── TOP: Route + Status ── */}
                          <div className="bg-gradient-to-r from-[#0077B6] to-[#005F8E] px-5 py-4 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-white font-black text-base leading-tight">
                                <span className="truncate">{ticket.from_stop || '—'}</span>
                                <ArrowRight className="w-4 h-4 shrink-0 opacity-80" />
                                <span className="truncate">{ticket.to_stop || '—'}</span>
                              </div>
                              {timer && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-blue-200 text-xs font-semibold">
                                  <Timer className="w-3 h-3" /> {timer}
                                </div>
                              )}
                            </div>
                            <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase ${st.bg} ${st.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {(ticket.status || 'CONFIRMED').toUpperCase()}
                            </span>
                          </div>

                          {/* ── TORN EDGE ── */}
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-gray-50 rounded-full -translate-x-2 border-r border-gray-100" style={{ marginLeft: '-8px' }} />
                            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
                            <div className="w-4 h-4 bg-gray-50 rounded-full translate-x-2 border-l border-gray-100" style={{ marginRight: '-8px' }} />
                          </div>

                          {/* ── MIDDLE: Details ── */}
                          <div className="px-5 py-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Date</p>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                                  <span className="text-sm font-semibold text-gray-800">{fmtDate(ticket.schedule_date)}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Time</p>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                                  <span className="text-sm font-semibold text-gray-800">{fmtTime(ticket.departure_time || ticket.time || '')}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Seat</p>
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                                  <span className="text-sm font-black text-[#0077B6]">{ticket.seat_number || '—'}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Price</p>
                                <div className="flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span className="text-sm font-black text-gray-900">
                                    {ticket.price != null ? `${Number(ticket.price).toLocaleString()} RWF` : '—'}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Bus</p>
                                <div className="flex items-center gap-1.5">
                                  <Bus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="text-sm font-semibold text-gray-700">{ticket.bus_plate || '—'}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Ticket ID</p>
                                <div className="flex items-center gap-1.5">
                                  <QrCode className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="text-[11px] font-mono text-gray-500 truncate max-w-[110px]">{ticket.booking_ref || ticket.id || '—'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── TORN EDGE ── */}
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-gray-50 rounded-full -translate-x-2 border-r border-gray-100" style={{ marginLeft: '-8px' }} />
                            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
                            <div className="w-4 h-4 bg-gray-50 rounded-full translate-x-2 border-l border-gray-100" style={{ marginRight: '-8px' }} />
                          </div>

                          {/* ── QR CODE — main scan area ── */}
                          <div className="px-5 py-5 flex flex-col items-center gap-3 bg-gray-50/40">
                            <div className="p-3 bg-white rounded-2xl border-2 border-[#0077B6]/20 shadow-md">
                              <QRCodeSVG value={qrData} size={180} level="H"
                                bgColor="#ffffff" fgColor="#0077B6"
                                includeMargin={true} />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scan to Board</p>
                              <p className="text-[11px] font-mono text-gray-400 mt-0.5">{ticket.booking_ref || ticket.id || '—'}</p>
                            </div>
                          </div>

                          {/* ── TORN EDGE ── */}
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-gray-50 rounded-full -translate-x-2 border-r border-gray-100" style={{ marginLeft: '-8px' }} />
                            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
                            <div className="w-4 h-4 bg-gray-50 rounded-full translate-x-2 border-l border-gray-100" style={{ marginRight: '-8px' }} />
                          </div>

                          {/* ── BOTTOM: Action Buttons ── */}
                          <div className="px-5 py-3 bg-gray-50/60 flex flex-wrap items-center gap-2">
                            <button onClick={() => setViewTicket(ticket)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0077B6] text-white text-xs font-bold hover:bg-[#005F8E] transition-colors">
                              <Eye className="w-3.5 h-3.5" /> View Ticket
                            </button>
                            <button
                              onClick={() => {
                                const data = `SafariTix Ticket\n\n${ticket.from_stop} → ${ticket.to_stop}\nDate: ${fmtDate(ticket.schedule_date)}\nTime: ${fmtTime(ticket.departure_time || ticket.time || '')}\nSeat: ${ticket.seat_number}\nBus: ${ticket.bus_plate || '—'}\nTicket ID: ${ticket.booking_ref || ticket.id}\nPrice: ${ticket.price} RWF`;
                                const url = `https://wa.me/?text=${encodeURIComponent(data)}`;
                                window.open(url, '_blank');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">
                              <Share2 className="w-3.5 h-3.5" /> Share
                            </button>
                            {canCancel(ticket) && (
                              <button
                                disabled={cancellingId === (ticket.id || ticket.booking_ref)}
                                onClick={async () => {
                                  const tid = ticket.id || ticket.booking_ref;
                                  if (!confirm('Cancel this ticket?')) return;
                                  setCancellingId(tid);
                                  try {
                                    const res = await fetch(`/api/tickets/${tid}/cancel`, {
                                      method: 'PATCH',
                                      headers: { Authorization: `Bearer ${accessToken}` },
                                    });
                                    if (res.ok) fetchMyTickets();
                                  } catch {}
                                  finally { setCancellingId(null); }
                                }}
                                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                                <XCircle className="w-3.5 h-3.5" />
                                {cancellingId === (ticket.id || ticket.booking_ref) ? 'Cancelling…' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ══ Boarding Pass Modal ══ */}
              {viewTicket && (() => {
                const t = viewTicket;
                const fmtDate = (d: string) => {
                  if (!d) return '—';
                  const dt = new Date(d);
                  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                };
                const fmtTime = (s: string) => s ? String(s).slice(0, 5) : '—';
                const statusColor = (s: string) => {
                  const u = (s || '').toUpperCase();
                  if (u === 'CONFIRMED') return 'text-emerald-400';
                  if (u === 'CANCELLED') return 'text-red-400';
                  if (u === 'COMPLETED') return 'text-gray-400';
                  return 'text-amber-400';
                };
                const qrData = `https://safaritix.com/scan/${t.booking_ref || t.id || 'N/A'}`;
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setViewTicket(null)}>
                    <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                      onClick={e => e.stopPropagation()}>

                      {/* Header strip */}
                      <div className="bg-gradient-to-r from-[#0077B6] to-[#005F8E] px-6 pt-6 pb-8 relative">
                        <button onClick={() => setViewTicket(null)}
                          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                          <X className="w-4 h-4 text-white" />
                        </button>
                        <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase mb-2">
                          <Shield className="w-3.5 h-3.5" /> SafariTix Digital Ticket
                        </div>
                        <div className="text-white text-xl font-black leading-tight">
                          {t.from_stop || '—'}
                        </div>
                        <div className="flex items-center gap-2 my-1">
                          <div className="flex-1 border-t border-dashed border-blue-300/60" />
                          <ArrowRight className="w-4 h-4 text-blue-300" />
                          <div className="flex-1 border-t border-dashed border-blue-300/60" />
                        </div>
                        <div className="text-white text-xl font-black leading-tight">
                          {t.to_stop || '—'}
                        </div>
                        <span className={`mt-3 inline-block text-sm font-black uppercase ${statusColor(t.status)}`}>
                          ● {(t.status || 'CONFIRMED').toUpperCase()}
                        </span>
                      </div>

                      {/* Tear */}
                      <div className="flex items-center bg-white">
                        <div className="w-5 h-5 rounded-full bg-gray-100 -ml-2.5 border border-gray-200" />
                        <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-1" />
                        <div className="w-5 h-5 rounded-full bg-gray-100 -mr-2.5 border border-gray-200" />
                      </div>

                      {/* Body */}
                      <div className="px-6 py-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Passenger', value: t.passenger_name || user?.name || '—', icon: User },
                            { label: 'Seat', value: String(t.seat_number || '—'), icon: CreditCard },
                            { label: 'Date', value: fmtDate(t.schedule_date), icon: Calendar },
                            { label: 'Time', value: fmtTime(t.departure_time || t.time || ''), icon: Clock },
                            { label: 'Bus', value: t.bus_plate || '—', icon: Bus },
                            { label: 'Price', value: t.price != null ? `${Number(t.price).toLocaleString()} RWF` : '—', icon: CreditCard },
                          ].map(({ label, value, icon: Icon }) => (
                            <div key={label}>
                              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">{label}</p>
                              <div className="flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                                <span className="text-sm font-bold text-gray-800">{value}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-1">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Ticket ID</p>
                          <p className="text-xs font-mono text-gray-500 break-all">{t.booking_ref || t.id || '—'}</p>
                        </div>
                      </div>

                      {/* Tear */}
                      <div className="flex items-center bg-white">
                        <div className="w-5 h-5 rounded-full bg-gray-100 -ml-2.5 border border-gray-200" />
                        <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-1" />
                        <div className="w-5 h-5 rounded-full bg-gray-100 -mr-2.5 border border-gray-200" />
                      </div>

                      {/* QR */}
                      <div className="px-6 py-5 flex flex-col items-center gap-2 bg-gray-50/60">
                        <div className="p-4 bg-white rounded-2xl border-2 border-[#0077B6]/20 shadow-md">
                          <QRCodeSVG value={qrData} size={220} level="H"
                            bgColor="#ffffff" fgColor="#0077B6"
                            includeMargin={true} />
                        </div>
                        <p className="text-xs text-gray-400 font-semibold text-center">Show this QR code to the driver when boarding</p>
                        <button onClick={() => setViewTicket(null)}
                          className="mt-2 w-full py-3 bg-[#0077B6] text-white rounded-2xl font-bold text-sm hover:bg-[#005F8E] transition-colors">
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {activeTab === 'history' && (
            <div className="text-center py-20">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Trip History</h3>
              <p className="text-gray-600">View your past trips here</p>
            </div>
          )}
          {activeTab === 'map' && (
            <div className="text-center py-20">
              <Navigation className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Track Bus</h3>
              <p className="text-gray-600">Live bus tracking coming soon</p>
            </div>
          )}
          {activeTab === 'profile' && (
            <AccountSettings />
          )}
          {activeTab === 'help' && (
            <div className="text-center py-20">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Help Center</h3>
              <p className="text-gray-600">Get support and FAQs</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
