import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bus, Calendar, Clock, MapPin } from 'lucide-react';
import SeatMap from '../../components/SeatMap';

type TripContext = {
  trip_id: string;
  route?: string;
  from_stop: string;
  to_stop: string;
  departure_time?: string;
  departure_date?: string;
  available_seats?: number;
  capacity?: number;
  price?: number;
  bus_plate?: string;
  company_name?: string;
};

type LocationState = {
  trip?: TripContext;
};

const normalizeDateTime = (date?: string, time?: string) => {
  if (!date || !time) return '';
  const hhmm = String(time).slice(0, 5);
  return `${date}T${hhmm}:00`;
};

export default function SeatMapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const state = (location.state || {}) as LocationState;
  const tripState = state.trip;

  const tripId = (tripState?.trip_id || searchParams.get('trip_id') || '').toString();
  const fromStop = (tripState?.from_stop || searchParams.get('from') || '').toString();
  const toStop = (tripState?.to_stop || searchParams.get('to') || '').toString();

  const departureDate = tripState?.departure_date || '';
  const departureTime = tripState?.departure_time || '';
  const displayDateTime = normalizeDateTime(departureDate, departureTime);

  if (!tripId || !fromStop || !toStop) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Missing seat map context</h1>
          <p className="mt-3 text-sm text-slate-600">
            Trip information is incomplete. Please return to search results and choose Select Seat again.
          </p>
          <button
            onClick={() => navigate('/dashboard/commuter')}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0077B6] px-5 py-2.5 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <MapPin className="h-4 w-4 text-[#0077B6]" /> Route
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">{fromStop} to {toStop}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Calendar className="h-4 w-4 text-[#0077B6]" /> Date
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">{departureDate || 'TBD'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Clock className="h-4 w-4 text-[#0077B6]" /> Time
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">{departureTime || 'TBD'}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Bus className="h-4 w-4 text-[#0077B6]" /> Available
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">
                {(tripState?.available_seats ?? 0)} / {(tripState?.capacity ?? 0)} seats
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <SeatMap
            scheduleId={tripId}
            price={tripState?.price || 0}
            segmentFrom={fromStop}
            segmentTo={toStop}
            scheduleDetails={{
              routeFrom: fromStop,
              routeTo: toStop,
              departureTime: displayDateTime,
              scheduleDate: departureDate || '',
              busPlateNumber: tripState?.bus_plate || 'N/A',
              companyName: tripState?.company_name || 'SafariTix operator',
              fromStop,
              toStop,
              tripId,
              availableSeats: tripState?.available_seats,
              capacity: tripState?.capacity,
            }}
          />
        </section>
      </div>
    </div>
  );
}
