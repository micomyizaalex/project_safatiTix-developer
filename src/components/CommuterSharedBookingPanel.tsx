import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TripSearchForm from './TripSearchForm';
import TripResults, { TripResult } from './TripResults';
import SeatSelection from './SeatSelection';
import BookingConfirmation from './BookingConfirmation';

type RouteStop = {
  id: string;
  stop_name: string;
  sequence: number;
};

type SharedRoute = {
  id: string;
  status: string;
  from_location?: string;
  to_location?: string;
};

type Step = 'search' | 'results' | 'seats' | 'confirm' | 'done';

const today = () => new Date().toISOString().slice(0, 10);

const safeJson = async (res: Response) => {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export default function CommuterSharedBookingPanel() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('search');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(today());
  const [trips, setTrips] = useState<TripResult[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripResult | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState('');
  const [stopGraph, setStopGraph] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    let cancelled = false;
    const loadStops = async () => {
      try {
        const routesRes = await fetch('/api/shared/routes?status=active');
        const routesJson = await routesRes.json();
        const routes: SharedRoute[] = Array.isArray(routesJson?.routes) ? routesJson.routes : [];

        const graph: Record<string, Set<string>> = {};
        await Promise.all(routes.map(async (route) => {
          const stopsRes = await fetch(`/api/shared/routes/${route.id}/stops`);
          const stopsJson = await stopsRes.json();
          const stops: RouteStop[] = Array.isArray(stopsJson?.stops)
            ? stopsJson.stops
                .map((stop: any) => ({
                  id: String(stop.id || ''),
                  stop_name: String(stop.stop_name || '').trim(),
                  sequence: Number(stop.sequence || 0)
                }))
                .filter((stop: RouteStop) => stop.stop_name && stop.sequence > 0)
                .sort((a: RouteStop, b: RouteStop) => a.sequence - b.sequence)
            : [];

          if (stops.length < 2 && route.from_location && route.to_location) {
            if (!graph[route.from_location]) graph[route.from_location] = new Set<string>();
            graph[route.from_location].add(route.to_location);
          } else {
            for (let i = 0; i < stops.length; i += 1) {
              const fromStop = stops[i].stop_name;
              if (!graph[fromStop]) graph[fromStop] = new Set<string>();
              for (let j = i + 1; j < stops.length; j += 1) {
                graph[fromStop].add(stops[j].stop_name);
              }
            }
          }
        }));

        if (!cancelled) setStopGraph(graph);
      } catch (e) {
        if (!cancelled) setStopGraph({});
      }
    };

    loadStops();
    return () => {
      cancelled = true;
    };
  }, []);

  const fromOptions = useMemo(
    () => Object.keys(stopGraph).sort((a, b) => a.localeCompare(b)),
    [stopGraph]
  );

  const toOptions = useMemo(() => {
    if (!from || !stopGraph[from]) return [];
    return Array.from(stopGraph[from]).sort((a, b) => a.localeCompare(b));
  }, [from, stopGraph]);

  useEffect(() => {
    if (from && to && !toOptions.includes(to)) setTo('');
  }, [from, to, toOptions]);

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setTrips([]);
    setSelectedTrip(null);
    setSelectedSeat(null);

    if (!from || !to || !date) {
      setError('From, to and travel date are required.');
      return;
    }

    setSearching(true);
    try {
      const qs = new URLSearchParams({ from, to, date });
      const res = await fetch(`/api/search-trips?${qs.toString()}`);
      const json = await safeJson(res);
      if (res.ok && Array.isArray(json?.trips)) {
        setTrips(json.trips);
        setStep('results');
        return;
      }

      // Fallback for older backend that only has /api/shared/* endpoints.
      const routesRes = await fetch('/api/shared/routes?status=active');
      const routesJson = await safeJson(routesRes);
      const routes: SharedRoute[] = Array.isArray(routesJson?.routes) ? routesJson.routes : [];
      const fallbackTrips: TripResult[] = [];

      await Promise.all(routes.map(async (route) => {
        const stopsRes = await fetch(`/api/shared/routes/${route.id}/stops`);
        const stopsJson = await safeJson(stopsRes);
        const stops: RouteStop[] = Array.isArray(stopsJson?.stops)
          ? stopsJson.stops
              .map((stop: any) => ({
                id: String(stop.id || ''),
                stop_name: String(stop.stop_name || '').trim(),
                sequence: Number(stop.sequence || 0)
              }))
              .filter((stop: RouteStop) => stop.stop_name && stop.sequence > 0)
              .sort((a: RouteStop, b: RouteStop) => a.sequence - b.sequence)
          : [];

        const fromIndex = stops.findIndex((stop) => stop.stop_name.toLowerCase() === from.toLowerCase());
        const toIndex = stops.findIndex((stop) => stop.stop_name.toLowerCase() === to.toLowerCase());
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= toIndex) return;

        const searchQs = new URLSearchParams({
          route_id: route.id,
          from_stop: from,
          to_stop: to,
          date
        });
        const legacyRes = await fetch(`/api/shared/schedules/search?${searchQs.toString()}`);
        const legacyJson = await safeJson(legacyRes);
        const legacyTrips = Array.isArray(legacyJson?.schedules) ? legacyJson.schedules : [];

        legacyTrips.forEach((trip: any) => {
          fallbackTrips.push({
            schedule_id: String(trip.schedule_id || ''),
            route_id: String(trip.route_id || route.id),
            bus_id: String(trip.bus_id || ''),
            bus_plate_number: String(trip.plate_number || 'Bus'),
            departure_date: String(trip.date || date),
            departure_time: String(trip.time || ''),
            from_stop: String(trip.from_stop || from),
            to_stop: String(trip.to_stop || to),
            available_seats: Number(trip.available_seats || 0),
            seats_left: Number(trip.available_seats || 0),
            price: Number(trip.price || 0),
            seat_options: Array.isArray(trip.seat_options) ? trip.seat_options : []
          });
        });
      }));

      setTrips(fallbackTrips);
      setStep('results');
    } catch (e: any) {
      setError(e.message || 'Failed to search trips');
    } finally {
      setSearching(false);
    }
  };

  const selectTrip = (trip: TripResult) => {
    setSelectedTrip(trip);
    setSelectedSeat(null);
    setError(null);
    setStep('seats');
  };

  const confirmBooking = async () => {
    if (!selectedTrip || selectedSeat === null) return;
    setError(null);
    setBooking(true);
    try {
      navigate('/dashboard/commuter/payment', {
        state: {
          selectedSeats: [String(selectedSeat)],
          scheduleId: selectedTrip.schedule_id,
          price: Number(selectedTrip.price || 0),
          fromStop: from,
          toStop: to,
          scheduleDetails: {
            routeFrom: from,
            routeTo: to,
            departureTime: selectedTrip.departure_time || selectedTrip.time || new Date().toISOString(),
            scheduleDate: selectedTrip.travel_date || selectedTrip.date || date,
            busPlateNumber: selectedTrip.plate_number || selectedTrip.bus_plate || 'TBA',
            companyName: selectedTrip.company_name || 'SafariTix',
          },
        },
      });
    } catch (e: any) {
      setError(e.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const reset = () => {
    setStep('search');
    setTrips([]);
    setSelectedTrip(null);
    setSelectedSeat(null);
    setPassengerName('');
    setPassengerPhone('');
    setError(null);
    setSuccessRef('');
  };

  return (
    <div className="space-y-4">
      <TripSearchForm
        from={from}
        to={to}
        date={date}
        fromOptions={fromOptions}
        toOptions={toOptions}
        searching={searching}
        error={step === 'search' ? error : null}
        onFromChange={(value) => setFrom(value)}
        onToChange={(value) => setTo(value)}
        onDateChange={(value) => setDate(value)}
        onSearch={runSearch}
      />

      {step === 'results' && (
        <TripResults
          trips={trips}
          onBack={() => setStep('search')}
          onSelectTrip={selectTrip}
        />
      )}

      {step === 'seats' && selectedTrip && (
        <SeatSelection
          trip={selectedTrip}
          from={from}
          to={to}
          selectedSeat={selectedSeat}
          onBack={() => setStep('results')}
          onSeatSelect={(seat) => setSelectedSeat(seat)}
          onContinue={() => setStep('confirm')}
        />
      )}

      {step === 'confirm' && selectedTrip && selectedSeat !== null && (
        <BookingConfirmation
          trip={selectedTrip}
          from={from}
          to={to}
          seatNumber={selectedSeat}
          passengerName={passengerName}
          passengerPhone={passengerPhone}
          booking={booking}
          error={error}
          onPassengerNameChange={(value) => setPassengerName(value)}
          onPassengerPhoneChange={(value) => setPassengerPhone(value)}
          onBack={() => setStep('seats')}
          onConfirm={confirmBooking}
        />
      )}

      {step === 'done' && selectedTrip && selectedSeat !== null && (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h3 className="text-2xl font-black text-[#2B2D42]">Booking Confirmed</h3>
          <p className="mt-2 text-sm text-gray-500">Your ticket is created and ready for payment completion.</p>
          <p className="mt-3 text-sm text-gray-600">Reference: <span className="font-black text-[#0077B6]">{successRef}</span></p>
          <p className="mt-1 text-sm text-gray-600">
            {from} to {to} | Seat {selectedSeat} | {String(selectedTrip.departure_date).slice(0, 10)} {String(selectedTrip.departure_time).slice(0, 5)}
          </p>
          <button
            onClick={reset}
            className="mt-5 rounded-xl bg-[#0077B6] px-5 py-2 text-sm font-bold text-white hover:bg-[#005F8E]"
          >
            Book Another Trip
          </button>
        </div>
      )}
    </div>
  );
}
