import React from 'react';
import { BookingFilter, BookingRecord } from '../types';
import BookingCard from './BookingCard';

interface BookingListProps {
  bookings: BookingRecord[];
  loading: boolean;
  activeFilter: BookingFilter;
  cancelingId: string | null;
  accessToken?: string;
  onFilterChange: (filter: BookingFilter) => void;
  onViewTicket: (booking: BookingRecord) => void;
  onCancelBooking: (booking: BookingRecord) => void;
  onTrackBus: (booking: BookingRecord) => void;
}

const FILTERS: Array<{ label: string; value: BookingFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Past', value: 'past' },
  { label: 'Canceled', value: 'canceled' },
];

export default function BookingList({
  bookings,
  loading,
  activeFilter,
  cancelingId,
  accessToken,
  onFilterChange,
  onViewTicket,
  onCancelBooking,
  onTrackBus,
}: BookingListProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">My Bookings</h3>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onFilterChange(filter.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                activeFilter === filter.value
                  ? 'bg-[#0077B6] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((skeleton) => (
            <div key={skeleton} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No bookings found for this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              cancelingId={cancelingId}
              accessToken={accessToken}
              onViewTicket={onViewTicket}
              onCancelBooking={onCancelBooking}
              onTrackBus={onTrackBus}
            />
          ))}
        </div>
      )}
    </section>
  );
}
