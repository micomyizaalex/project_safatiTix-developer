import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../components/AuthContext';

export default function PersonalInformation() {
  const { user, accessToken, signIn } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({ name: user?.name || '', email: user?.email || '', phone: (user as any)?.phone || '' });
  }, [user]);

  const currentAvatar = avatarPreview || (user as any)?.profile_image || (user as any)?.avatar_url;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Enter full name';
    if (!form.email.includes('@')) return 'Enter valid email';
    if (form.phone && form.phone.replace(/\D/g, '').length < 8) return 'Enter valid phone';
    return null;
  };

  const cancel = () => {
    setEditing(false);
    setAvatarFile(null);
    if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(null); }
    setForm({ name: user?.name || '', email: user?.email || '', phone: (user as any)?.phone || '' });
    setError(null);
  };

  const save = async () => {
    const v = validate(); if (v) return setError(v);
    setSaving(true); setError(null); setSuccess(null);
    try {
      const hdrs: Record<string, string> = {};
      if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;

      const body = new FormData();
      body.append('full_name', form.name);
      body.append('phone_number', form.phone);
      if (avatarFile) body.append('profile_image', avatarFile);

      const res = await fetch('/api/users/profile', { method: 'PUT', headers: hdrs, body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to save');

      const updated = json.user;
      if (signIn) await signIn(accessToken || '', { ...(user as any), name: updated.name, phone: updated.phone, profile_image: updated.profile_image });
      if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(null); }
      setAvatarFile(null);
      setEditing(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const initials = (user?.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Personal Information</h2>

      {success && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{success}</div>}

      {/* Avatar row */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          {currentAvatar ? (
            <img src={currentAvatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[#0077B6]" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#0077B6] flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
          )}
          {editing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:bg-gray-50"
              title="Change photo"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
        </div>
        <div>
          <div className="font-semibold text-slate-900">{user?.name || '—'}</div>
          <div className="text-sm text-slate-500 capitalize">{(user as any)?.role || ''}</div>
          {editing && <div className="text-xs text-slate-400 mt-1">JPG, PNG or WebP · max 2 MB</div>}
        </div>
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-slate-500">Full name</div>
            <div className="font-semibold text-slate-900">{user?.name || '—'}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-slate-500">Email</div>
            <div className="font-semibold text-slate-900">{user?.email || '—'}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-slate-500">Phone</div>
            <div className="font-semibold text-slate-900">{user?.phone || '—'}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(true)} className="bg-[#0077B6] text-white px-4 py-2 rounded-lg font-semibold">Edit</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-50 text-slate-500 cursor-not-allowed" value={form.email} readOnly />
            <p className="mt-1 text-xs text-slate-400">Email cannot be changed here</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Phone</label>
            <input className="mt-1 w-full border rounded-lg px-3 py-2" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-3">
            <button disabled={saving} onClick={save} className="bg-[#0077B6] text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</button>
            <button onClick={cancel} className="bg-gray-100 px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
