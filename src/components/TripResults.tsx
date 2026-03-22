import React from 'react';
import { ArrowRight, Bus, Calendar, Clock, Users } from 'lucide-react';

export type TripResult = {
  schedule_id: string;
  route_id: string;
  bus_id: string;
  bus_plate_number: string;
  departure_date: string;
  departure_time: string;
  from_stop: string;
  to_stop: string;
  available_seats: number;
  seats_left: number;
  price: number;
  seat_options?: number[];
};

type Props = {
  trips: TripResult[];
  onBack: () => void;
  onSelectTrip: (trip: TripResult) => void;
};

const fmtMoney = (value: number) => `RWF ${Number(value || 0).toLocaleString()}`;

export default function TripResults({ trips, onBack, onSelectTrip }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-[#2B2D42]">Available Trips</h3>
        <button onClick={onBack} className="text-sm font-semibold text-[#0077B6] hover:underline">
          New search
        </button>
      </div>
      {trips.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <p className="font-semibold text-gray-700">No trips found for that segment and date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div key={`${trip.schedule_id}-${trip.from_stop}-${trip.to_stop}`} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    <span className="text-[#0077B6]">{trip.from_stop}</span>
                    <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[#F4A261]">{trip.to_stop}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{String(trip.departure_date).slice(0, 10)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{String(trip.departure_time).slice(0, 5)}</span>
                    <span className="flex items-center gap-1"><Bus className="h-3.5 w-3.5" />{trip.bus_plate_number || 'Bus'}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{trip.available_seats} seats left</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-green-700">{fmtMoney(trip.price)}</p>
                  <p className="text-xs font-medium text-gray-400">RURA tariff</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => onSelectTrip(trip)}
                  disabled={trip.available_seats <= 0}
                  className="rounded-xl bg-[#0077B6] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#005F8E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Select Trip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
