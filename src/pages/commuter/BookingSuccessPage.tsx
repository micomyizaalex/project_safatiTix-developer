import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Calendar, Clock, Ticket, User as UserIcon } from 'lucide-react';

type BookingState = {
  bookingId?: string;
  userId?: string;
  from?: string | null;
  to?: string | null;
  seats?: Array<string | number>;
  date?: string | null;
  departureTime?: string | null;
  bus?: string | null;
};

export default function BookingSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as {
    booking?: BookingState;
    tickets?: Array<any>;
    qrCodeUrl?: string | null;
    emailSentTo?: string | null;
  };

  const booking = state.booking || {};
  const tickets = Array.isArray(state.tickets) ? state.tickets : [];
  const qrCodeUrl = state.qrCodeUrl || tickets?.[0]?.qr_code_url || tickets?.[0]?.qrCodeUrl || null;
  const emailSentTo = state.emailSentTo || null;

  const seats = Array.isArray(booking.seats) ? booking.seats : (tickets || []).map((t: any) => t.seat_number || t.seatNumber).filter(Boolean);

  const formatIsoDate = (v?: string | null) => {
    if (!v) return 'Date unavailable';
    const iso = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(iso).toLocaleDateString();
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Date unavailable';
    return d.toLocaleDateString();
  };

  const formatTime = (v?: string | null) => {
    if (!v) return 'N/A';
    const raw = String(v).trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const bookingRef = tickets?.[0]?.bookingRef || tickets?.[0]?.booking_ref || booking.bookingId || '';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div>
          <h1 className="text-white font-black text-lg leading-tight">Booking सफल / Successful</h1>
          <p className="text-gray-400 text-xs">Your ticket is confirmed. QR code is ready for scanning.</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8" style={{ background: 'linear-gradient(135deg, #0077B6 0%, #005F8E 100%)' }}>
              <div className="flex items-center gap-3 text-white">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-black text-xl">Booking Confirmed</div>
                  <div className="text-white/80 text-sm font-semibold mt-1">
                    Ref: <span className="font-mono">{String(bookingRef || '').slice(0, 24)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ticket details */}
                <div className="space-y-4">
                  <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-[#0077B6] font-bold mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>Route</span>
                    </div>
                    <div className="text-gray-900 font-black text-lg">
                      {booking.from || 'N/A'} <span className="text-[#F4A261]">→</span> {booking.to || 'N/A'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-[#0077B6] font-bold mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>Date</span>
                      </div>
                      <div className="text-gray-900 font-black">{formatIsoDate(booking.date)}</div>
                    </div>

                    <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-[#0077B6] font-bold mb-2">
                        <Clock className="w-4 h-4" />
                        <span>Departure</span>
                      </div>
                      <div className="text-gray-900 font-black">{formatTime(booking.departureTime)}</div>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-[#0077B6] font-bold mb-2">
                      <Bus className="w-4 h-4" />
                      <span>Bus</span>
                    </div>
                    <div className="text-gray-900 font-black">{booking.bus || 'N/A'}</div>
                  </div>

                  <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-[#0077B6] font-bold mb-2">
                      <UserIcon className="w-4 h-4" />
                      <span>Seats</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seats?.length ? (
                        seats.map((s, idx) => (
                          <span
                            key={`${s}-${idx}`}
                            className="bg-[#E6F4FB] text-[#0077B6] font-black px-3 py-1 rounded-xl text-sm"
                          >
                            Seat {String(s)}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-600 font-semibold">No seats found</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR code */}
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="text-gray-700 font-black text-base text-center">Scan this QR at boarding</div>
                  <div className="bg-white border border-[#E5E7EB] rounded-3xl p-4 shadow-sm">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="Booking QR Code"
                        className="w-64 h-64 object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center bg-[#FFF7ED] border border-[#F4A261]/40 rounded-3xl">
                        <div className="text-[#92400E] font-bold text-sm text-center px-4">
                          QR code unavailable
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-gray-500 text-xs text-center max-w-sm">
                    This QR contains your booking details for driver scanning/validation.
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                {emailSentTo && (
                  <div className="rounded-2xl bg-[#E6F4FB] px-4 py-3 text-sm font-semibold text-[#005F8E]">
                    Your e-ticket has been sent to {emailSentTo}.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate(`/track-bus/${booking.bookingId || tickets?.[0]?.id || ''}`)}
                    disabled={!booking.bookingId && !tickets?.[0]?.id}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#27AE60] text-white font-black hover:bg-[#1f8a4c] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Track Bus
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/commuter', { state: { tab: 'tickets' } })}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0077B6] text-white font-black hover:bg-[#005F8E] transition-colors"
                  >
                    Go to My Tickets
                  </button>
                </div>

                <button
                  onClick={() => navigate('/dashboard/commuter')}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white text-gray-800 font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

