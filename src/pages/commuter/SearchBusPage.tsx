import React, { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock3, MapPin, Search, Ticket } from 'lucide-react';
import { useAuth } from '../../components/AuthContext';

type BusSearchResult = {
  schedule_id: string;
  route_id?: string;
  bus_id?: string;
  bus_plate?: string;
  company_name?: string;
  pickup_stop: string;
  dropoff_stop: string;
  departure_date?: string | null;
  departure_time?: string | null;
  available_seats?: number;
  capacity?: number;
  price?: number;
};

type SearchFormData = {
  from: string;
  to: string;
  date: string;
};

const fieldClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/15';

const buttonClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0077B6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#005F8E] disabled:cursor-not-allowed disabled:opacity-60';

const parseMaybeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const formatCurrency = (value?: number) => {
  if (value === undefined || Number.isNaN(Number(value))) return 'RWF 0';
  return `RWF ${Number(value).toLocaleString()}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'TBD';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (value?: string | null) => {
  if (!value) return 'TBD';
  return String(value).slice(0, 5);
};

function SearchForm({
  form,
  loading,
  onChange,
  onSubmit,
}: {
  form: SearchFormData;
  loading: boolean;
  onChange: (next: SearchFormData) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4 lg:items-end lg:p-5">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">From</span>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={form.from}
            onChange={(event) => onChange({ ...form, from: event.target.value })}
            placeholder="Departure"
            className={`${fieldClassName} pl-9`}
            required
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">To</span>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={form.to}
            onChange={(event) => onChange({ ...form, to: event.target.value })}
            placeholder="Destination"
            className={`${fieldClassName} pl-9`}
            required
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Date</span>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={form.date}
            onChange={(event) => onChange({ ...form, date: event.target.value })}
            className={`${fieldClassName} pl-9`}
            required
          />
        </div>
      </label>

      <button type="submit" disabled={loading} className={`${buttonClassName} w-full`}>
        <Search className="h-4 w-4" />
        {loading ? 'Searching...' : 'Search Buses'}
      </button>
    </form>
  );
}

function ResultCard({ result, onSelect }: { result: BusSearchResult; onSelect: (result: BusSearchResult) => void }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0077B6]">Available bus</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
            {result.pickup_stop} to {result.dropoff_stop}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{result.company_name || 'SafariTix operator'}</p>
        </div>
        <span className="rounded-full bg-[#0077B6]/10 px-3 py-1 text-sm font-semibold text-[#005F8E]">
          {formatCurrency(result.price)}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Departure</p>
          <p className="font-semibold text-slate-800">{formatDate(result.departure_date)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Time</p>
          <p className="font-semibold text-slate-800">{formatTime(result.departure_time)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Available seats</p>
          <p className="font-semibold text-slate-800">
            {result.available_seats ?? 0} / {result.capacity ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onSelect(result)}
          disabled={(result.available_seats ?? 0) <= 0}
          className={buttonClassName}
        >
          <Ticket className="h-4 w-4" />
          {(result.available_seats ?? 0) <= 0 ? 'Sold Out' : 'Select Bus'}
        </button>
      </div>
    </article>
  );
}

function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
      <Clock3 className="mx-auto h-9 w-9 text-slate-400" />
      <h3 className="mt-3 text-lg font-semibold text-slate-900">
        {hasSearched ? 'No buses found' : 'Search for available buses'}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {hasSearched
          ? 'Try changing route names or selecting a different travel date.'
          : 'Enter your route and date to see matching buses.'}
      </p>
    </div>
  );
}

export default function SearchBusPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [form, setForm] = useState<SearchFormData>({
    from: '',
    to: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [results, setResults] = useState<BusSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  const sortedResults = useMemo(() => {
    return [...results].sort((left, right) => {
      const leftStamp = `${left.departure_date || ''} ${left.departure_time || ''}`;
      const rightStamp = `${right.departure_date || ''} ${right.departure_time || ''}`;
      return leftStamp.localeCompare(rightStamp);
    });
  }, [results]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.from || !form.to || !form.date) {
      setError('From, To, and Date are required.');
      return;
    }

    if (form.from.trim().toLowerCase() === form.to.trim().toLowerCase()) {
      setError('From and To cannot be the same.');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const query = new URLSearchParams({
        from: form.from.trim(),
        to: form.to.trim(),
        date: form.date,
      });

      const response = await fetch(`/api/search-trips?${query.toString()}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const payload = await parseMaybeJson(response);

      if (response.ok && (payload?.success === true || Array.isArray(payload?.trips))) {
        const buses = Array.isArray(payload?.trips) ? payload.trips : [];
        const normalized = buses.map((bus: any) => ({
          schedule_id: String(bus.schedule_id || bus.scheduleId || bus.id || ''),
          route_id: bus.route_id || bus.routeId || '',
          bus_id: bus.bus_id || bus.busId || '',
          bus_plate: bus.bus_plate || bus.plate_number || bus.busPlate || '',
          company_name: bus.company_name || bus.companyName || 'SafariTix operator',
          pickup_stop: bus.pickup_stop || bus.from_stop || bus.from || bus.routeFrom || form.from,
          dropoff_stop: bus.dropoff_stop || bus.to_stop || bus.to || bus.routeTo || form.to,
          departure_date: bus.departure_date || bus.date || null,
          departure_time: bus.departure_time || bus.time || null,
          available_seats: Number(bus.available_seats ?? bus.seatsAvailable ?? bus.availableSeats ?? 0),
          capacity: Number(bus.capacity ?? bus.totalSeats ?? bus.seatCapacity ?? 0),
          price: Number(bus.price ?? 0),
        }));

        setResults(normalized.filter((bus: BusSearchResult) => Boolean(bus.schedule_id)));
      } else {
        setResults([]);
        setError(payload?.message || 'Unable to fetch buses right now.');
      }
    } catch {
      setResults([]);
      setError('Network error while searching buses.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBus = (result: BusSearchResult) => {
    const params = new URLSearchParams({
      trip_id: result.schedule_id,
      from: result.pickup_stop,
      to: result.dropoff_stop,
    });

    navigate(`/commuter/seat-map?${params.toString()}`, {
      state: {
        trip: {
          trip_id: result.schedule_id,
          route_id: result.route_id || '',
          from_stop: result.pickup_stop,
          to_stop: result.dropoff_stop,
          departure_time: result.departure_time || '',
          departure_date: result.departure_date || '',
          available_seats: result.available_seats ?? 0,
          capacity: result.capacity ?? 0,
          price: result.price ?? 0,
          bus_plate: result.bus_plate || '',
          company_name: result.company_name || 'SafariTix operator',
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0077B6]">SafariTix</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
            Search Buses
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Find available buses by route and date, then continue to seat selection.
          </p>

          <div className="mt-5">
            <SearchForm form={form} loading={loading} onChange={setForm} onSubmit={handleSearch} />
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 px-4 py-3 text-sm text-[#B32633]">
              {error}
            </div>
          )}
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : sortedResults.length === 0 ? (
            <EmptyState hasSearched={hasSearched} />
          ) : (
            <div className="grid gap-4">
              {sortedResults.map((result) => (
                <ResultCard key={result.schedule_id} result={result} onSelect={handleSelectBus} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
