import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, MessageSquarePlus } from 'lucide-react';

type Complaint = {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  latest_reply?: string | null;
};

type BookingLite = {
  id: string;
  scheduleId: string;
  fromStop: string;
  toStop: string;
  scheduleDate: string;
};

const statusBadgeClass = (status: string) => {
  const upper = String(status || '').toUpperCase();
  if (upper === 'OPEN') return 'bg-red-100 text-red-700 border border-red-200';
  if (upper === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (upper === 'RESOLVED') return 'bg-green-100 text-green-700 border border-green-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

interface ComplaintSectionProps {
  accessToken: string | null;
  bookings: BookingLite[];
}

export default function ComplaintSection({ accessToken, bookings }: ComplaintSectionProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState('Service Delay');
  const [priority, setPriority] = useState('MEDIUM');
  const [tripId, setTripId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tripOptions = useMemo(() => {
    return bookings
      .filter((b) => b.scheduleId)
      .map((b) => ({
        tripId: b.scheduleId,
        label: `${b.fromStop} -> ${b.toStop} (${b.scheduleDate || 'date N/A'})`,
      }));
  }, [bookings]);

  const headers = useMemo(() => {
    const base: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) base.Authorization = `Bearer ${accessToken}`;
    return base;
  }, [accessToken]);

  const loadComplaints = async () => {
    if (!accessToken) {
      setComplaints([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/complaints/user', { headers });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Failed to load complaints (${res.status})`);
      setComplaints(Array.isArray(payload.complaints) ? payload.complaints : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load complaints');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [accessToken]);

  const submitComplaint = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = description.trim();
    if (!message) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category,
          description: message,
          priority,
          trip_id: tripId || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Failed to submit complaint (${res.status})`);

      setDescription('');
      setTripId('');
      setPriority('MEDIUM');
      setCategory('Service Delay');
      await loadComplaints();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="complaints-panel" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0077B6]">Support & Complaints</p>
        <h3 className="mt-1 text-xl font-bold text-slate-900 [font-family:Montserrat,Inter,sans-serif]">Report an issue and track resolution</h3>
      </div>

      <form onSubmit={submitComplaint} className="grid gap-3 md:grid-cols-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
          <option>Service Delay</option>
          <option>Driver Conduct</option>
          <option>Bus Condition</option>
          <option>Payment Issue</option>
          <option>Ticket Issue</option>
          <option>Safety Concern</option>
          <option>Other</option>
        </select>

        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        <select value={tripId} onChange={(e) => setTripId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm md:col-span-2">
          <option value="">Link to a trip (optional)</option>
          {tripOptions.map((trip) => (
            <option key={trip.tripId} value={trip.tripId}>{trip.label}</option>
          ))}
        </select>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe what happened..."
          className="rounded-xl border border-slate-200 px-3 py-3 text-sm md:col-span-2"
        />

        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0077B6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#005F8E] disabled:opacity-60 md:w-fit"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />} Submit Complaint
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-6">
        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">Complaint History</h4>

        {loading ? (
          <div className="py-8 text-center text-slate-500"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div>
        ) : complaints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No complaints submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-900">{complaint.category}</div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadgeClass(complaint.status)}`}>
                    {String(complaint.status || '').replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{complaint.description}</p>
                {complaint.latest_reply && (
                  <p className="mt-2 text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <span className="font-semibold">Support response:</span> {complaint.latest_reply}
                  </p>
                )}
                <div className="mt-2 text-xs text-slate-500">Priority: {complaint.priority} • {new Date(complaint.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Status colors: Open (red), In Progress (orange), Resolved (green)
        </div>
      </div>
    </section>
  );
}
