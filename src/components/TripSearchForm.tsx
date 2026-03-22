import React from 'react';
import { Calendar, MapPin, Search } from 'lucide-react';

type Props = {
  from: string;
  to: string;
  date: string;
  fromOptions: string[];
  toOptions: string[];
  searching: boolean;
  error: string | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSearch: (event: React.FormEvent) => void;
};

export default function TripSearchForm({
  from,
  to,
  date,
  fromOptions,
  toOptions,
  searching,
  error,
  onFromChange,
  onToChange,
  onDateChange,
  onSearch
}: Props) {
  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#0077B6] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/10';

  return (
    <form onSubmit={onSearch} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-[#2B2D42]">Search Trips</h2>
      <p className="mt-1 text-sm text-gray-500">From location, to location, then travel date.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-600">From Location</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0077B6]" />
            <select className={`${inputClass} pl-9`} value={from} onChange={(e) => onFromChange(e.target.value)} required>
              <option value="">Select departure</option>
              {fromOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-600">To Location</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F4A261]" />
            <select
              className={`${inputClass} pl-9`}
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              disabled={!from}
              required
            >
              <option value="">{from ? 'Select destination' : 'Choose departure first'}</option>
              {toOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-600">Travel Date</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="date"
              className={`${inputClass} pl-9`}
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => onDateChange(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={searching || !from || !to || !date}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0077B6] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#005F8E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {searching ? 'Searching...' : 'Search Trips'}
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </form>
  );
}
