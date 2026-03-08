import { useState, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Bus, AlertCircle, Check, ArrowLeft, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

const PRIMARY = '#0077B6';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setSent(true);
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
    input: { width: '100%', padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '13px', background: isLoading ? '#93c5fd' : PRIMARY, color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', marginBottom: '16px' },
    back: { display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#6b7280', textDecoration: 'none', fontSize: '14px' },
    successIcon: { width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  };

  if (sent) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>
            <div style={s.logoIcon}><Bus size={20} /></div>
            <span style={s.logoText}>SafariTix</span>
          </div>
          <div style={s.successIcon}>
            <Check size={32} color="#16a34a" />
          </div>
          <h1 style={{ ...s.heading, textAlign: 'center' }}>Check your inbox</h1>
          <p style={{ ...s.sub, textAlign: 'center' }}>
            If <strong>{email}</strong> is registered, you'll receive a password reset link shortly. Check your spam folder if it doesn't arrive within a few minutes.
          </p>
          <Link to="/login" style={s.back as any}>
            <ArrowLeft size={16} /> Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIcon}><Bus size={20} /></div>
          <span style={s.logoText}>SafariTix</span>
        </div>

        <div style={s.iconWrap}>
          <Mail size={26} color={PRIMARY} />
        </div>
        <h1 style={s.heading}>Forgot password?</h1>
        <p style={s.sub}>
          No worries! Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <Alert style={{ marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <AlertCircle size={16} color="#dc2626" />
            <AlertDescription><span style={{ color: '#991b1b' }}>{error}</span></AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={s.input}
            onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
            required
          />
          <button type="submit" style={s.btn} disabled={isLoading}>
            {isLoading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <Link to="/login" style={s.back as any}>
          <ArrowLeft size={16} /> Back to login
        </Link>
      </div>
    </div>
  );
}
