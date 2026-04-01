import { useState, useEffect, CSSProperties } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Check, ArrowLeft, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import BrandLogo from '../components/BrandLogo';

const PRIMARY = '#0077B6';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new link.');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8 || !/[0-9]/.test(newPassword) || !/[A-Za-z]/.test(newPassword)) {
      setError('Password must be at least 8 characters and include letters and numbers.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const s: Record<string, CSSProperties> = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '24px' },
    card: { background: 'white', borderRadius: '16px', padding: '48px 40px', maxWidth: '440px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' },
    logoIcon: { width: '36px', height: '36px', background: PRIMARY, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' },
    logoText: { fontSize: '20px', fontWeight: '700', color: '#2B2D42' },
    iconWrap: { width: '56px', height: '56px', background: '#E6F4FB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' },
    heading: { fontSize: '26px', fontWeight: '700', color: '#2B2D42', marginBottom: '8px' },
    sub: { fontSize: '15px', color: '#6b7280', marginBottom: '28px', lineHeight: '1.5' },
    label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' },
    formGroup: { marginBottom: '20px' },
    inputWrap: { position: 'relative' as const },
    input: { width: '100%', padding: '12px 44px 12px 16px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const },
    toggle: { position: 'absolute' as const, right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' },
    btn: { width: '100%', padding: '13px', background: isLoading ? '#93c5fd' : PRIMARY, color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', marginBottom: '16px' },
    back: { display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#6b7280', textDecoration: 'none', fontSize: '14px' },
    successIcon: { width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
    hint: { fontSize: '12px', color: '#9ca3af', marginTop: '6px' },
  };

  if (done) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <BrandLogo imageWidth={184} imageHeight={60} style={{ marginBottom: '32px' }} />
          <div style={s.successIcon}>
            <Check size={32} color="#16a34a" />
          </div>
          <h1 style={{ ...s.heading, textAlign: 'center' }}>Password reset!</h1>
          <p style={{ ...s.sub, textAlign: 'center' }}>
            Your password has been updated successfully. Redirecting you to login…
          </p>
          <Link to="/login" style={s.back as any}>
            <ArrowLeft size={16} /> Go to login now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <BrandLogo imageWidth={184} imageHeight={60} style={{ marginBottom: '32px' }} />

        <div style={s.iconWrap}>
          <Lock size={26} color={PRIMARY} />
        </div>
        <h1 style={s.heading}>Set new password</h1>
        <p style={s.sub}>
          Choose a strong password. You'll be redirected to login once it's saved.
        </p>

        {error && (
          <Alert style={{ marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <AlertCircle size={16} color="#dc2626" />
            <AlertDescription><span style={{ color: '#991b1b' }}>{error}</span></AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div style={s.formGroup}>
            <label style={s.label}>New password</label>
            <div style={s.inputWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={s.input}
                onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                required
              />
              <button type="button" style={s.toggle} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p style={s.hint}>Min 8 characters, must include letters and numbers.</p>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Confirm new password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ ...s.input, marginBottom: 0 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              required
            />
          </div>

          <button type="submit" style={s.btn} disabled={isLoading || !token}>
            {isLoading ? 'Saving…' : 'Reset password'}
          </button>
        </form>

        <Link to="/login" style={s.back as any}>
          <ArrowLeft size={16} /> Back to login
        </Link>
      </div>
    </div>
  );
}
