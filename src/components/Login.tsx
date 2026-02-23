const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

import { useState, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Bus, AlertCircle, Eye, EyeOff, TrendingUp, MapPin, Users, Check, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { getHomePath } from './RouteGuards';

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('https://backend-7cxc.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      setSuccessMessage('Login successful!');

      // If server indicates password change required, redirect to first-login change
      if (data.must_change_password) {
        // persist token and user for change page
        await signIn(data.token, data.user);
        navigate('/first-login-change', { replace: true });
        return;
      }

      // Use AuthProvider to persist and set the authenticated user, then navigate
      await signIn(data.token, data.user);
      const redirect = data?.homePath || data?.user?.homePath || getHomePath(data.user);
      navigate(redirect || '/', { replace: true });

    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  const styles: Record<string, CSSProperties> = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
    },
    // Left Side - Form
    leftSide: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      padding: '40px',
      background: 'white',
      overflowY: 'auto' as const,
    },
    leftContent: {
      maxWidth: '480px',
      width: '100%',
      margin: '0 auto',
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#6b7280',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '20px',
      padding: '8px 0',
      transition: 'color 0.2s',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '48px',
    },
    logoIcon: {
      width: '40px',
      height: '40px',
      background: SAFARITIX.primary,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
    },
    logoText: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#2B2D42',
      fontFamily: 'Montserrat, sans-serif',
    },
    heading: {
      fontSize: 'clamp(28px, 4vw, 36px)',
      fontWeight: '700',
      color: '#2B2D42',
      marginBottom: '8px',
      fontFamily: 'Montserrat, sans-serif',
    },
    subheading: {
      fontSize: '16px',
      color: '#6b7280',
      marginBottom: '32px',
    },
    socialButtons: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
    },
    socialBtn: {
      flex: 1,
      padding: '12px 20px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '12px',
      background: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      transition: 'all 0.2s',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      margin: '24px 0',
      color: '#9ca3af',
      fontSize: '14px',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      background: '#e5e7eb',
    },
    dividerText: {
      padding: '0 16px',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '15px',
      outline: 'none',
      transition: 'all 0.2s',
      background: 'white',
    },
    passwordWrapper: {
      position: 'relative' as const,
    },
    passwordToggle: {
      position: 'absolute' as const,
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: '#9ca3af',
      padding: '4px',
    },
    rememberForgot: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    remember: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    checkbox: {
      width: '16px',
      height: '16px',
      cursor: 'pointer',
      accentColor: SAFARITIX.primary,
    },
    rememberLabel: {
      fontSize: '14px',
      color: '#6b7280',
    },
    forgotLink: {
      fontSize: '14px',
      color: SAFARITIX.primary,
      textDecoration: 'none',
      fontWeight: '500',
    },
    submitBtn: {
      width: '100%',
      padding: '14px',
      background: SAFARITIX.primary,
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginBottom: '20px',
    },
    footer: {
      textAlign: 'center' as const,
      fontSize: '14px',
      color: '#6b7280',
    },
    link: {
      color: SAFARITIX.primary,
      textDecoration: 'none',
      fontWeight: '500',
    },
    // Right Side - Info Panel
    rightSide: {
      flex: 1,
      background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
      padding: '60px',
      color: 'white',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    rightContent: {
      position: 'relative' as const,
      zIndex: 2,
    },
    rightHeading: {
      fontSize: 'clamp(32px, 4vw, 48px)',
      fontWeight: '700',
      marginBottom: '16px',
      fontFamily: 'Montserrat, sans-serif',
      lineHeight: '1.2',
    },
    rightSubheading: {
      fontSize: '18px',
      marginBottom: '48px',
      opacity: 0.95,
      lineHeight: '1.6',
    },
    statsCard: {
      background: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    statsHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    },
    statsTitle: {
      fontSize: '14px',
      opacity: 0.9,
    },
    statsValue: {
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '8px',
    },
    statsChange: {
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    features: {
      marginTop: '40px',
    },
    feature: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px',
    },
    featureIcon: {
      width: '24px',
      height: '24px',
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    trustedBy: {
      marginTop: '60px',
      paddingTop: '40px',
      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    },
    trustedTitle: {
      fontSize: '14px',
      marginBottom: '20px',
      opacity: 0.8,
    },
    logos: {
      display: 'flex',
      gap: '32px',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
    },
    logoItem: {
      opacity: 0.7,
      fontSize: '20px',
      fontWeight: '600',
    },
    // Decorative elements
    circle1: {
      position: 'absolute' as const,
      width: '400px',
      height: '400px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.05)',
      top: '-100px',
      right: '-100px',
      zIndex: 1,
    },
    circle2: {
      position: 'absolute' as const,
      width: '300px',
      height: '300px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.05)',
      bottom: '-50px',
      left: '-50px',
      zIndex: 1,
    },
  };

  return (
    <div style={styles.container}>
      {/* Left Side - Form */}
      <div style={styles.leftSide}>
        <div style={styles.leftContent}>
          {/* Back to Home */}
          <Link to="/" style={styles.backButton as any} onMouseEnter={(e) => e.currentTarget.style.color = '#0077B6'} onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}>
            <ArrowLeft size={16} />
            Back to home
          </Link>

          {/* Logo */}
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <Bus style={{ width: '24px', height: '24px' }} />
            </div>
            <span style={styles.logoText}>SafariTix</span>
          </div>

          {/* Heading */}
          <h1 style={styles.heading}>Welcome Back</h1>
          <p style={styles.subheading}>
            Sign in to your account to continue your journey with smart bus ticketing.
          </p>

          {/* Social Login Buttons */}
          <div style={styles.socialButtons}>
            <button
              style={styles.socialBtn}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200" style={{ marginBottom: '20px' }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: '#E63946' }} />
              <AlertDescription style={{ color: '#991B1B' }}>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4 bg-green-50 border-green-200" style={{ marginBottom: '20px' }}>
              <Check style={{ width: '16px', height: '16px', color: '#27AE60' }} />
              <AlertDescription style={{ color: '#166534' }}>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={styles.input}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0077B6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                required
              />
            </div>

            {/* Password */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={styles.input}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#0077B6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                  required
                />
                <button
                  type="button"
                  style={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div style={styles.rememberForgot}>
              <div style={styles.remember}>
                <input
                  type="checkbox"
                  id="remember"
                  style={styles.checkbox}
                />
                <label htmlFor="remember" style={styles.rememberLabel}>
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" style={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              style={styles.submitBtn}
              className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-primary hover:opacity-95"
              disabled={isLoading}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#005a8c')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.background = '#0077B6')}
            >
              {isLoading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p style={styles.footer}>
            Don't have an account?{' '}
            <Link to="/app/signup" style={styles.link}>
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Info Panel */}
      <div style={{ ...styles.rightSide, display: window.innerWidth >= 1024 ? 'flex' : 'none' }}>
        {/* Decorative circles */}
        <div style={styles.circle1} />
        <div style={styles.circle2} />

        <div style={styles.rightContent}>
          <h2 style={styles.rightHeading}>
            Seamless Travel
            <br />
            Starts Here
          </h2>
          <p style={styles.rightSubheading}>
            Access your personalized dashboard with real-time bus tracking and ticket management.
          </p>

          {/* Stats Cards */}
          <div style={styles.statsCard}>
            <div style={styles.statsHeader}>
              <span style={styles.statsTitle}>Active Users</span>
              <Users size={20} />
            </div>
            <div style={styles.statsValue}>12,543</div>
            <div style={styles.statsChange}>
              <TrendingUp size={16} />
              <span>40% last month</span>
            </div>
          </div>

          <div style={styles.statsCard}>
            <div style={styles.statsHeader}>
              <span style={styles.statsTitle}>Buses Tracked</span>
              <MapPin size={20} />
            </div>
            <div style={styles.statsValue}>856</div>
            <div style={styles.statsChange}>
              <TrendingUp size={16} />
              <span>18% last month</span>
            </div>
          </div>

          {/* Features */}
          <div style={styles.features}>
            {[
              'Personalized dashboard',
              'Real-time bus tracking', 
              'Quick ticket booking',
              'Secure payment history'
            ].map((feature, idx) => (
              <div key={idx} style={styles.feature}>
                <div style={styles.featureIcon}>
                  <Check size={16} />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Trusted By */}
          <div style={styles.trustedBy}>
            <p style={styles.trustedTitle}>Trusted by leading transport companies</p>
            <div style={styles.logos}>
              <span style={styles.logoItem}>Volcano</span>
              <span style={styles.logoItem}>Ritco</span>
              <span style={styles.logoItem}>Virunga</span>
              <span style={styles.logoItem}>Onatracom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-specific styles */}
      <style>
        {`
          @media (max-width: 1024px) {
            .container {
              flex-direction: column;
            }
          }
        `}
      </style>
    </div>
  );
}
