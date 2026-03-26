import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  MapPin, Bus, Calendar, Ticket, Plus, Edit2, ChevronDown,
  ChevronRight, ArrowRight, Loader2, X, CheckCircle2, AlertTriangle,
  RefreshCw, Clock, Users, Filter, RotateCcw, Search, DollarSign,
} from 'lucide-react';
import { DEFAULT_PLAN_PERMISSIONS, hasPlanFeature, type PlanPermissions, type SubscriptionPlan } from '../utils/subscriptionPlans';

// ─── Types ────────────────────────────────────────────────────────────────────

type Stop = { id: string; stop_name: string; sequence: number };

type SharedRoute = {
  id: string;
  from_location: string;
  to_location: string;
  price: number;
  effective_date: string;
  status: string;
  stops: Stop[];
};

type RuraRoute = {
  id: string;
  from_location: string;
  to_location: string;
  price: number;
  effective_date: string;
  source_document?: string;
  status: string;
  created_at?: string;
};

type BusRecord = {
  id: string;
  plateNumber?: string;
  plate_number?: string;
  capacity: number;
  status?: string;
};

type SharedSchedule = {
  schedule_id: string;
  bus_id: string;
  route_id: string;
  date: string;
  time: string;
  capacity: number;
  status: string;
  plate_number: string;
  bus_status: string;
  from_location: string;
  to_location: string;
  price: number;
};

