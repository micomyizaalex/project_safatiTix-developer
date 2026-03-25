import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bus, Clock3, Gauge, MapPin, Route as RouteIcon } from 'lucide-react';
import PassengerTracking from '../../components/PassengerTracking';
import { useAuth } from '../../components/AuthContext';

type TrackingPayload = {
  success: boolean;
  demo?: boolean;
  booking?: {
    id: string;
    bookingRef?: string;
    status?: string;
    scheduleId?: string;
    busId?: string;
    busPlate?: string;
    from?: string;
    to?: string;
    seat?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    speed?: number | null;
    timestamp?: string;
    source?: string;
    currentLocationLabel?: string;
  };
  calculations?: {
    distanceRemainingKm?: number | null;
    etaMinutes?: number | null;
  };
  error?: string;
};

const formatEta = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return 'Calculating...';
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 1) return '< 1 min';
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export default function TrackBusPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackingPayload | null>(null);

  const bookingFromState = (location.state as any)?.booking || null;

  useEffect(() => {
    if (!bookingId || !accessToken) return;

    let mounted = true;
    let timer: number | null = null;

    const load = async () => {
      try {
        const response = await fetch(`/api/tracking/booking/${bookingId}/location`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load bus tracking');
        }
        if (!mounted) return;
        setData(payload);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load bus tracking');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    timer = window.setInterval(load, 5000);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [bookingId, accessToken]);

  const booking = data?.booking || bookingFromState || null;
  const scheduleId = String(booking?.scheduleId || booking?.schedule_id || '');
  const isConfirmed = String(booking?.status || '').toUpperCase() === 'CONFIRMED';

  const speedText = useMemo(() => {
    const speed = data?.location?.speed;
    if (speed === null || speed === undefined || !Number.isFinite(Number(speed))) return 'N/A';
    return `${Number(speed).toFixed(1)} km/h`;
  }, [data?.location?.speed]);

  const etaText = formatEta(data?.calculations?.etaMinutes);
  const distanceText = Number.isFinite(Number(data?.calculations?.distanceRemainingKm))
    ? `${Number(data?.calculations?.distanceRemainingKm).toFixed(1)} km`
    : 'N/A';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 [font-family:Inter,Roboto,sans-serif]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0077B6]">Live Bus Tracking</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">
            Bus is on the way
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Booking ID: <span className="font-semibold">{bookingId}</span>
            {data?.demo ? ' • Demo simulation mode enabled' : ' • Live GPS mode'}
          </p>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Gauge className="h-4 w-4" />} label="Speed" value={speedText} />
          <StatCard icon={<Clock3 className="h-4 w-4" />} label="ETA" value={etaText} />
          <StatCard icon={<RouteIcon className="h-4 w-4" />} label="Distance Remaining" value={distanceText} />
          <StatCard
            icon={<MapPin className="h-4 w-4" />}
            label="Current Location"
            value={data?.location?.currentLocationLabel || 'On route'}
          />
        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {loading ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading tracking data...</div>
        ) : !booking || !scheduleId ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            Booking details are unavailable. Please open tracking from a confirmed ticket.
          </div>
        ) : !isConfirmed ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            Tracking is only available for confirmed bookings.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <PassengerTracking
              scheduleId={scheduleId}
              ticketId={String(booking?.id || bookingId)}
              routeFrom={booking?.from || bookingFromState?.fromStop}
              routeTo={booking?.to || bookingFromState?.toStop}
              departureTime={undefined}
              autoStart={true}
            />
          </div>
        )}

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Trip Details</h3>
          <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <InfoRow label="Route" value={`${booking?.from || bookingFromState?.fromStop || 'N/A'} -> ${booking?.to || bookingFromState?.toStop || 'N/A'}`} />
            <InfoRow label="Bus Plate" value={booking?.busPlate || bookingFromState?.busPlate || 'N/A'} />
            <InfoRow label="Seat" value={String(booking?.seat || bookingFromState?.seatNumber || 'N/A')} />
            <InfoRow label="Status" value={String(booking?.status || bookingFromState?.status || 'UNKNOWN')} />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#0077B6]">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}

