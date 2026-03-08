import React from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { TripResult } from './TripResults';

type Props = {
  trip: TripResult;
  from: string;
  to: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  booking: boolean;
  error: string | null;
  onPassengerNameChange: (value: string) => void;
  onPassengerPhoneChange: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
};

const fmtMoney = (value: number) => `RWF ${Number(value || 0).toLocaleString()}`;

export default function BookingConfirmation({
  trip,
  from,
  to,
  seatNumber,
  passengerName,
  passengerPhone,
  booking,
  error,
  onPassengerNameChange,
  onPassengerPhoneChange,
  onBack,
  onConfirm
}: Props) {
  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/10';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-black text-[#2B2D42]">Confirm Booking</h3>
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700">
          <RotateCcw className="h-3.5 w-3.5" /> Back
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
        <p className="font-bold text-gray-800">
          <span className="text-[#0077B6]">{from}</span>
          <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-gray-400" />
          <span className="text-[#F4A261]">{to}</span>
        </p>
        <p className="mt-1 text-gray-600">Bus: {trip.bus_plate_number || 'N/A'}</p>
        <p className="text-gray-600">Departure: {String(trip.departure_date).slice(0, 10)} {String(trip.departure_time).slice(0, 5)}</p>
        <p className="text-gray-600">Seat: #{seatNumber}</p>
        <p className="mt-2 text-base font-black text-green-700">{fmtMoney(trip.price)}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-gray-600">Passenger Name</label>
          <input
            className={inputClass}
            value={passengerName}
            onChange={(e) => onPassengerNameChange(e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-gray-600">Phone Number</label>
          <input
            className={inputClass}
            value={passengerPhone}
            onChange={(e) => onPassengerPhoneChange(e.target.value)}
            placeholder="+250..."
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button
          onClick={onConfirm}
          disabled={booking || !passengerName.trim()}
          className="rounded-xl bg-[#0077B6] px-5 py-2 text-sm font-bold text-white hover:bg-[#005F8E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {booking ? 'Processing...' : 'Pay with Mobile Money & Confirm'}
        </button>
      </div>
    </div>
  );
}
