import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Crown, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

type RequestStatus = 'pending' | 'approved' | 'rejected';

interface SubscriptionRequest {
  id: string;
  companyId: string;
  companyName: string;
  companyEmail: string;
  currentPlan: string;
  requestedPlan: string;
  status: RequestStatus;
  requestedByName: string | null;
  createdAt: string;
  nextPayment: string | null;
}

const formatDate = (value: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getAuthConfig = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Your admin session has expired. Please sign in again.');
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export default function SubscriptionRequestsPage() {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async (mode: 'initial' | 'refresh' = 'initial') => {
    try {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);
      const response = await axios.get(`${API_BASE_URL}/admin/subscription-requests`, getAuthConfig());
      setRequests(response.data.requests || []);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || requestError.message || 'Failed to load subscription requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests('initial');
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timeoutId = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests]
  );

  const approveRequest = async (requestId: string) => {
    try {
      setApprovingId(requestId);
      setError(null);

      const response = await axios.put(
        `${API_BASE_URL}/admin/subscription-requests/${requestId}/approve`,
        {},
        getAuthConfig()
      );

      const approvedRequest = response.data.request;
      setRequests((current) => current.map((request) => (
        request.id === requestId ? { ...request, status: approvedRequest.status, nextPayment: response.data.company?.nextPayment || request.nextPayment } : request
      )));
      setFeedback(response.data.message || 'Subscription request approved.');
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || requestError.message || 'Failed to approve request.');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 lg:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] bg-gradient-to-br from-[#12324A] via-[#0B6A92] to-[#0077B6] px-6 py-7 text-white shadow-[0_24px_80px_rgba(0,119,182,0.24)] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em]">
              <Crown className="h-4 w-4" />
              Admin Review
            </div>
            <h1 className="text-3xl font-black font-['Montserrat']">Subscription Requests</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Review company upgrade requests and approve them using the existing admin plan management flow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => loadRequests('refresh')}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#005F8E] transition hover:bg-[#F3FAFD] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Pending</div>
            <div className="mt-2 text-3xl font-black font-['Montserrat'] text-[#2B2D42]">{pendingRequests.length}</div>
            <div className="mt-1 text-xs text-gray-400">Requests waiting for admin action</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Approved</div>
            <div className="mt-2 text-3xl font-black font-['Montserrat'] text-[#27AE60]">{requests.filter((request) => request.status === 'approved').length}</div>
            <div className="mt-1 text-xs text-gray-400">Requests already applied</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Total</div>
            <div className="mt-2 text-3xl font-black font-['Montserrat'] text-[#0077B6]">{requests.length}</div>
            <div className="mt-1 text-xs text-gray-400">Newest requests shown first</div>
          </div>
        </div>

        {feedback && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-900">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="text-sm font-semibold">{feedback}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-900">
            <div className="text-sm font-semibold">{error}</div>
          </div>
        )}

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-lg font-black font-['Montserrat'] text-[#2B2D42]">Upgrade Queue</h2>
            <p className="mt-1 text-sm text-gray-500">Approve a request to apply the requested plan and keep the review history visible.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center px-6 py-16 text-gray-500">
              <Loader2 className="mr-3 h-5 w-5 animate-spin text-[#0077B6]" />
              Loading subscription requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-500">
              No subscription requests have been submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Requested By</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Plan Change</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Requested</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Next Payment</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{request.companyName}</div>
                        <div className="text-sm text-gray-500">{request.companyEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{request.requestedByName || 'Company admin'}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{request.currentPlan} to {request.requestedPlan}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(request.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(request.nextPayment)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${request.status === 'approved' ? 'bg-green-100 text-green-700' : request.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => approveRequest(request.id)}
                            disabled={request.status !== 'pending' || approvingId === request.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0077B6] to-[#005F8E] px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {approvingId === request.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}