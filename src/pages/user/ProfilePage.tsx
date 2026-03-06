import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../components/AuthContext';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profile_image: string | null;
  email_verified: boolean;
}

export default function ProfilePage() {
  const { user, accessToken, signIn } = useAuth();

  // ── profile state ──────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // edit form
  const [form, setForm] = useState({ name: '', phone: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // password form
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Could not load profile');
        setProfile(json.user);
        setForm({ name: json.user.name, phone: json.user.phone || '' });
      } catch (e: any) {
        setLoadError(e.message);
      }
    })();
  }, [accessToken]);

  const currentAvatar = avatarPreview || profile?.profile_image;
  const initials = (profile?.name || user?.name || '?')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ── file select ────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── save profile ───────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!form.name.trim()) return setProfileMsg({ type: 'err', text: 'Full name is required' });
    setSaving(true); setProfileMsg(null);
    try {
      const body = new FormData();
      body.append('full_name', form.name);
      body.append('phone_number', form.phone);
      if (avatarFile) body.append('profile_image', avatarFile);

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed');
      setProfile(json.user);
      if (signIn) await signIn(accessToken || '', { ...(user as any), name: json.user.name, phone: json.user.phone, profile_image: json.user.profile_image });
      if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(null); }
      setAvatarFile(null);
      setProfileMsg({ type: 'ok', text: 'Profile saved successfully' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (e: any) {
      setProfileMsg({ type: 'err', text: e.message });
    } finally { setSaving(false); }
  };

  // ── change password ────────────────────────────────────────────────────────
  const changePassword = async () => {
    if (!pwForm.current || !pwForm.newPw) return setPwMsg({ type: 'err', text: 'Fill in all fields' });
    if (pwForm.newPw.length < 8) return setPwMsg({ type: 'err', text: 'New password must be at least 8 characters' });
    if (pwForm.newPw !== pwForm.confirm) return setPwMsg({ type: 'err', text: 'Passwords do not match' });
    setPwSaving(true); setPwMsg(null);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed');
      setPwForm({ current: '', newPw: '', confirm: '' });
      setPwMsg({ type: 'ok', text: 'Password updated successfully' });
      setTimeout(() => setPwMsg(null), 4000);
    } catch (e: any) {
      setPwMsg({ type: 'err', text: e.message });
    } finally { setPwSaving(false); }
  };

  // ── loading / error state ──────────────────────────────────────────────────
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-6 py-4">{loadError}</div>
    </div>
  );
  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#0077B6] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account information and password</p>
        </div>

        {/* ── Profile card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-800">Personal Information</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {currentAvatar ? (
                <img src={currentAvatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[#0077B6]" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#0077B6] flex items-center justify-center text-white text-2xl font-bold select-none">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:bg-gray-50"
                title="Change photo"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
            </div>
            <div>
              <div className="font-semibold text-slate-900">{profile.name}</div>
              <div className="text-sm text-slate-500 capitalize">{profile.role.replace('_', ' ')}</div>
              <div className="text-xs text-slate-400 mt-0.5">JPG, PNG or WebP · max 2 MB</div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+250 7XX XXX XXX"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-slate-400 cursor-not-allowed"
                value={profile.email}
                readOnly
              />
              <p className="text-xs text-slate-400 mt-1">Email address cannot be changed</p>
            </div>
          </div>

          {profileMsg && (
            <div className={`text-sm px-4 py-2 rounded-lg ${profileMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {profileMsg.text}
            </div>
          )}

          <button
            disabled={saving}
            onClick={saveProfile}
            className="bg-[#0077B6] text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-60 hover:bg-[#005f8e] transition-colors"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

        {/* ── Change password card ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Change Password</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
              value={pwForm.current}
              onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                value={pwForm.newPw}
                onChange={(e) => setPwForm(f => ({ ...f, newPw: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0077B6]"
                value={pwForm.confirm}
                onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              />
            </div>
          </div>

          {pwMsg && (
            <div className={`text-sm px-4 py-2 rounded-lg ${pwMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {pwMsg.text}
            </div>
          )}

          <button
            disabled={pwSaving}
            onClick={changePassword}
            className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-60 hover:bg-slate-700 transition-colors"
          >
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>

      </div>
    </div>
  );
}
