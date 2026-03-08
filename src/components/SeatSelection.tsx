import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import type { TripResult } from './TripResults';

type Props = {
  trip: TripResult;
  from: string;
  to: string;
  selectedSeat: number | null;
  onBack: () => void;
  onSeatSelect: (seat: number) => void;
  onContinue: () => void;
};

export default function SeatSelection({
  trip,
  from,
  to,
  selectedSeat,
  onBack,
  onSeatSelect,
  onContinue
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seatNumbers, setSeatNumbers] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          schedule_id: trip.schedule_id,
          from,
          to
        });
        const res = await fetch(`/api/available-seats?${qs.toString()}`);
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (!cancelled) setSeatNumbers(Array.isArray(json.seat_numbers) ? json.seat_numbers : []);
          return;
        }

        // Fallback for older backend: use seat options from trip search response
        const fallbackSeats = Array.isArray(trip.seat_options) ? trip.seat_options : [];
        if (fallbackSeats.length > 0) {
          if (!cancelled) setSeatNumbers(fallbackSeats);
          return;
        }

        let message = 'Failed to load seats';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          message = json?.message || message;
        } else {
          const text = await res.text();
          if (text) message = text;
        }
        throw new Error(message);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load seats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [trip.schedule_id, from, to]);

  const hasSelected = useMemo(() => selectedSeat !== null, [selectedSeat]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-black text-[#2B2D42]">Choose Seat</h3>
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700">
          <RotateCcw className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking segment seat availability...
        </div>
      ) : error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : seatNumbers.length === 0 ? (
        <p className="text-sm font-semibold text-red-600">No available seats for this segment.</p>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {seatNumbers.map((seat) => (
              <button
                key={seat}
                onClick={() => onSeatSelect(seat)}
                className={`h-10 rounded-lg border-2 text-xs font-black transition ${
                  selectedSeat === seat
                    ? 'border-[#0077B6] bg-[#0077B6] text-white'
                    : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {seat}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onContinue}
              disabled={!hasSelected}
              className="rounded-xl bg-[#0077B6] px-5 py-2 text-sm font-bold text-white hover:bg-[#005F8E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
}
