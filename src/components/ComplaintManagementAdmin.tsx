import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, RefreshCw } from 'lucide-react';

type Complaint = {
  id: string;
  user_name?: string;
  company_name?: string;
  trip_id?: string | null;
  category: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  created_at: string;
  latest_reply?: string | null;
  latest_reply_at?: string | null;
  reply_count?: number;
};

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

const statusBadgeClass = (status: string) => {
  const upper = String(status || '').toUpperCase();
  if (upper === 'OPEN') return 'bg-red-100 text-red-700 border border-red-200';
  if (upper === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (upper === 'RESOLVED') return 'bg-green-100 text-green-700 border border-green-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

export default function ComplaintManagementAdmin() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [replyById, setReplyById] = useState<Record<string, string>>({});
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>({});

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

  const filteredComplaints = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(startOfToday);
    last7Days.setDate(last7Days.getDate() - 6);

    return complaints.filter((c) => {
      if (statusFilter !== 'all' && String(c.status || '').toUpperCase() !== statusFilter) return false;
      if (companyFilter !== 'all' && String(c.company_name || '') !== companyFilter) return false;

      if (dateFilter !== 'all') {
        const created = new Date(c.created_at);
        if (Number.isNaN(created.getTime())) return false;
        if (dateFilter === 'today' && created < startOfToday) return false;
        if (dateFilter === 'last7' && created < last7Days) return false;
      }

      return true;
    });
  }, [complaints, statusFilter, companyFilter, dateFilter]);

  const uniqueCompanies = useMemo(() => {
    return Array.from(new Set(complaints.map((c) => c.company_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
  }, [complaints]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingById((prev) => ({ ...prev, [id]: true }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/complaints/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Failed to update complaint (${res.status})`);
      await loadComplaints();
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    } finally {
      setUpdatingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const addReply = async (id: string) => {
    const message = String(replyById[id] || '').trim();
    if (!message) return;

    setUpdatingById((prev) => ({ ...prev, [id]: true }));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/complaints/${id}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Failed to add reply (${res.status})`);
      setReplyById((prev) => ({ ...prev, [id]: '' }));
      await loadComplaints();
    } catch (err: any) {
      alert(err?.message || 'Failed to add reply');
    } finally {
      setUpdatingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl lg:text-3xl font-black text-[#2B2D42]">Complaint Management</h1>
        <button
          onClick={loadComplaints}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="last7">Last 7 days</option>
        </select>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All companies</option>
          {uniqueCompanies.map((company) => (
            <option key={company} value={company}>{company}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#0077B6]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">{error}</div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-600">No complaints found for selected filters.</div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((complaint) => (
            <div key={complaint.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">{complaint.company_name || 'Unknown Company'} • {complaint.user_name || 'Unknown User'}</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{complaint.category}</div>
                  <p className="text-sm text-gray-700 mt-1">{complaint.description}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusBadgeClass(complaint.status)}`}>
                  {String(complaint.status || '').replace('_', ' ')}
                </span>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Priority: <span className="font-semibold text-gray-700">{complaint.priority}</span> • Created: {new Date(complaint.created_at).toLocaleString()}
              </div>

              {complaint.latest_reply && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <div className="font-semibold">Latest response</div>
                  <div>{complaint.latest_reply}</div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2">
                <select
                  value={String(complaint.status || '').toUpperCase()}
                  onChange={(e) => updateStatus(complaint.id, e.target.value)}
                  disabled={!!updatingById[complaint.id]}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>)}
                </select>
                <input
                  value={replyById[complaint.id] || ''}
                  onChange={(e) => setReplyById((prev) => ({ ...prev, [complaint.id]: e.target.value }))}
                  placeholder="Write response to user..."
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => addReply(complaint.id)}
                  disabled={!!updatingById[complaint.id]}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0077B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005F8E] disabled:opacity-60"
                >
                  <MessageSquare className="w-4 h-4" /> Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-4 text-xs text-gray-500 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Complaint workflow: Open (red) {'->'} In Progress (orange) {'->'} Resolved (green)
      </div>
    </div>
  );
}