type CompanyTicket = {
  id?: string;
  ticket_id?: string;
  booking_ref?: string;
  bookingRef?: string;
  schedule_id?: string;
  scheduleId?: string;
  seat_number?: string | number;
  seatNumber?: string | number;
  from_stop?: string;
  to_stop?: string;
  routeFrom?: string;
  routeTo?: string;
  passenger_name?: string;
  passengerName?: string;
  price?: number;
  status?: string;
  created_at?: string;
  createdAt?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = (path: string) => `/api/company/${path}`;
const fmtRwf = (n: number) => `RWF ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: string) => (d ? String(d).slice(0, 10) : '—');
const fmtTime = (t: string) => (t ? String(t).slice(0, 5) : '—');
const authHeaders = () => {
  const tok = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
  };
};
const statusBadge = (s: string) => {
  const l = (s || '').toLowerCase();
  if (l === 'scheduled')   return 'bg-blue-100 text-blue-700 border-blue-200';
  if (l === 'active')      return 'bg-green-100 text-green-700 border-green-200';
  if (l === 'in_progress') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (l === 'completed')   return 'bg-gray-100 text-gray-600 border-gray-200';
  if (l === 'cancelled')   return 'bg-red-100 text-red-600 border-red-200';
  if (l === 'inactive')    return 'bg-gray-100 text-gray-500 border-gray-200';
  if (l === 'confirmed')   return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

const ticketPassenger = (t: CompanyTicket) => t.passenger_name || t.passengerName || '';
const ticketBookingRef = (t: CompanyTicket) => t.booking_ref || t.bookingRef || '';
const ticketSeat = (t: CompanyTicket) => t.seat_number ?? t.seatNumber ?? '';
const ticketFrom = (t: CompanyTicket) => t.from_stop || t.routeFrom || '';
const ticketTo = (t: CompanyTicket) => t.to_stop || t.routeTo || '';
const ticketCreatedAt = (t: CompanyTicket) => t.created_at || t.createdAt || '';

// ─── Stop Chain ──────────────────────────────────────────────────────────────

function StopChain({ stops }: { stops: Stop[] }) {
  const ordered = useMemo(() => [...stops].sort((a, b) => a.sequence - b.sequence), [stops]);
  if (!ordered.length) return <span className="text-xs text-gray-400 italic">No stops configured</span>;
  return (
    <div className="flex flex-wrap items-center gap-0">
      {ordered.map((s, i) => (
        <React.Fragment key={s.id || s.sequence}>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 whitespace-nowrap">
            {s.stop_name}
          </span>
          {i < ordered.length - 1 && <ArrowRight className="w-3 h-3 mx-0.5 text-gray-400 shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Stops Preview (lazy-fetch per route card) ────────────────────────────────

function StopsPreview({ routeId, version = 0 }: { routeId: string; version?: number }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fetchErr, setFetchErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false); setFetchErr(false);
    fetch(`/api/rura_routes/${routeId}/stops`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => { if (!cancelled) { setStops(j.stops || []); setLoaded(true); } })
      .catch(() => { if (!cancelled) { setFetchErr(true); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [routeId, version]);

  if (!loaded) return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <Loader2 className="w-3 h-3 animate-spin" /> Loading stops…
    </div>
  );

  if (fetchErr) return (
    <div className="text-xs space-y-0.5">
      <p className="font-semibold text-red-500">Could not load stops</p>
      <p className="text-gray-400">Check your connection or refresh the page.</p>
    </div>
  );

  if (!stops.length) return (
    <div className="text-xs space-y-0.5">
      <p className="font-semibold text-amber-600">No stops configured</p>
      <p className="text-gray-400">Configure stops to enable segment-based seat booking.</p>
    </div>
  );

  const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-gray-700">{ordered.length} stops</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">{ordered.length - 1} segment{ordered.length !== 2 ? 's' : ''}</span>
      </div>
      <StopChain stops={ordered} />
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ msg, onDismiss }: { msg: { type: 'ok' | 'err'; text: string }; onDismiss: () => void }) {
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border
      ${msg.type === 'ok' ? 'bg-white border-green-200 text-green-800' : 'bg-white border-red-200 text-red-800'}`}>
      {msg.type === 'ok'
        ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
        : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
      <span className="font-semibold text-sm max-w-xs">{msg.text}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Filter Chip ─────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-blue-50 text-[#0077B6] border border-blue-200 rounded-full text-xs font-semibold">
      {label}
      <button onClick={onRemove} className="p-0.5 hover:bg-blue-200 rounded-full transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ─── Stop Combobox ─────────────────────────────────────────────────────────

function StopCombobox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep query in sync when external value changes
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value); // revert unsaved query back to last confirmed value
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === '' ? options : options.filter(o => o.toLowerCase().includes(q));
  }, [query, options]);

  const select = (opt: string) => { onChange(opt); setQuery(opt); setOpen(false); };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10"
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-gray-400 italic">No matching RURA locations</p>
          ) : (
            filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onMouseDown={e => { e.preventDefault(); select(opt); }}
                className={`w-full text-left px-3 py-2 text-sm leading-tight transition-colors ${
                  opt === value
                    ? 'bg-blue-50 font-semibold text-[#0077B6]'
                    : 'hover:bg-gray-50 text-gray-800'
                }`}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stop Editor Modal ───────────────────────────────────────────────────────

type StopEditorProps = { route: SharedRoute; onClose: () => void; onSaved: () => void };

function StopEditorModal({ route, onClose, onSaved }: StopEditorProps) {
  const initial = useMemo(() =>
    [...(route.stops || [])].sort((a, b) => a.sequence - b.sequence).map(s => s.stop_name),
    [route.stops],
  );
  // Pre-fill origin/destination from the route when no stops have been saved yet
  const [items, setItems] = useState<string[]>(
    initial.length ? initial : [route.from_location, route.to_location],
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  // Drag-and-drop state
  const dragSrcRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Fetch all official RURA stop locations on mount
  useEffect(() => {
    fetch('/api/rura_routes/locations', { headers: authHeaders() })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const all = Array.from(
            new Set([...(j.fromLocations as string[] || []), ...(j.toLocations as string[] || [])]),
          ).sort((a, b) => (a as string).localeCompare(b as string)) as string[];
          setLocationOptions(all);
        }
      })
      .catch(() => {});
  }, []);

  const update = (i: number, v: string) => setItems(p => p.map((x, idx) => idx === i ? v : x));
  const add = () => setItems(p => [...p, '']);
  const rem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const moveUp = (i: number) => setItems(p => {
    const a = [...p]; if (i <= 0) return a;
    [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a;
  });
  const moveDown = (i: number) => setItems(p => {
    const a = [...p]; if (i >= a.length - 1) return a;
    [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a;
  });

  const handleDragStart = (_e: React.DragEvent, i: number) => { dragSrcRef.current = i; };
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop = (_e: React.DragEvent, i: number) => {
    const src = dragSrcRef.current;
    if (src === null || src === i) { setDragOverIdx(null); return; }
    setItems(p => {
      const a = [...p];
      const [moved] = a.splice(src, 1);
      a.splice(i, 0, moved);
      return a;
    });
    dragSrcRef.current = null;
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { dragSrcRef.current = null; setDragOverIdx(null); };

  // Live segment derivation — only from non-empty stops
  const segments = useMemo(() => {
    const valid = items.map(s => s.trim()).filter(Boolean);
    const segs: [string, string][] = [];
    for (let i = 0; i < valid.length - 1; i++) segs.push([valid[i], valid[i + 1]]);
    return segs;
  }, [items]);

  const validCount = items.filter(s => s.trim()).length;

  const save = async () => {
    const final = items.map(s => s.trim()).filter(Boolean);
    if (final.length < 2) { setErr('At least 2 stops required'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch(API(`shared/routes/${route.id}/stops`), {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ stops: final.map((name, idx) => ({ stop_name: name, sequence: idx + 1 })) }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Failed to save'); }
      onSaved(); onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div>
            <h3 className="text-lg font-black text-gray-900">Manage Stops &amp; Segments</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {route.from_location} → {route.to_location}
              {validCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-[#0077B6] font-bold">
                  {validCount} stops · {segments.length} segments
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

          {/* LEFT — Stops editor */}
          <div className="p-6 space-y-2 max-h-[55vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#0077B6]" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">Ordered Stops</h4>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Select stops from official RURA locations. Drag rows to reorder.
            </p>
            {items.map((item, i) => (
              <div
                key={i}
                draggable
                onDragStart={e => handleDragStart(e, i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 rounded-lg p-0.5 transition-colors ${
                  dragOverIdx === i ? 'bg-blue-50 ring-2 ring-[#0077B6]/30' : ''
                }`}
              >
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-gray-400 w-5 text-right font-mono">{i + 1}</span>
                  <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500" title="Drag to reorder">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                  </div>
                </div>
                <StopCombobox
                  value={item}
                  onChange={v => update(i, v)}
                  options={locationOptions}
                  placeholder={
                    i === 0 ? `Origin — e.g. ${route.from_location}`
                    : i === items.length - 1 ? `Destination — e.g. ${route.to_location}`
                    : `Intermediate stop ${i}`
                  }
                />
                <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 shrink-0" title="Move up">
                  <ChevronDown className="w-3.5 h-3.5 rotate-180 text-gray-500" />
                </button>
                <button onClick={() => moveDown(i)} disabled={i === items.length - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 shrink-0" title="Move down">
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <button onClick={() => rem(i)} disabled={items.length <= 2} className="p-1.5 rounded hover:bg-red-50 disabled:opacity-30 shrink-0" title="Remove">
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
            <button onClick={add} className="mt-2 flex items-center gap-1.5 text-xs text-[#0077B6] font-semibold hover:underline">
              <Plus className="w-3.5 h-3.5" /> Add stop
            </button>
            {err && <p className="text-xs text-red-600 font-semibold mt-1">{err}</p>}
          </div>

          {/* RIGHT — Segments preview */}
          <div className="p-6 max-h-[55vh] overflow-y-auto bg-gray-50/60">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <ArrowRight className="w-3.5 h-3.5 text-green-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">Auto-Generated Segments</h4>
            </div>

            {segments.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <ArrowRight className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No segments yet</p>
                <p className="text-xs text-gray-400 mt-1">Add at least 2 stops on the left to preview generated segments.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                  Each segment allows independent seat availability tracking and fare calculation.
                  Passengers can book any origin→destination pair along the route.
                </p>
                {segments.map(([from, to], i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <span className="w-5 h-5 rounded-full bg-[#0077B6] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-sm text-gray-800 truncate flex-1 min-w-0">{from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                    <span className="font-semibold text-sm text-gray-800 truncate flex-1 min-w-0">{to}</span>
                  </div>
                ))}
                <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-800 font-semibold">
                    {segments.length} segment{segments.length !== 1 ? 's' : ''} will be available for booking.
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Seats are tracked independently per segment, enabling partial-route bookings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-t bg-gray-50/50 rounded-b-2xl">
          <p className="text-xs text-gray-400">
            {validCount > 0
              ? `${validCount} stop${validCount !== 1 ? 's' : ''} · ${segments.length} segment${segments.length !== 1 ? 's' : ''} will be saved`
              : 'Select at least 2 stops to enable route segment booking'}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving || validCount < 2}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0077B6] text-white rounded-xl text-sm font-bold hover:bg-[#005F8E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? 'Saving…' : `Save ${validCount > 0 ? validCount : ''} Stop${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Occupancy Bar ───────────────────────────────────────────────────────────

function OccupancyBar({ occupied, capacity }: { occupied: number; capacity: number }) {
  const pct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
  const col = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{occupied}/{capacity} booked</span>
    </div>
  );
}
const normalizeScheduleId = (value: unknown): string => String(value ?? '').trim();

// ─── Create Schedule Form ────────────────────────────────────────────────────

function CreateScheduleForm({
  routes, buses, onCreate, onToast, canCreateSchedules, subscriptionPlan,
}: {
  routes: RuraRoute[];
  buses: BusRecord[];
  onCreate: () => void;
  onToast: (type: 'ok' | 'err', text: string) => void;
  canCreateSchedules: boolean;
  subscriptionPlan: SubscriptionPlan;
}) {
  const [form, setForm] = useState({ route_id: '', bus_id: '', date: '', time: '', capacity: '' });
  const [saving, setSaving] = useState(false);
  const fld = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10 bg-white';

  const selectedRoute = useMemo(() => routes.find(r => r.id === form.route_id) ?? null, [routes, form.route_id]);
  const selectedBus   = useMemo(() => buses.find(b => b.id === form.bus_id)     ?? null, [buses,  form.bus_id]);
  const effectiveCap  = form.capacity ? Number(form.capacity) : (selectedBus?.capacity ?? 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateSchedules) {
      onToast('err', 'Shared route scheduling requires the Growth or Enterprise plan');
      return;
    }
    if (!form.route_id || !form.bus_id || !form.date || !form.time) {
      onToast('err', 'Route, bus, date and departure time are required'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(API('shared/schedules'), {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          route_id: form.route_id, bus_id: form.bus_id,
          date: form.date, time: form.time,
          ...(form.capacity ? { capacity: Number(form.capacity) } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to create schedule');
      const routeLabel = selectedRoute
        ? `${selectedRoute.from_location} → ${selectedRoute.to_location}`
        : 'selected route';
      onToast('ok', `✓ Schedule created: ${routeLabel} on ${form.date} at ${form.time}`);
      setForm({ route_id: '', bus_id: '', date: '', time: '', capacity: '' });
      onCreate();
    } catch (e: any) { onToast('err', e.message); }
    finally { setSaving(false); }
  };

  const activeRoutes = routes.filter(r => r.status === 'active');
  const activeBuses  = buses.filter(b => (b.status || '').toLowerCase() === 'active');

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Plus className="w-4 h-4 text-[#0077B6]" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Create New Schedule</h3>
          <p className="text-xs text-gray-500">Assign a bus to a route for a specific date & departure time</p>
        </div>
      </div>

      {!canCreateSchedules && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-bold">Shared route scheduling is locked on the {subscriptionPlan} plan.</div>
          <div className="mt-1 text-amber-800">Upgrade to Growth or Enterprise to create shared-route schedules.</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Route *</label>
          <select value={form.route_id} onChange={e => setForm(p => ({ ...p, route_id: e.target.value }))} className={fld} required>
            <option value="">— Select route —</option>
            {activeRoutes.length === 0 && (
              <option disabled value="">No active routes available</option>
            )}
            {activeRoutes.map(r => (
              <option key={r.id} value={r.id}>
                {r.from_location} → {r.to_location} · RWF {Number(r.price).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Bus *</label>
          <select value={form.bus_id} onChange={e => setForm(p => ({ ...p, bus_id: e.target.value }))} className={fld} required>
            <option value="">— Select active bus —</option>
            {activeBuses.length === 0 && (
              <option disabled value="">No active buses available</option>
            )}
            {activeBuses.map(b => (
              <option key={b.id} value={b.id}>
                {b.plateNumber || b.plate_number} ({b.capacity} seats)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Date *</label>
          <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={fld} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Departure *</label>
          <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className={fld} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Override Capacity</label>
          <input type="number" min={1} max={200} placeholder={selectedBus ? `Default: ${selectedBus.capacity}` : 'Bus default'}
            value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className={fld} />
        </div>
      </div>

      {/* Preview strip */}
      {(selectedRoute || selectedBus || form.date || form.time) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          {selectedRoute && (
            <span className="flex items-center gap-1.5 font-semibold text-[#0077B6]">
              <MapPin className="w-3.5 h-3.5" />
              {selectedRoute.from_location} → {selectedRoute.to_location}
              <span className="ml-1 text-green-700 font-bold">{fmtRwf(selectedRoute.price)}</span>
            </span>
          )}
          {selectedBus && (
            <span className="flex items-center gap-1.5 text-gray-700">
              <Bus className="w-3.5 h-3.5 text-gray-400" />
              {selectedBus.plateNumber || selectedBus.plate_number}
              <span className="text-gray-500">· {effectiveCap} seats</span>
            </span>
          )}
          {form.date && (
            <span className="flex items-center gap-1.5 text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {form.date}
            </span>
          )}
          {form.time && (
            <span className="flex items-center gap-1.5 text-gray-700">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {form.time}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {activeRoutes.length} active route{activeRoutes.length !== 1 ? 's' : ''} · {activeBuses.length} active bus{activeBuses.length !== 1 ? 'es' : ''} available
        </div>
        <button type="submit" disabled={saving || !canCreateSchedules || !form.route_id || !form.bus_id || !form.date || !form.time}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0077B6] text-white rounded-xl text-sm font-bold hover:bg-[#005F8E] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Creating…' : 'Create Schedule'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'routes' | 'schedules' | 'tickets';

export default function CompanySharedRoutesSection({
  planPermissions = DEFAULT_PLAN_PERMISSIONS,
  subscriptionPlan = 'Starter',
}: {
  planPermissions?: PlanPermissions;
  subscriptionPlan?: SubscriptionPlan;
}) {
  const [tab, setTab]             = useState<Tab>('routes');
  const [routes,    setRoutes]    = useState<SharedRoute[]>([]);
  const [buses,     setBuses]     = useState<BusRecord[]>([]);
  const [schedules, setSchedules] = useState<SharedSchedule[]>([]);
  const [tickets,   setTickets]   = useState<CompanyTicket[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editRoute, setEditRoute] = useState<SharedRoute | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stopsVersion, setStopsVersion] = useState(0);

  // RURA routes (direct from rura_routes table)
  const [ruraRoutes,      setRuraRoutes]      = useState<RuraRoute[]>([]);
  const [ruraLoading,     setRuraLoading]     = useState(false);
  const [ruraSearch,      setRuraSearch]      = useState('');
  const [ruraStatusFilter, setRuraStatusFilter] = useState<'all'|'active'|'inactive'>('all');

  // Smart filter state (Routes tab)
  const [ruraOriginFilter, setRuraOriginFilter] = useState('');
  const [ruraDestFilter,   setRuraDestFilter]   = useState('');
  const [fareMin,          setFareMin]          = useState('');
  const [fareMax,          setFareMax]          = useState('');
  const [effectiveFrom,    setEffectiveFrom]    = useState('');
  const [sourceDocFilter,  setSourceDocFilter]  = useState('');
  const [sortBy,           setSortBy]           = useState<'origin_asc'|'dest_asc'|'fare_asc'|'fare_desc'|'date_new'>('origin_asc');
  const [filterPanelOpen,  setFilterPanelOpen]  = useState(false);
  const [debouncedSearch,  setDebouncedSearch]  = useState('');

  // Route filters (shared routes / legacy)
  const [rfFrom,   setRfFrom]   = useState('');
  const [rfTo,     setRfTo]     = useState('');
  const [rfStatus, setRfStatus] = useState('all');

  // Schedule filters
  const [sfDate,    setSfDate]    = useState('');
  const [sfRouteId, setSfRouteId] = useState('');
  const [sfBusId,   setSfBusId]   = useState('');
  const [sfStatus,  setSfStatus]  = useState('all');

  // Ticket filters
  const [tfSchedId, setTfSchedId]     = useState('');
  const [ticketQ,   setTicketQ]       = useState('');

  const showToast = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const openStopEditor = async (ruraRoute: RuraRoute) => {
    try {
      const res = await fetch(`/api/company/shared/routes/${ruraRoute.id}/stops`, { headers: authHeaders() });
      const json = await res.json();
      const stops: Stop[] = (json.stops || []).map((s: any) => ({
        id: String(s.id || ''),
        stop_name: s.stop_name,
        sequence: Number(s.sequence),
      }));
      setEditRoute({ ...ruraRoute, stops });
    } catch {
      setEditRoute({ ...ruraRoute, stops: [] });
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rqs = new URLSearchParams();
      if (rfFrom)           rqs.set('from', rfFrom);
      if (rfTo)             rqs.set('to', rfTo);
      if (rfStatus !== 'all') rqs.set('status', rfStatus);

      const sqs = new URLSearchParams();
      if (sfDate)             sqs.set('date', sfDate);
      if (sfRouteId)          sqs.set('route_id', sfRouteId);
      if (sfBusId)            sqs.set('bus_id', sfBusId);
      if (sfStatus !== 'all') sqs.set('status', sfStatus);

      const tqs = new URLSearchParams();
      if (tfSchedId) tqs.set('schedule_id', tfSchedId);

      const [rRes, sRes, bRes, tRes] = await Promise.all([
        fetch(API(`shared/routes?${rqs}`),      { headers: authHeaders() }),
        fetch(API(`shared/schedules?${sqs}`),   { headers: authHeaders() }),
        fetch(API('buses'),                       { headers: authHeaders() }),
        fetch(API(`tickets?${tqs}`),             { headers: authHeaders() }),
      ]);

      const [rj, sj, bj, tj] = await Promise.all([rRes.json(), sRes.json(), bRes.json(), tRes.json()]);
      setRoutes(rj.routes   || []);
      setSchedules(sj.schedules || []);
      setBuses(bj.buses     || []);
      setTickets(tj.tickets || []);
    } catch (e: any) { showToast('err', e.message || 'Failed to load data'); }
    finally { setLoading(false); }
  }, [rfFrom, rfTo, rfStatus, sfDate, sfRouteId, sfBusId, sfStatus, tfSchedId]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadRuraRoutes = useCallback(async () => {
    setRuraLoading(true);
    try {
      // Only pre-filter by status on server; all other filtering is client-side
      const params = new URLSearchParams({ limit: '500' });
      if (ruraStatusFilter !== 'all') params.set('status', ruraStatusFilter);
      const res = await fetch(`/api/rura_routes?${params}`, { headers: authHeaders() });
      const json = await res.json();
      setRuraRoutes(json.data || []);
    } catch (e: any) {
      showToast('err', e.message || 'Failed to load RURA routes');
    } finally {
      setRuraLoading(false);
    }
  }, [ruraStatusFilter]);

  // Load RURA routes when status filter changes or on mount
  useEffect(() => { loadRuraRoutes(); }, [loadRuraRoutes]);

  // Debounce text search (300 ms) — actual filtering happens in useMemo below
  useEffect(() => {
    const tid = setTimeout(() => setDebouncedSearch(ruraSearch), 300);
    return () => clearTimeout(tid);
  }, [ruraSearch]);

  const updateStatus = async (scheduleId: string, status: string) => {
    try {
      const res = await fetch(API(`shared/schedules/${scheduleId}/status`), {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Update failed');
      showToast('ok', `Schedule marked as ${status.replace('_', ' ')}`);
      loadData();
    } catch (e: any) { showToast('err', e.message); }
  };

  const filteredTickets = useMemo(() => {
    const q = ticketQ.toLowerCase();
    return tickets.filter(t =>
      !q ||
      ticketPassenger(t).toLowerCase().includes(q) ||
      ticketBookingRef(t).toLowerCase().includes(q) ||
      String(ticketSeat(t)).includes(q),
    );
  }, [tickets, ticketQ]);

  // ── Smart filter derived data ─────────────────────────────────────────────
  const uniqueOrigins = useMemo(() =>
    [...new Set(ruraRoutes.map(r => r.from_location))].sort((a, b) => a.localeCompare(b)),
    [ruraRoutes],
  );
  const uniqueDestinations = useMemo(() =>
    [...new Set(ruraRoutes.map(r => r.to_location))].sort((a, b) => a.localeCompare(b)),
    [ruraRoutes],
  );
  const uniqueSourceDocs = useMemo(() =>
    [...new Set(ruraRoutes.map(r => r.source_document).filter(Boolean) as string[])].sort(),
    [ruraRoutes],
  );

  const occupiedBySchedule = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
      const scheduleId = normalizeScheduleId(ticket.schedule_id ?? ticket.scheduleId);
      if (!scheduleId) continue;
      if (String(ticket.status || '').toLowerCase() === 'cancelled') continue;
      counts.set(scheduleId, (counts.get(scheduleId) || 0) + 1);
    }
    return counts;
  }, [tickets]);

  const filteredRuraRoutes = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const minFare = fareMin !== '' ? Number(fareMin) : null;
    const maxFare = fareMax !== '' ? Number(fareMax) : null;
    const rows = ruraRoutes.filter(r => {
      if (ruraOriginFilter && r.from_location.toLowerCase() !== ruraOriginFilter.toLowerCase()) return false;
      if (ruraDestFilter   && r.to_location.toLowerCase()   !== ruraDestFilter.toLowerCase())   return false;
      if (q && !r.from_location.toLowerCase().includes(q) && !r.to_location.toLowerCase().includes(q)) return false;
      if (minFare !== null && Number(r.price) < minFare) return false;
      if (maxFare !== null && Number(r.price) > maxFare) return false;
      if (effectiveFrom && (!r.effective_date || String(r.effective_date).slice(0, 10) < effectiveFrom)) return false;
      if (sourceDocFilter && (r.source_document || '').toLowerCase() !== sourceDocFilter.toLowerCase()) return false;
      return true;
    });
    return rows.sort((a, b) => {
      switch (sortBy) {
        case 'dest_asc'  : return (a.to_location   || '').localeCompare(b.to_location   || '');
        case 'fare_asc'  : return Number(a.price) - Number(b.price);
        case 'fare_desc' : return Number(b.price) - Number(a.price);
        case 'date_new'  : return (b.effective_date || '').localeCompare(a.effective_date || '');
        default          : return (a.from_location  || '').localeCompare(b.from_location  || '');
      }
    });
  }, [ruraRoutes, debouncedSearch, ruraOriginFilter, ruraDestFilter, fareMin, fareMax, effectiveFrom, sourceDocFilter, sortBy]);

  const activeFilterCount = [
    ruraSearch, ruraOriginFilter, ruraDestFilter,
    fareMin, fareMax, effectiveFrom, sourceDocFilter,
    ruraStatusFilter !== 'all' ? ruraStatusFilter : '',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setRuraSearch('');
    setRuraOriginFilter('');
    setRuraDestFilter('');
    setFareMin('');
    setFareMax('');
    setEffectiveFrom('');
    setSourceDocFilter('');
    setRuraStatusFilter('all');
    setSortBy('origin_asc');
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'routes',    label: 'Routes',    icon: MapPin,   count: filteredRuraRoutes.length },
    { id: 'schedules', label: 'Schedules', icon: Calendar, count: schedules.length },
    { id: 'tickets',   label: 'Tickets',   icon: Ticket,   count: filteredTickets.length },
  ];

  const fld = 'px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0077B6] bg-white w-full';
  const canCreateSharedSchedules = hasPlanFeature(planPermissions, 'advancedSchedules');

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-6 space-y-5">
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-7">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#2B2D42]">Shared Route Operations</h1>
            <p className="text-gray-500 text-sm mt-1">
              Ordered stops · segment-based seat availability · multi-passenger shared bus
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-lg font-black text-[#0077B6]">{ruraRoutes.filter(r => r.status === 'active').length}</p>
              <p className="text-xs text-gray-500">Active Routes</p>
            </div>
            <div className="text-center px-4 py-2 bg-green-50 rounded-xl border border-green-100">
              <p className="text-lg font-black text-green-600">
                {schedules.filter(s => ['scheduled', 'in_progress'].includes(s.status)).length}
              </p>
              <p className="text-xs text-gray-500">Live Schedules</p>
            </div>
            <div className="text-center px-4 py-2 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-lg font-black text-purple-600">{tickets.length}</p>
              <p className="text-xs text-gray-500">Tickets</p>
            </div>
            <button onClick={loadData} disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white rounded-2xl border border-gray-100 shadow-sm w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
              ${tab === t.id ? 'bg-[#0077B6] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                ${tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── ROUTES TAB ─── */}
      {tab === 'routes' && (
        <div className="space-y-4">

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-black text-[#0077B6]">{ruraRoutes.length}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Total Routes</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-black text-green-600">{ruraRoutes.filter(r => r.status === 'active').length}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Active</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-black text-gray-400">{ruraRoutes.filter(r => r.status !== 'active').length}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Inactive</p>
            </div>
          </div>

          {/* ── Smart Filter Panel ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">

            {/* Top row: search + sort + filter toggle + refresh */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={ruraSearch}
                  onChange={e => setRuraSearch(e.target.value)}
                  placeholder="Search by origin, destination or partial name…"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10"
                />
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0077B6] bg-white shrink-0"
              >
                <option value="origin_asc">Sort: Origin A→Z</option>
                <option value="dest_asc">Sort: Destination A→Z</option>
                <option value="fare_asc">Sort: Fare Low→High</option>
                <option value="fare_desc">Sort: Fare High→Low</option>
                <option value="date_new">Sort: Newest Date</option>
              </select>
              <button
                onClick={() => setFilterPanelOpen(p => !p)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all shrink-0
                  ${ filterPanelOpen ? 'bg-[#0077B6] text-white border-[#0077B6]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className={`ml-0.5 min-w-[18px] h-[18px] rounded-full text-[11px] font-bold flex items-center justify-center px-1
                    ${ filterPanelOpen ? 'bg-white/25 text-white' : 'bg-[#0077B6] text-white'}`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button onClick={loadRuraRoutes} disabled={ruraLoading}
                className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
                title="Refresh routes from server">
                <RefreshCw className={`w-4 h-4 text-gray-500 ${ruraLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Expanded advanced filters */}
            {filterPanelOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Origin</label>
                  <select value={ruraOriginFilter} onChange={e => setRuraOriginFilter(e.target.value)} className={fld}>
                    <option value="">All origins</option>
                    {uniqueOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Destination</label>
                  <select value={ruraDestFilter} onChange={e => setRuraDestFilter(e.target.value)} className={fld}>
                    <option value="">All destinations</option>
                    {uniqueDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                  <select value={ruraStatusFilter} onChange={e => setRuraStatusFilter(e.target.value as 'all'|'active'|'inactive')} className={fld}>
                    <option value="all">All statuses</option>
                    <option value="active">Active only</option>
                    <option value="inactive">Inactive only</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Min Fare (RWF)</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number" min={0} value={fareMin}
                      onChange={e => setFareMin(e.target.value)}
                      placeholder="e.g. 500"
                      className={`${fld} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Max Fare (RWF)</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number" min={0} value={fareMax}
                      onChange={e => setFareMax(e.target.value)}
                      placeholder="e.g. 5000"
                      className={`${fld} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Effective Date (from)</label>
                  <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} className={fld} />
                </div>
                {uniqueSourceDocs.length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Document Source</label>
                    <select value={sourceDocFilter} onChange={e => setSourceDocFilter(e.target.value)} className={fld}>
                      <option value="">All document sources</option>
                      {uniqueSourceDocs.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-1">
                  <button onClick={clearAllFilters}
                    className="text-sm text-[#0077B6] font-bold hover:underline flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Clear all filters
                  </button>
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                {ruraSearch        && <FilterChip label={`"${ruraSearch}"`}                          onRemove={() => setRuraSearch('')} />}
                {ruraOriginFilter  && <FilterChip label={`From: ${ruraOriginFilter}`}                onRemove={() => setRuraOriginFilter('')} />}
                {ruraDestFilter    && <FilterChip label={`To: ${ruraDestFilter}`}                    onRemove={() => setRuraDestFilter('')} />}
                {ruraStatusFilter !== 'all' && <FilterChip label={`Status: ${ruraStatusFilter}`}    onRemove={() => setRuraStatusFilter('all')} />}
                {fareMin           && <FilterChip label={`Min: RWF ${Number(fareMin).toLocaleString()}`}  onRemove={() => setFareMin('')} />}
                {fareMax           && <FilterChip label={`Max: RWF ${Number(fareMax).toLocaleString()}`}  onRemove={() => setFareMax('')} />}
                {effectiveFrom     && <FilterChip label={`From date: ${effectiveFrom}`}              onRemove={() => setEffectiveFrom('')} />}
                {sourceDocFilter   && <FilterChip label={`Doc: ${sourceDocFilter}`}                  onRemove={() => setSourceDocFilter('')} />}
              </div>
            )}

            {/* Result count + sort label */}
            <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-2">
              <span className="text-gray-500">
                Showing{' '}
                <span className="font-bold text-gray-900">{filteredRuraRoutes.length}</span>
                {' '}of{' '}
                <span className="font-bold text-gray-900">{ruraRoutes.length}</span>
                {' '}route{ruraRoutes.length !== 1 ? 's' : ''}
              </span>
              {sortBy !== 'origin_asc' && (
                <span className="text-xs text-gray-400 font-medium">
                  Sorted by: {{
                    dest_asc  : 'Destination A→Z',
                    fare_asc  : 'Fare Low→High',
                    fare_desc : 'Fare High→Low',
                    date_new  : 'Newest Date',
                    origin_asc: 'Origin A→Z',
                  }[sortBy]}
                </span>
              )}
            </div>
          </div>

          {/* Routes grid */}
          {ruraLoading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#0077B6]" />
              <p className="text-sm text-gray-500 font-medium">Loading routes from database…</p>
            </div>
          ) : filteredRuraRoutes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-[#0077B6]" />
              </div>
              <p className="text-gray-800 font-bold text-base">No routes found</p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                {activeFilterCount > 0
                  ? 'No routes match your current filters. Try adjusting or clearing them.'
                  : 'Routes are managed by the RURA administrator. Once routes are added, they will appear here.'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-sm text-[#0077B6] font-bold hover:underline flex items-center gap-1.5 mx-auto">
                  <RotateCcw className="w-3.5 h-3.5" /> Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRuraRoutes.map(route => {
                const schCount = schedules.filter(s => s.route_id === route.id).length;
                const isActive = route.status === 'active';
                return (
                  <div
                    key={route.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
                  >
                    {/* Top colour bar */}
                    <div className={`h-1.5 w-full ${isActive ? 'bg-gradient-to-r from-[#0077B6] to-[#00B4D8]' : 'bg-gray-200'}`} />

                    <div className="p-5 flex-1 flex flex-col gap-3">
                      {/* Route header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-[#0077B6] shrink-0" />
                            <span className="font-black text-[#2B2D42] text-sm leading-snug truncate">{route.from_location}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-[#F4A261] shrink-0" />
                            <span className="font-black text-[#2B2D42] text-sm leading-snug truncate">{route.to_location}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-bold border capitalize ${
                          isActive
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {route.status}
                        </span>
                      </div>

                      {/* Price & date */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
                          <DollarSign className="w-3.5 h-3.5 text-[#0077B6]" />
                          <span className="font-black text-[#0077B6] text-sm">{fmtRwf(route.price)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>Effective {fmtDate(route.effective_date)}</span>
                        </div>
                      </div>

                      {/* Source document badge */}
                      {route.source_document && (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                          <span className="text-xs text-amber-700 font-semibold truncate">📄 {route.source_document}</span>
                        </div>
                      )}

                      {/* Stops chain */}
                      <div className="mt-1">
                        <StopsPreview routeId={String(route.id)} version={stopsVersion} />
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-100 pt-3 mt-auto flex items-center justify-between gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Bus className="w-3.5 h-3.5 text-gray-400" />
                          {schCount > 0
                            ? <span className="font-semibold text-gray-700">{schCount} schedule{schCount > 1 ? 's' : ''}</span>
                            : <span className="text-gray-400">No schedules yet</span>
                          }
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openStopEditor(route)}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#0077B6] text-[#0077B6] hover:bg-blue-50 transition-colors">
                            <MapPin className="w-3.5 h-3.5" /> Manage Stops
                          </button>
                          {isActive && (
                            <button
                              onClick={() => { setSfRouteId(route.id); setTab('schedules'); }}
                              className="text-xs text-[#0077B6] font-bold hover:underline flex items-center gap-1 transition-colors">
                              View schedules <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SCHEDULES TAB ─── */}
      {tab === 'schedules' && (
        <div className="space-y-4">
          <CreateScheduleForm
            routes={ruraRoutes}
            buses={buses}
            onCreate={loadData}
            onToast={showToast}
            canCreateSchedules={canCreateSharedSchedules}
            subscriptionPlan={subscriptionPlan}
          />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-[#0077B6]" />
              <span className="text-sm font-bold text-gray-800">Filter Schedules</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input type="date" value={sfDate} onChange={e => setSfDate(e.target.value)} className={fld} />
              <select value={sfRouteId} onChange={e => setSfRouteId(e.target.value)} className={fld}>
                <option value="">All routes</option>
                {ruraRoutes.filter(r => r.status === 'active').map(r => (
                  <option key={r.id} value={r.id}>{r.from_location} → {r.to_location}</option>
                ))}
              </select>
              <select value={sfBusId} onChange={e => setSfBusId(e.target.value)} className={fld}>
                <option value="">All buses</option>
                {buses.map(b => <option key={b.id} value={b.id}>{b.plateNumber || b.plate_number}</option>)}
              </select>
              <select value={sfStatus} onChange={e => setSfStatus(e.target.value)} className={fld}>
                <option value="all">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {sfRouteId && (
              <button onClick={() => setSfRouteId('')}
                className="mt-2 text-xs text-[#0077B6] font-semibold hover:underline flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Clear route filter
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" /></div>
          ) : schedules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold">No schedules found</p>
              <p className="text-sm text-gray-400 mt-1">Create a schedule using the form above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(sch => {
                const ex = expandedId === sch.schedule_id;
                const scheduleKey = normalizeScheduleId(sch.schedule_id);
                const schTix = tickets.filter(t => normalizeScheduleId(t.schedule_id ?? t.scheduleId) === scheduleKey);
                const occupied = occupiedBySchedule.get(scheduleKey) || 0;
                return (
                  <div key={sch.schedule_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-gray-900 text-base">
                              {sch.from_location} → {sch.to_location}
                            </h3>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border capitalize ${statusBadge(sch.status)}`}>
                              {sch.status.replace('_', ' ')}
                            </span>
                            {(sch.bus_status || '').toLowerCase() !== 'active' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 font-bold">
                                Bus offline
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />{fmtDate(sch.date)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />{fmtTime(sch.time)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Bus className="w-3.5 h-3.5 text-gray-400" />{sch.plate_number}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-gray-400" />{sch.capacity} seats · {fmtRwf(sch.price)}
                            </span>
                          </div>
                          <div className="mt-2 max-w-sm">
                            <OccupancyBar occupied={occupied} capacity={sch.capacity} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {sch.status === 'scheduled' && (
                            <button onClick={() => updateStatus(sch.schedule_id, 'in_progress')}
                              className="px-3 py-1.5 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-bold hover:bg-amber-100">
                              Start Trip
                            </button>
                          )}
                          {sch.status === 'in_progress' && (
                            <button onClick={() => updateStatus(sch.schedule_id, 'completed')}
                              className="px-3 py-1.5 text-xs rounded-lg bg-green-50 border border-green-200 text-green-700 font-bold hover:bg-green-100">
                              Complete
                            </button>
                          )}
                          {!['cancelled', 'completed'].includes(sch.status) && (
                            <button onClick={() => updateStatus(sch.schedule_id, 'cancelled')}
                              className="px-3 py-1.5 text-xs rounded-lg bg-red-50 border border-red-200 text-red-600 font-bold hover:bg-red-100">
                              Cancel
                            </button>
                          )}
                          <button onClick={() => setExpandedId(ex ? null : sch.schedule_id)}
                            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${ex ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                    {ex && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5" /> Segment Tickets ({schTix.length})
                        </p>
                        {schTix.length === 0 ? (
                          <p className="text-xs text-gray-400">No tickets booked yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[500px]">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left py-1.5 pr-4">Passenger</th>
                                  <th className="text-left py-1.5 pr-4">Segment</th>
                                  <th className="text-left py-1.5 pr-4">Seat</th>
                                  <th className="text-left py-1.5 pr-4">Fare</th>
                                  <th className="text-left py-1.5 pr-4">Ref</th>
                                  <th className="text-left py-1.5">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {schTix.map((t, i) => (
                                  <tr key={t.id || t.ticket_id || i} className="border-t border-gray-200">
                                    <td className="py-2 pr-4 font-semibold text-gray-800">{ticketPassenger(t) || '—'}</td>
                                    <td className="py-2 pr-4">
                                      {ticketFrom(t) && ticketTo(t) ? (
                                        <span className="flex items-center gap-1">
                                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{ticketFrom(t)}</span>
                                          <ArrowRight className="w-3 h-3 text-gray-400" />
                                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{ticketTo(t)}</span>
                                        </span>
                                      ) : '—'}
                                    </td>
                                    <td className="py-2 pr-4 font-mono font-bold">{ticketSeat(t) || '—'}</td>
                                    <td className="py-2 pr-4">{t.price ? fmtRwf(t.price) : '—'}</td>
                                    <td className="py-2 pr-4 font-mono text-gray-500 truncate max-w-[100px]">{ticketBookingRef(t) || '—'}</td>
                                    <td className="py-2">
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${statusBadge(t.status || 'confirmed')}`}>
                                        {t.status || 'confirmed'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TICKETS TAB ─── */}
      {tab === 'tickets' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-[#0077B6]" />
              <span className="text-sm font-bold text-gray-800">Search Tickets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={ticketQ} onChange={e => setTicketQ(e.target.value)}
                placeholder="Search passenger name, booking ref, seat…" className={fld} />
              <select value={tfSchedId} onChange={e => setTfSchedId(e.target.value)} className={fld}>
                <option value="">All schedules</option>
                {schedules.map(s => (
                  <option key={s.schedule_id} value={s.schedule_id}>
                    {s.from_location} → {s.to_location} · {fmtDate(s.date)} {fmtTime(s.time)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" /></div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold">No tickets found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-sm text-gray-600">
                Showing <span className="font-bold text-gray-900">{filteredTickets.length}</span> ticket(s)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Passenger', 'Segment', 'Seat', 'Fare', 'Booking Ref', 'Status', 'Booked At'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTickets.map((t, i) => (
                      <tr key={t.id || t.ticket_id || i} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{ticketPassenger(t) || 'Anonymous'}</td>
                        <td className="px-4 py-3">
                          {ticketFrom(t) && ticketTo(t) ? (
                            <span className="flex items-center gap-1">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{ticketFrom(t)}</span>
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">{ticketTo(t)}</span>
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-800">{ticketSeat(t) || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">{t.price ? fmtRwf(t.price) : '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{ticketBookingRef(t) || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${statusBadge(t.status || 'confirmed')}`}>
                            {t.status || 'confirmed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {ticketCreatedAt(t) ? String(ticketCreatedAt(t)).slice(0, 16).replace('T', ' ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {editRoute && (
        <StopEditorModal
          route={editRoute}
          onClose={() => setEditRoute(null)}
          onSaved={() => { showToast('ok', 'Stops updated'); setStopsVersion(v => v + 1); loadData(); }}
        />
      )}
    </div>
  );
}
