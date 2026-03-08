import { useState, useEffect, CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bus, CheckCircle, XCircle, Loader } from 'lucide-react';

const PRIMARY = '#0077B6';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email.');
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message && data.message.toLowerCase().includes('verified')) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, [token]);

  const s: Record<string, CSSProperties> = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '24px' },
    card: { background: 'white', borderRadius: '16px', padding: '48px 40px', maxWidth: '420px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' },
    logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' },
    logoIcon: { width: '36px', height: '36px', background: PRIMARY, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' },
    logoText: { fontSize: '20px', fontWeight: '700', color: '#2B2D42' },
    heading: { fontSize: '24px', fontWeight: '700', color: '#2B2D42', margin: '16px 0 8px' },
    sub: { fontSize: '15px', color: '#6b7280', marginBottom: '28px', lineHeight: '1.5' },
    btn: { display: 'inline-block', padding: '12px 28px', background: PRIMARY, color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px' },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIcon}><Bus size={20} /></div>
          <span style={s.logoText}>SafariTix</span>
        </div>

        {status === 'loading' && (
          <>
            <Loader size={48} color={PRIMARY} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <h2 style={s.heading}>Verifying your email…</h2>
            <p style={s.sub}>Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={56} color="#16a34a" style={{ margin: '0 auto' }} />
            <h2 style={{ ...s.heading, color: '#15803d' }}>Email Verified!</h2>
            <p style={s.sub}>{message}</p>
            <Link to="/login" style={s.btn}>Go to Login</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={56} color="#dc2626" style={{ margin: '0 auto' }} />
            <h2 style={{ ...s.heading, color: '#dc2626' }}>Verification Failed</h2>
            <p style={s.sub}>{message}</p>
            <ResendForm />
          </>
        )}
      </div>
    </div>
  );
}

function ResendForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setSent(true);
    setLoading(false);
  }

  const PRIMARY = '#0077B6';

  if (sent) {
    return <p style={{ fontSize: '14px', color: '#16a34a', marginTop: '16px' }}>If that email is registered and unverified, a new link has been sent.</p>;
  }

  return (
    <form onSubmit={handleResend} style={{ marginTop: '20px' }}>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>Need a new verification link?</p>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
      />
      <button
        type="submit"
        disabled={loading}
        style={{ width: '100%', padding: '10px', background: loading ? '#93c5fd' : PRIMARY, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Sending…' : 'Resend verification email'}
      </button>
    </form>
  );
}
