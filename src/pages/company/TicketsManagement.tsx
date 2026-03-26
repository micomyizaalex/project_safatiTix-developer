import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Filter,
  X,
  Eye,
  Ban,
  CheckCircle,
  Calendar,
  User,
  Phone,
  MapPin,
  DollarSign,
  Clock,
  Bus,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext';

// SafariTix Brand Colors
const COLORS = {
  primary: '#0077B6',
  success: '#27AE60',
  danger: '#E63946',
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

export default function TicketsManagement() {
  const { accessToken } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, dateFilter, routeFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = accessToken || localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        setTickets([]);
        setLoadError('Missing authentication token. Please log in again.');
        return;
      }

      const response = await fetch('/api/company/tickets', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
        const payload = await response.json().catch(() => ({}));
        setTickets([]);
        setLoadError(payload.error || payload.message || `Failed to load tickets (${response.status})`);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setTickets([]);
      setLoadError('Failed to fetch tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.passengerName.toLowerCase().includes(query) ||
          t.passengerPhone.toLowerCase().includes(query) ||
          t.bookingRef.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter((t) => t.scheduleDate === dateFilter);
    }

    // Route filter
    if (routeFilter !== 'all') {
      filtered = filtered.filter((t) => `${t.routeFrom} → ${t.routeTo}` === routeFilter);
    }

    setFilteredTickets(filtered);
  };

  const handleCancelTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to cancel this ticket?')) return;

    try {
      const token = accessToken || localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`/api/company/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        fetchTickets();
        alert(data.message || 'Ticket cancelled successfully');
      } else {
        // Show backend error message (including time restriction)
        alert(data.error || data.message || 'Failed to cancel ticket');
      }
    } catch (error) {
      console.error('Failed to cancel ticket:', error);
      alert('Failed to cancel ticket');
    }
  };

  // Helper function to check if ticket can be cancelled (10-minute rule)
  const canCancelTicket = (ticket: TicketData): { canCancel: boolean; reason?: string } => {
    // Already cancelled or checked in
    if (ticket.status === 'CANCELLED' || ticket.status === 'CHECKED_IN') {
      return { canCancel: false, reason: 'Ticket already processed' };
    }

    // Check departure time
    if (!ticket.departureTime || !ticket.scheduleDate) {
      return { canCancel: true }; // Allow if time not set
    }

    // Combine date and time to get full departure datetime
    const departureDateTimeStr = `${ticket.scheduleDate}T${ticket.departureTime}`;
    const departureTime = new Date(departureDateTimeStr);
    const now = new Date();
    const timeDiffMinutes = (departureTime.getTime() - now.getTime()) / (1000 * 60);

    if (timeDiffMinutes < 10) {
      const minutesRemaining = Math.max(0, Math.round(timeDiffMinutes));
      return { 
        canCancel: false, 
        reason: `Cannot cancel: departure in ${minutesRemaining} minute(s). Must be at least 10 minutes before departure.` 
      };
    }

    return { canCancel: true };
  };

  const handleMarkCompleted = async (ticketId: string) => {
    try {
      const token = accessToken || localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(`/api/company/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CHECKED_IN' }),
      });

      if (response.ok) {
        fetchTickets();
        alert('Ticket marked as completed');
      } else {
        const error = await response.json();
        alert(`Failed to update ticket: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update ticket:', error);
      alert('Failed to update ticket');
    }
  };

  const handleViewDetails = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  // Calculate summary stats
  const totalTickets = tickets.length;
  const confirmedTickets = tickets.filter((t) => {
    const status = String(t.status || '').toUpperCase();
    return status === 'CONFIRMED' || status === 'CHECKED_IN';
  }).length;
  const cancelledTickets = tickets.filter((t) => String(t.status || '').toUpperCase() === 'CANCELLED').length;
  const today = new Date().toISOString().split('T')[0];
  const todayTickets = tickets.filter((t) => t.scheduleDate === today).length;

  // Get unique routes for filter
  const routes = Array.from(new Set(tickets.map((t) => `${t.routeFrom} → ${t.routeTo}`))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-['Montserrat'] font-bold text-[#2B2D42] mb-2">
          Tickets Management
        </h1>
        <p className="text-gray-600">View, filter, and manage all ticket bookings</p>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Total Tickets" value={totalTickets} icon={Ticket} color={COLORS.primary} />
        <SummaryCard title="Confirmed" value={confirmedTickets} icon={CheckCircle} color={COLORS.success} />
        <SummaryCard title="Cancelled" value={cancelledTickets} icon={Ban} color={COLORS.danger} />
        <SummaryCard title="Today's Tickets" value={todayTickets} icon={Calendar} color={COLORS.primary} />
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or booking ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent appearance-none"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
              <option value="checked_in">Checked In</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent"
            />
          </div>

          {/* Route Filter */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077B6] focus:border-transparent appearance-none"
            >
              <option value="all">All Routes</option>
              {routes.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || statusFilter !== 'all' || dateFilter || routeFilter !== 'all') && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Search: {searchQuery}
                <X
                  className="w-4 h-4 cursor-pointer"
                  onClick={() => setSearchQuery('')}
                />
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Status: {statusFilter}
                <X
                  className="w-4 h-4 cursor-pointer"
                  onClick={() => setStatusFilter('all')}
                />
              </span>
            )}
            {dateFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Date: {dateFilter}
                <X
                  className="w-4 h-4 cursor-pointer"
                  onClick={() => setDateFilter('')}
                />
              </span>
            )}
            {routeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Route: {routeFilter}
                <X
                  className="w-4 h-4 cursor-pointer"
                  onClick={() => setRouteFilter('all')}
                />
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDateFilter('');
                setRouteFilter('all');
              }}
              className="text-sm text-[#0077B6] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Passenger
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0077B6]"></div>
                      <span className="ml-3">Loading tickets...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No tickets found</p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ticket.bookingRef}</div>
                      <div className="text-xs text-gray-500">{ticket.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{ticket.passengerName}</div>
                          <div className="text-xs text-gray-500">{ticket.passengerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.passengerPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{`${ticket.routeFrom} → ${ticket.routeTo}`}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.scheduleDate || '—'}</div>
                      <div className="text-xs text-gray-500">{ticket.departureTime || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {ticket.seatNumber || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        RWF {ticket.price.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {ticket.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.status === 'CONFIRMED' || ticket.status === 'CHECKED_IN'
                            ? 'bg-green-100 text-green-800'
                            : ticket.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(ticket)}
                          className="text-[#0077B6] hover:text-[#005F8E] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {ticket.status !== 'CANCELLED' && ticket.status !== 'CHECKED_IN' && (
                          <button
                            onClick={() => handleMarkCompleted(ticket.id)}
                            className="text-[#27AE60] hover:text-green-700 transition-colors"
                            title="Mark as Completed"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {(() => {
                          const cancelCheck = canCancelTicket(ticket);
                          return (
                            <button
                              onClick={() => cancelCheck.canCancel && handleCancelTicket(ticket.id)}
                              className={`transition-colors ${
                                cancelCheck.canCancel
                                  ? 'text-[#E63946] hover:text-red-700 cursor-pointer'
                                  : 'text-gray-300 cursor-not-allowed'
                              }`}
                              title={cancelCheck.reason || 'Cancel Ticket'}
                              disabled={!cancelCheck.canCancel}
                            >
                              <Ban className="w-5 h-5" />
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {showDetailsModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-['Montserrat'] font-bold text-[#2B2D42]">
                Ticket Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Booking Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  Booking Information
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Booking Reference</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedTicket.bookingRef}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ticket ID</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedTicket.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Booked At</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(selectedTicket.bookedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        selectedTicket.status === 'CONFIRMED' || selectedTicket.status === 'CHECKED_IN'
                          ? 'bg-green-100 text-green-800'
                          : selectedTicket.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passenger Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Passenger Information
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{selectedTicket.passengerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{selectedTicket.passengerPhone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{selectedTicket.passengerEmail}</span>
                  </div>
                </div>
              </div>

              {/* Trip Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Trip Information
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Route</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedTicket.routeFrom} → {selectedTicket.routeTo}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Departure Date</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedTicket.scheduleDate || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Departure Time</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedTicket.departureTime || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Seat Number</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedTicket.seatNumber || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Bus Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Bus className="w-4 h-4" />
                  Bus Information
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Plate Number</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedTicket.busPlateNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bus Model</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedTicket.busModel || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment Information
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Total Price</p>
                    <p className="text-lg font-bold text-[#27AE60]">RWF {selectedTicket.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Status</p>
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        selectedTicket.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedTicket.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              {selectedTicket.qrCode && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">QR Code</h4>
                  <div className="bg-gray-50 p-4 rounded-lg flex justify-center">
                    <img src={selectedTicket.qrCode} alt="Ticket QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              {selectedTicket.status !== 'CANCELLED' && selectedTicket.status !== 'CHECKED_IN' && (
                <button
                  onClick={() => {
                    handleMarkCompleted(selectedTicket.id);
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Mark as Completed
                </button>
              )}
              {(() => {
                const cancelCheck = canCancelTicket(selectedTicket);
                return (
                  <button
                    onClick={() => {
                      if (cancelCheck.canCancel) {
                        handleCancelTicket(selectedTicket.id);
                        setShowDetailsModal(false);
                      } else {
                        alert(cancelCheck.reason || 'Cannot cancel this ticket');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      cancelCheck.canCancel
                        ? 'bg-[#E63946] text-white hover:bg-red-700 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!cancelCheck.canCancel}
                    title={cancelCheck.reason || 'Cancel Ticket'}
                  >
                    Cancel Ticket
                  </button>
                );
              })()}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <p className="text-3xl font-['Montserrat'] font-bold text-[#2B2D42]">{value}</p>
      </div>
    </div>
  );
}
