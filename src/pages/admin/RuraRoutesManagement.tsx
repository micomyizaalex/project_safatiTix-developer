import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Edit2, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { API_URL as API_BASE_URL } from '../../config';
const PAGE_SIZE = 50;

type RouteStatus = 'active' | 'inactive';
type SortField = 'from_location' | 'to_location' | 'price' | 'effective_date' | 'status' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface RuraRoute {
  id: string | number;
  from_location: string;
  to_location: string;
  price: number;
  effective_date: string;
  source_document: string;
  status: RouteStatus;
  created_at: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FlashMessage {
  type: 'success' | 'error';
  text: string;
}

interface CreateFormState {
  from_location: string;
  to_location: string;
  price: string;
  effective_date: string;
  source_document: string;
  status: RouteStatus;
}

interface EditFormState {
  price: string;
  effective_date: string;
  status: RouteStatus;
}

const initialCreateForm: CreateFormState = {
  from_location: '',
  to_location: '',
  price: '',
  effective_date: '',
  source_document: '',
  status: 'active'
};

function formatDate(value: string) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

export default function RuraRoutesManagement() {
  const [routes, setRoutes] = useState<RuraRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RouteStatus>('all'); // Changed from 'active' to 'all'
  const [effectiveDateFilter, setEffectiveDateFilter] = useState('');
  const [applicableOnly, setApplicableOnly] = useState(true); // New: show only applicable routes by default
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1
  });

  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ price: '', effective_date: '', status: 'active' });

  const token = localStorage.getItem('token');

  const fetchRoutes = async (page = pagination.page) => {
    if (!token) {
      setError('Missing authentication token. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number | boolean> = {
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder
      };

      // Add applicable_only parameter to fetch only active routes with effective_date <= today
      if (applicableOnly) {
        params.applicable_only = 'true';
      }

      if (search.trim()) params.search = search.trim();
      if (originFilter.trim()) params.origin = originFilter.trim();
      if (destinationFilter.trim()) params.destination = destinationFilter.trim();
      // Only send status filter if not using applicableOnly mode
      if (statusFilter !== 'all' && !applicableOnly) params.status = statusFilter;
      if (effectiveDateFilter && !applicableOnly) params.effective_date = effectiveDateFilter;

      const response = await axios.get(`${API_BASE_URL}/routes`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setRoutes(response.data.routes || []);
      setPagination(response.data.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    } catch (fetchError: any) {
      const message = fetchError?.response?.data?.message || fetchError?.message || 'Failed to load RURA routes';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, originFilter, destinationFilter, statusFilter, effectiveDateFilter, applicableOnly, sortBy, sortOrder]);

  useEffect(() => {
    if (!flash) return;
    const timeout = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(timeout);
  }, [flash]);

  const localDuplicate = useMemo(() => {
    const key = `${createForm.from_location.trim().toLowerCase()}|${createForm.to_location.trim().toLowerCase()}|${createForm.effective_date}`;
    if (!createForm.from_location || !createForm.to_location || !createForm.effective_date) return false;
    return routes.some((route) => {
      const routeKey = `${route.from_location.trim().toLowerCase()}|${route.to_location.trim().toLowerCase()}|${route.effective_date?.slice(0, 10)}`;
      return route.status === 'active' && routeKey === key;
    });
  }, [createForm.effective_date, createForm.from_location, createForm.to_location, routes]);

  const resetCreateForm = () => setCreateForm(initialCreateForm);

  const validateCreate = () => {
    if (!createForm.from_location.trim() || !createForm.to_location.trim() || !createForm.source_document.trim()) {
      return 'From, to, and source document are required';
    }
    if (!createForm.effective_date) {
      return 'Effective date is required';
    }
    if (!Number.isFinite(Number(createForm.price)) || Number(createForm.price) <= 0) {
      return 'Price must be greater than 0';
    }
    if (localDuplicate) {
      return 'A route with the same origin, destination and effective date already exists';
    }
    return null;
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const validationError = validateCreate();
    if (validationError) {
      setFlash({ type: 'error', text: validationError });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...createForm,
        price: Number(createForm.price)
      };

      const response = await axios.post(`${API_BASE_URL}/routes`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFlash({ type: 'success', text: response.data?.message || 'Route segment created successfully' });
      resetCreateForm();
      await fetchRoutes(1);
    } catch (createError: any) {
      const message = createError?.response?.data?.message || createError?.message || 'Failed to create route';
      setFlash({ type: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (route: RuraRoute) => {
    setEditingId(route.id);
    setEditForm({
      price: String(route.price),
      effective_date: route.effective_date?.slice(0, 10),
      status: route.status
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ price: '', effective_date: '', status: 'active' });
  };

  const handleUpdate = async (routeId: string | number) => {
    if (!token) return;
    if (!Number.isFinite(Number(editForm.price)) || Number(editForm.price) <= 0) {
      setFlash({ type: 'error', text: 'Price must be greater than 0' });
      return;
    }
    if (!editForm.effective_date) {
      setFlash({ type: 'error', text: 'Effective date is required' });
      return;
    }

    try {
      setSaving(true);
      const response = await axios.put(
        `${API_BASE_URL}/routes/${routeId}`,
        {
          price: Number(editForm.price),
          effective_date: editForm.effective_date,
          status: editForm.status
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFlash({ type: 'success', text: response.data?.message || 'Route segment updated successfully' });
      cancelEdit();
      await fetchRoutes(pagination.page);
    } catch (updateError: any) {
      const message = updateError?.response?.data?.message || updateError?.message || 'Failed to update route';
      setFlash({ type: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (routeId: string | number) => {
    if (!token) return;
    const shouldDelete = window.confirm('Set this segment to inactive?');
    if (!shouldDelete) return;

    try {
      setSaving(true);
      const response = await axios.delete(`${API_BASE_URL}/routes/${routeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFlash({ type: 'success', text: response.data?.message || 'Route segment deactivated successfully' });
      await fetchRoutes(pagination.page);
    } catch (deleteError: any) {
      const message = deleteError?.response?.data?.message || deleteError?.message || 'Failed to deactivate route';
      setFlash({ type: 'error', text: message });
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortOrder('asc');
  };

  const goToPage = (page: number) => {
    const targetPage = Math.max(1, Math.min(page, pagination.totalPages));
    setPagination((previous) => ({ ...previous, page: targetPage }));
    fetchRoutes(targetPage);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black font-['Montserrat'] text-[#2B2D42] mb-2">RURA Routes</h1>
          <p className="text-gray-600">Manage regulated route segments and pricing</p>
        </div>
      </div>

      {flash && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            flash.type === 'success'
              ? 'bg-[#27AE60]/10 border-[#27AE60]/30 text-[#1f7f46]'
              : 'bg-[#E63946]/10 border-[#E63946]/30 text-[#a32a34]'
          }`}
        >
          {flash.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-semibold">{flash.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-lg font-bold text-[#2B2D42] mb-4">Create New Route Segment</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="From location"
            value={createForm.from_location}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, from_location: event.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          />
          <input
            type="text"
            placeholder="To location"
            value={createForm.to_location}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, to_location: event.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          />
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Price"
            value={createForm.price}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, price: event.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          />
          <input
            type="date"
            value={createForm.effective_date}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, effective_date: event.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          />
          <input
            type="text"
            placeholder="Source document"
            value={createForm.source_document}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, source_document: event.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          />
          <select
            value={createForm.status}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, status: event.target.value as RouteStatus }))}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="md:col-span-2 lg:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0077B6] to-[#005F8E] text-white rounded-xl font-bold disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Segment
            </button>
            {localDuplicate && <span className="text-sm text-[#E63946] font-semibold">Potential duplicate detected</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#2B2D42]">Filters</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applicableOnly}
              onChange={(e) => setApplicableOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#0077B6] focus:ring-[#0077B6]"
            />
            <span className="text-sm font-semibold text-gray-700">Show Applicable Only (Active & Effective Today)</span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search route or source document"
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          />
          <input
            type="text"
            value={originFilter}
            onChange={(event) => setOriginFilter(event.target.value)}
            placeholder="Filter by origin"
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          />
          <input
            type="text"
            value={destinationFilter}
            onChange={(event) => setDestinationFilter(event.target.value)}
            placeholder="Filter by destination"
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | RouteStatus)}
            disabled={applicableOnly}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <input
            type="date"
            value={effectiveDateFilter}
            onChange={(event) => setEffectiveDateFilter(event.target.value)}
            disabled={applicableOnly}
            placeholder="Effective date"
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[#E63946] bg-[#E63946]/10 border border-[#E63946]/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('from_location')}>
                  From {sortBy === 'from_location' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('to_location')}>
                  To {sortBy === 'to_location' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('price')}>
                  Price {sortBy === 'price' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('effective_date')}>
                  Effective Date {sortBy === 'effective_date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  Status {sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading route segments...
                  </td>
                </tr>
              ) : routes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">No route segments found</td>
                </tr>
              ) : (
                routes.map((route) => (
                  <tr key={route.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{route.from_location}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{route.to_location}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editingId === route.id ? (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={editForm.price}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
                          className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
                        />
                      ) : (
                        formatMoney(route.price)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editingId === route.id ? (
                        <input
                          type="date"
                          value={editForm.effective_date}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, effective_date: event.target.value }))}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6]"
                        />
                      ) : (
                        formatDate(route.effective_date)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{route.source_document}</td>
                    <td className="px-4 py-3">
                      {editingId === route.id ? (
                        <select
                          value={editForm.status}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as RouteStatus }))}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[#0077B6] text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            route.status === 'active' ? 'bg-[#27AE60]/10 text-[#27AE60]' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {route.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === route.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdate(route.id)}
                              className="p-2 rounded-lg bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20"
                              disabled={saving}
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                              disabled={saving}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(route)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSoftDelete(route.id)}
                              className="p-2 rounded-lg hover:bg-[#E63946]/10 text-[#E63946]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-500">
            Showing page {pagination.page} of {pagination.totalPages} ({routes.length} on this page, {pagination.total} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
