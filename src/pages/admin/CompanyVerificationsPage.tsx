import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, ExternalLink, Eye, FileText, Loader2, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import { API_URL as API_BASE_URL } from '../../config';

type VerificationStatus = 'pending' | 'approved' | 'rejected';
type SortField = 'company_name' | 'email' | 'account_status';
type SortDirection = 'asc' | 'desc';

interface UploadedDocument {
  id: string;
  document_type: string;
  file_url: string;
  url?: string;
  verification_status: string;
  notes?: string | null;
  created_at: string;
}

interface CompanyVerification {
  company_id: string;
  company_name: string;
  email: string;
  phone_number: string | null;
  address: string | null;
  account_status: VerificationStatus;
  company_verified: boolean;
  rejection_reason?: string | null;
  uploaded_documents: UploadedDocument[];
  last_document_submitted_at?: string | null;
}

function statusBadgeClass(status: VerificationStatus) {
  if (status === 'approved') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
}

function statusLabel(status: VerificationStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isPdfDocument(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

function resolveDocumentUrl(document: UploadedDocument) {
  if (document.url) return document.url;
  if (/^https?:\/\//i.test(document.file_url)) return document.file_url;

  if (document.file_url.startsWith('/')) {
    if (API_BASE_URL.startsWith('http')) {
      return `${API_BASE_URL.replace(/\/api\/?$/, '')}${document.file_url}`;
    }

    return document.file_url;
  }

  return document.file_url;
}

function compareValues(a: string, b: string, direction: SortDirection) {
  const result = a.localeCompare(b, undefined, { sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: { type: 'success' | 'error'; text: string };
  onDismiss: () => void;
}) {
  return (
    <div className={`fixed top-5 right-5 z-[60] flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
      toast.type === 'success'
        ? 'bg-white border-green-200 text-green-800'
        : 'bg-white border-red-200 text-red-800'
    }`}>
      {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      <span className="text-sm font-semibold">{toast.text}</span>
      <button onClick={onDismiss} className="text-xs font-bold opacity-70 hover:opacity-100">Close</button>
    </div>
  );
}

export default function CompanyVerificationsPage() {
  const [companies, setCompanies] = useState<CompanyVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [sortField, setSortField] = useState<SortField>('company_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewDocument, setPreviewDocument] = useState<UploadedDocument | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const authConfig = useMemo(() => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }), [token]);

  const loadCompanies = async (mode: 'initial' | 'refresh' = 'initial') => {
    try {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await axios.get(`${API_BASE_URL}/admin/company-verifications`, authConfig);
      setCompanies(response.data.companies || []);
    } catch (error: any) {
      setToast({
        type: 'error',
        text: error.response?.data?.error || 'Failed to load company verifications.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCompanies('initial');
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...companies]
      .filter((company) => {
        const matchesSearch = !normalizedSearch
          || company.company_name.toLowerCase().includes(normalizedSearch)
          || company.email.toLowerCase().includes(normalizedSearch);
        const matchesStatus = statusFilter === 'all' || company.account_status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        if (sortField === 'account_status') {
          return compareValues(left.account_status, right.account_status, sortDirection);
        }

        return compareValues(left[sortField] || '', right[sortField] || '', sortDirection);
      });
  }, [companies, search, sortDirection, sortField, statusFilter]);

  const pendingCount = companies.filter((company) => company.account_status === 'pending').length;
  const rejectedCount = companies.filter((company) => company.account_status === 'rejected').length;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const handleAction = async (companyId: string, action: 'approve' | 'reject') => {
    try {
      setActingId(`${companyId}:${action}`);
      const response = await axios.put(
        `${API_BASE_URL}/admin/company-verifications/${companyId}/${action}`,
        {},
        authConfig,
      );

      setToast({
        type: 'success',
        text: response.data.message || `Company ${action}d successfully.`,
      });

      await loadCompanies('refresh');
    } catch (error: any) {
      setToast({
        type: 'error',
        text: error.response?.data?.error || `Failed to ${action} company.`,
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 lg:p-6 xl:p-8">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] bg-gradient-to-br from-[#0B6A92] via-[#0077B6] to-[#005F8E] px-6 py-7 text-white shadow-[0_24px_80px_rgba(0,119,182,0.24)] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em]">
              <ShieldCheck className="w-4 h-4" />
              Admin Review
            </div>
            <h1 className="text-3xl font-black font-['Montserrat']">Company Verifications</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Review submitted company documents, approve legitimate operators, and keep rejected submissions in a controlled resubmission flow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button
              onClick={() => loadCompanies('refresh')}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#005F8E] transition hover:bg-[#F3FAFD] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Pending Review</div>
            <div className="mt-2 text-3xl font-black font-['Montserrat'] text-[#2B2D42]">{pendingCount}</div>
            <div className="mt-1 text-xs text-gray-400">Companies waiting for admin action</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Rejected</div>
            <div className="mt-2 text-3xl font-black font-['Montserrat'] text-[#E63946]">{rejectedCount}</div>
            <div className="mt-1 text-xs text-gray-400">Companies that can resubmit corrected documents</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Documents In Queue</div>
            <div className="mt-2 text-3xl font-black font-['Montserrat'] text-[#0077B6]">
              {companies.reduce((count, company) => count + company.uploaded_documents.length, 0)}
            </div>
            <div className="mt-1 text-xs text-gray-400">Uploaded files currently visible to admins</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black font-['Montserrat'] text-[#2B2D42]">Verification Queue</h2>
              <p className="mt-1 text-sm text-gray-500">Search, sort, preview submitted files, and approve or reject without leaving the page.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by company name or email"
                  className="w-full bg-transparent text-sm text-gray-700 outline-none md:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | VerificationStatus)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#0077B6]"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-[#0077B6]" />
                <p className="text-sm font-semibold text-gray-600">Loading verification queue...</p>
              </div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <ShieldCheck className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-bold text-[#2B2D42]">No companies match the current filters</h3>
              <p className="mt-2 max-w-md text-sm text-gray-500">When companies submit verification documents, they will appear here for review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                      <button onClick={() => toggleSort('company_name')} className="inline-flex items-center gap-1 hover:text-[#0077B6]">
                        Company Name
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                      <button onClick={() => toggleSort('email')} className="inline-flex items-center gap-1 hover:text-[#0077B6]">
                        Email
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Phone Number</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Address</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Documents</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                      <button onClick={() => toggleSort('account_status')} className="inline-flex items-center gap-1 hover:text-[#0077B6]">
                        Status
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredCompanies.map((company) => (
                    <tr key={company.company_id} className="align-top hover:bg-[#FAFCFF]">
                      <td className="px-6 py-5">
                        <div className="font-semibold text-[#2B2D42]">{company.company_name}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {company.last_document_submitted_at
                            ? `Last upload ${new Date(company.last_document_submitted_at).toLocaleDateString()}`
                            : 'Submission date unavailable'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700">{company.email || '—'}</td>
                      <td className="px-6 py-5 text-sm text-gray-700">{company.phone_number || '—'}</td>
                      <td className="px-6 py-5 text-sm text-gray-700">{company.address || '—'}</td>
                      <td className="px-6 py-5">
                        <div className="space-y-2">
                          {company.uploaded_documents.map((document) => {
                            const documentUrl = resolveDocumentUrl(document);
                            return (
                              <div key={document.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                                  <FileText className="h-3.5 w-3.5" />
                                  {document.document_type.replace(/_/g, ' ')}
                                </span>
                                <a
                                  href={documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-[#0077B6] hover:underline"
                                >
                                  Open
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => setPreviewDocument(document)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:border-[#0077B6] hover:text-[#0077B6]"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Preview
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(company.account_status)}`}>
                          {statusLabel(company.account_status)}
                        </span>
                        {company.rejection_reason && company.account_status === 'rejected' && (
                          <p className="mt-2 max-w-[220px] text-xs text-red-600">{company.rejection_reason}</p>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleAction(company.company_id, 'approve')}
                            disabled={actingId !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#27AE60] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#219150] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actingId === `${company.company_id}:approve`
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <CheckCircle2 className="w-4 h-4" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(company.company_id, 'reject')}
                            disabled={actingId !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actingId === `${company.company_id}:reject`
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <XCircle className="w-4 h-4" />}
                            Reject
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

      <Modal
        title={previewDocument ? previewDocument.document_type.replace(/_/g, ' ') : 'Document Preview'}
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        size="lg"
      >
        {previewDocument && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <div>
                <div className="font-semibold text-[#2B2D42]">{previewDocument.document_type.replace(/_/g, ' ')}</div>
                <div className="text-xs text-gray-500">Uploaded {new Date(previewDocument.created_at).toLocaleString()}</div>
              </div>
              <a
                href={resolveDocumentUrl(previewDocument)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0077B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005F8E]"
              >
                Open File
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {isPdfDocument(resolveDocumentUrl(previewDocument)) ? (
                <iframe
                  src={resolveDocumentUrl(previewDocument)}
                  title={previewDocument.document_type}
                  className="h-[70vh] w-full"
                />
              ) : (
                <img
                  src={resolveDocumentUrl(previewDocument)}
                  alt={previewDocument.document_type}
                  className="max-h-[70vh] w-full object-contain bg-[#F8FAFC]"
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
