import React from 'react';
import { Ban, Bus, Clock3, Eye, Navigation, Ticket } from 'lucide-react';
import { BookingRecord } from '../types';
import { formatCurrency, formatDate, formatTime } from '../utils';
import SeatMapPreview from './SeatMapPreview';

interface BookingCardProps {
  booking: BookingRecord;
  cancelingId: string | null;
  accessToken?: string;
  onViewTicket: (booking: BookingRecord) => void;
  onCancelBooking: (booking: BookingRecord) => void;
  onTrackBus: (booking: BookingRecord) => void;
}

const statusClasses: Record<string, string> = {
  CONFIRMED: 'bg-[#27AE60]/10 text-[#1F8A4C] border-[#27AE60]/30',
  IN_PROGRESS: 'bg-[#0077B6]/10 text-[#005F8E] border-[#0077B6]/30',
  COMPLETED: 'bg-slate-200 text-slate-700 border-slate-300',
  CANCELLED: 'bg-[#E63946]/10 text-[#B32633] border-[#E63946]/30',
  SCHEDULED: 'bg-[#F4A261]/15 text-[#B6692C] border-[#F4A261]/40',
  PENDING: 'bg-[#F4A261]/15 text-[#B6692C] border-[#F4A261]/40',
  UNKNOWN: 'bg-slate-100 text-slate-700 border-slate-300',
};

export default function BookingCard({
  booking,
  cancelingId,
  accessToken,
  onViewTicket,
  onCancelBooking,
  onTrackBus,
}: BookingCardProps) {
  const normalizedStatus = String(booking.status || 'UNKNOWN').toUpperCase();
  const isTrackable = normalizedStatus === 'CONFIRMED' && Boolean(booking.scheduleId);
  const isCanceled = normalizedStatus === 'CANCELLED';
  const trackingHint =
    normalizedStatus !== 'CONFIRMED'
      ? 'Tracking unlocks once this booking is confirmed.'
      : !booking.scheduleId
        ? 'Tracking setup is still pending for this trip.'
        : 'Live tracking is ready for this trip.';
  const trackButtonLabel = isTrackable ? 'Track Bus' : 'Tracking Unavailable';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bus Route</p>
          <h4 className="mt-1 text-xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
            {booking.fromStop} to {booking.toStop}
          </h4>
          <p className="mt-1 text-sm text-slate-500">Ref: {booking.bookingRef || booking.id}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusClasses[normalizedStatus] || statusClasses.UNKNOWN}`}
        >
          {normalizedStatus}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">Date & Time</span>
          <p className="mt-1 font-semibold text-slate-800">{formatDate(booking.scheduleDate)} at {formatTime(booking.departureTime)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">Seat Number</span>
          <p className="mt-1 font-semibold text-slate-800">{booking.seatNumber}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">Fare</span>
          <p className="mt-1 font-semibold text-slate-800">{formatCurrency(booking.fare)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">Bus Plate</span>
          <p className="mt-1 font-semibold text-slate-800">{booking.busPlate}</p>
        </div>
      </div>

      <div className="mt-4">
        <SeatMapPreview
          scheduleId={booking.scheduleId}
          isTrackable={isTrackable}
          trackingHint={trackingHint}
          accessToken={accessToken}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onViewTicket(booking)}
          className="inline-flex items-center gap-2 rounded-full bg-[#0077B6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#005F8E]"
        >
          <Eye className="h-4 w-4" />
          View Ticket
        </button>

        <button
          onClick={() => onCancelBooking(booking)}
          disabled={isCanceled || cancelingId === booking.id}
          className="inline-flex items-center gap-2 rounded-full border border-[#E63946]/40 bg-[#E63946]/10 px-4 py-2 text-sm font-semibold text-[#B32633] transition hover:bg-[#E63946]/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Ban className="h-4 w-4" />
          {cancelingId === booking.id ? 'Canceling...' : 'Cancel Booking'}
        </button>

        <button
          onClick={() => onTrackBus(booking)}
          disabled={!isTrackable}
          title={!isTrackable ? trackingHint : 'Open live bus tracking'}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 enabled:border-[#F4A261]/40 enabled:bg-[#F4A261]/15 enabled:text-[#A76025] enabled:hover:bg-[#F4A261]/25"
        >
          <Navigation className="h-4 w-4" />
          {trackButtonLabel}
        </button>

        <div className="ml-auto hidden items-center gap-1 text-xs text-slate-500 sm:flex">
          <Ticket className="h-3.5 w-3.5" />
          <Clock3 className="h-3.5 w-3.5" />
          <Bus className="h-3.5 w-3.5" />
        </div>
      </div>
    </article>
  );
}
