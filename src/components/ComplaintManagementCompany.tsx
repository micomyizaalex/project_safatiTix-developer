import React, { useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';

type Complaint = {
  id: string;
  user_name?: string;
  category: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | string;
  priority: string;
  created_at: string;
  latest_reply?: string | null;
};

const statusBadgeClass = (status: string) => {
  const upper = String(status || '').toUpperCase();
  if (upper === 'OPEN') return 'bg-red-100 text-red-700 border border-red-200';
  if (upper === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (upper === 'RESOLVED') return 'bg-green-100 text-green-700 border border-green-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

export default function ComplaintManagementCompany() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyById, setReplyById] = useState<Record<string, string>>({});

  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

  const loadComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/complaints', { headers });
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
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api/complaints/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(payload?.error || 'Failed to update status');
      return;
    }
    await loadComplaints();
  };

  const addReply = async (id: string) => {
    const message = String(replyById[id] || '').trim();
    if (!message) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api/complaints/${id}/reply`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(payload?.error || 'Failed to send reply');
      return;
    }

    setReplyById((prev) => ({ ...prev, [id]: '' }));
    await loadComplaints();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-['Montserrat'] font-bold text-[#2B2D42]">Complaints</h1>
        <p className="text-gray-600">View and resolve complaints related to your buses and routes.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-[#0077B6]" /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">{error}</div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-600">No complaints for your company yet.</div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-gray-500">{c.user_name || 'Commuter'} • {new Date(c.created_at).toLocaleString()}</div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadgeClass(c.status)}`}>{String(c.status).replace('_', ' ')}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-2">{c.category}</h3>
              <p className="text-sm text-gray-700 mt-1">{c.description}</p>
              {c.latest_reply && <p className="mt-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"><span className="font-semibold">Latest response:</span> {c.latest_reply}</p>}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2">
                <select
                  value={String(c.status || '').toUpperCase()}
                  onChange={(e) => updateStatus(c.id, e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <input
                  value={replyById[c.id] || ''}
                  onChange={(e) => setReplyById((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  placeholder="Reply to commuter..."
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button onClick={() => addReply(c.id)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0077B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005F8E]">
                  <MessageSquare className="w-4 h-4" /> Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
