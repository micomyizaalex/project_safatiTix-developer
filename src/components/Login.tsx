const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
  secondary: '#F4A261',
  success: '#27AE60',
  danger: '#E63946',
  neutral: '#2B2D42',
  lightGray: '#F5F7FA',
};

import { useState, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Check, ArrowLeft, Bus, Zap, Shield, Clock } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { getHomePath } from './RouteGuards';
import BrandLogo from './BrandLogo';

export function Login() {
  // ===== ALL ORIGINAL LOGIC - UNCHANGED =====
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleResend() {
    if (!emailNotVerified) return;
    setResendLoading(true);
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailNotVerified }),
    }).catch(() => {});
    setResendLoading(false);
    setResendSent(true);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
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
        if (response.status === 403 && data.code === 'EMAIL_NOT_VERIFIED') {
          setEmailNotVerified(data.email || loginEmail);
          throw new Error(data.error);
        }
        throw new Error(data.error || 'Invalid credentials');
      }

      setSuccessMessage('Login successful!');

      if (data.must_change_password) {
        await signIn(data.token, data.user);
        navigate('/first-login-change', { replace: true });
        return;
      }

      await signIn(data.token, data.user);
      const redirect = data?.homePath || data?.user?.homePath || getHomePath(data.user);
      navigate(redirect || '/', { replace: true });

    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }
  // ===== END ORIGINAL LOGIC =====

  // ===== NEW UI STYLES - MODERN & PREMIUM =====
  const styles: Record<string, CSSProperties> = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      background: SAFARITIX.lightGray,
    },
    
    // Left Column - Form Section
    formSection: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'white',
      position: 'relative' as const,
    },
    
    formContainer: {
      width: '100%',
      maxWidth: '440px',
    },
    
    backLink: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      color: '#6b7280',
      fontSize: '14px',
      fontWeight: '500',
      textDecoration: 'none',
      marginBottom: '32px',
      transition: 'color 0.2s',
    },
    
    logoSection: {
      marginBottom: '40px',
    },
    
    heading: {
      fontSize: '32px',
      fontWeight: '700',
      color: SAFARITIX.neutral,
      marginBottom: '8px',
      fontFamily: 'Montserrat, sans-serif',
      letterSpacing: '-0.02em',
    },
    
    subheading: {
      fontSize: '15px',
      color: '#6b7280',
      lineHeight: '1.6',
      marginBottom: '32px',
    },
    
    googleButton: {
      width: '100%',
      padding: '14px 20px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      background: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#374151',
      transition: 'all 0.2s',
      marginBottom: '24px',
    },
    
    divider: {
      display: 'flex',
      alignItems: 'center',
      margin: '28px 0',
    },
    
    dividerLine: {
      flex: 1,
      height: '1px',
      background: '#e5e7eb',
    },
    
    dividerText: {
      padding: '0 16px',
      fontSize: '13px',
      fontWeight: '500',
      color: '#9ca3af',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    
    formGroup: {
      marginBottom: '20px',
    },
    
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: SAFARITIX.neutral,
      marginBottom: '8px',
    },
    
    input: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '15px',
      color: SAFARITIX.neutral,
      outline: 'none',
      transition: 'all 0.2s',
      background: 'white',
      fontFamily: 'inherit',
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
      transition: 'color 0.2s',
    },
    
    rememberForgot: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '28px',
    },
    
    rememberBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: SAFARITIX.primary,
    },
    
    checkboxLabel: {
      fontSize: '14px',
      color: '#6b7280',
      fontWeight: '500',
      cursor: 'pointer',
    },
    
    forgotLink: {
      fontSize: '14px',
      color: SAFARITIX.primary,
      textDecoration: 'none',
      fontWeight: '600',
      transition: 'color 0.2s',
    },
    
    loginButton: {
      width: '100%',
      padding: '16px',
      background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      marginBottom: '24px',
      boxShadow: `0 8px 24px ${SAFARITIX.primary}40`,
    },
    
    signupPrompt: {
      textAlign: 'center' as const,
      fontSize: '14px',
      color: '#6b7280',
      fontWeight: '500',
    },
    
    signupLink: {
      color: SAFARITIX.primary,
      textDecoration: 'none',
      fontWeight: '700',
      transition: 'color 0.2s',
    },
    
    // Right Column - Brand Section
    brandSection: {
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
    
    brandContent: {
      position: 'relative' as const,
      zIndex: 2,
    },
    
    brandHeading: {
      fontSize: '48px',
      fontWeight: '800',
      marginBottom: '20px',
      fontFamily: 'Montserrat, sans-serif',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
    },
    
    brandSubheading: {
      fontSize: '18px',
      lineHeight: '1.7',
      opacity: 0.95,
      marginBottom: '56px',
      maxWidth: '480px',
    },
    
    featureGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px',
      marginBottom: '48px',
    },
    
    featureCard: {
      background: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      transition: 'all 0.3s',
    },
    
    featureIcon: {
      width: '48px',
      height: '48px',
      background: 'rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
    },
    
    featureTitle: {
      fontSize: '16px',
      fontWeight: '700',
      marginBottom: '8px',
    },
    
    featureDescription: {
      fontSize: '14px',
      opacity: 0.9,
      lineHeight: '1.5',
    },
    
    statsRow: {
      display: 'flex',
      gap: '32px',
      paddingTop: '32px',
      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    },
    
    statItem: {
      flex: 1,
    },
    
    statValue: {
      fontSize: '32px',
      fontWeight: '800',
      marginBottom: '4px',
      fontFamily: 'Montserrat, sans-serif',
    },
    
    statLabel: {
      fontSize: '13px',
      opacity: 0.85,
      fontWeight: '500',
    },
    
    // Decorative Elements
    decorCircle1: {
      position: 'absolute' as const,
      width: '500px',
      height: '500px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.06)',
      top: '-150px',
      right: '-150px',
      zIndex: 1,
    },
    
    decorCircle2: {
      position: 'absolute' as const,
      width: '350px',
      height: '350px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.06)',
      bottom: '-100px',
      left: '-100px',
      zIndex: 1,
    },
  };

  return (
    <div style={styles.container}>
      {/* LEFT - FORM SECTION */}
      <div style={styles.formSection}>
        <div style={styles.formContainer}>
          {/* Back to Home */}
          <Link
            to="/"
            style={styles.backLink}
            onMouseEnter={(e) => e.currentTarget.style.color = SAFARITIX.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            <ArrowLeft size={18} />
            Back to home
          </Link>

          {/* Logo */}
          <div style={styles.logoSection}>
            <BrandLogo imageWidth={180} imageHeight={60} />
          </div>

          {/* Heading */}
          <h1 style={styles.heading}>Welcome Back</h1>
          <p style={styles.subheading}>
            Sign in to access your personalized dashboard and manage your journeys seamlessly.
          </p>

          {/* Google Sign In */}
          <button
            style={styles.googleButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.borderColor = SAFARITIX.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert style={{ marginBottom: emailNotVerified ? '8px' : '20px', background: '#FEF2F2', border: `2px solid ${SAFARITIX.danger}30`, borderRadius: '12px', padding: '14px 16px' }}>
              <AlertCircle style={{ width: '18px', height: '18px', color: SAFARITIX.danger }} />
              <AlertDescription style={{ color: '#991B1B', fontSize: '14px', fontWeight: '500' }}>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email Verification Notice */}
          {emailNotVerified && (
            <div style={{ 
              background: '#FFFBEB', 
              border: `2px solid ${SAFARITIX.secondary}60`, 
              borderRadius: '12px', 
              padding: '14px 16px', 
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {resendSent ? (
                <span style={{ color: SAFARITIX.success }}>
                  ✓ Verification email sent to <strong>{emailNotVerified}</strong>
                </span>
              ) : (
                <>
                  <span style={{ color: '#92400e' }}>Email not verified. </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: SAFARITIX.primary, 
                      fontWeight: '700', 
                      cursor: resendLoading ? 'not-allowed' : 'pointer',
                      padding: 0,
                      fontSize: '14px',
                      textDecoration: 'underline',
                    }}
                  >
                    {resendLoading ? 'Sending…' : 'Resend verification'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <Alert style={{ marginBottom: '20px', background: '#F0FDF4', border: `2px solid ${SAFARITIX.success}30`, borderRadius: '12px', padding: '14px 16px' }}>
              <Check style={{ width: '18px', height: '18px', color: SAFARITIX.success }} />
              <AlertDescription style={{ color: '#166534', fontSize: '14px', fontWeight: '500' }}>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            {/* Email Field */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={styles.input}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = SAFARITIX.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${SAFARITIX.primary}15`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            {/* Password Field */}
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
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = SAFARITIX.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${SAFARITIX.primary}15`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
                <button
                  type="button"
                  style={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseEnter={(e) => e.currentTarget.style.color = SAFARITIX.neutral}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div style={styles.rememberForgot}>
              <div style={styles.rememberBox}>
                <input
                  type="checkbox"
                  id="remember"
                  style={styles.checkbox}
                />
                <label htmlFor="remember" style={styles.checkboxLabel}>
                  Remember me
                </label>
              </div>
              <Link
                to="/forgot-password"
                style={styles.forgotLink}
                onMouseEnter={(e) => e.currentTarget.style.color = SAFARITIX.primaryDark}
                onMouseLeave={(e) => e.currentTarget.style.color = SAFARITIX.primary}
              >
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              style={styles.loginButton}
              disabled={isLoading}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p style={styles.signupPrompt}>
            Don't have an account?{' '}
            <Link
              to="/app/signup"
              style={styles.signupLink}
              onMouseEnter={(e) => e.currentTarget.style.color = SAFARITIX.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.color = SAFARITIX.primary}
            >
              Create free account
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT - BRAND SECTION */}
      <div style={{ ...styles.brandSection, display: window.innerWidth >= 1024 ? 'flex' : 'none' }}>
        {/* Decorative Elements */}
        <div style={styles.decorCircle1} />
        <div style={styles.decorCircle2} />

        <div style={styles.brandContent}>
          {/* Heading */}
          <h2 style={styles.brandHeading}>
            Smart Travel,
            <br />
            Simplified.
          </h2>
          <p style={styles.brandSubheading}>
            Experience seamless bus ticketing with real-time tracking, instant bookings, and secure payments — all in one platform.
          </p>

          {/* Feature Cards */}
          <div style={styles.featureGrid}>
            <div
              style={styles.featureCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              }}
            >
              <div style={styles.featureIcon}>
                <Bus size={24} />
              </div>
              <div style={styles.featureTitle}>Live Tracking</div>
              <div style={styles.featureDescription}>
                Track your bus in real-time and never miss your ride
              </div>
            </div>

            <div
              style={styles.featureCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              }}
            >
              <div style={styles.featureIcon}>
                <Zap size={24} />
              </div>
              <div style={styles.featureTitle}>Instant Booking</div>
              <div style={styles.featureDescription}>
                Book tickets in seconds with our fast checkout
              </div>
            </div>

            <div
              style={styles.featureCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              }}
            >
              <div style={styles.featureIcon}>
                <Shield size={24} />
              </div>
              <div style={styles.featureTitle}>Secure Payments</div>
              <div style={styles.featureDescription}>
                Safe and encrypted transactions every time
              </div>
            </div>

            <div
              style={styles.featureCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              }}
            >
              <div style={styles.featureIcon}>
                <Clock size={24} />
              </div>
              <div style={styles.featureTitle}>24/7 Support</div>
              <div style={styles.featureDescription}>
                Customer support available whenever you need
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>50K+</div>
              <div style={styles.statLabel}>Active Users</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>2M+</div>
              <div style={styles.statLabel}>Tickets Booked</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>850+</div>
              <div style={styles.statLabel}>Routes Covered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Styles */}
      <style>
        {`
          @media (max-width: 1024px) {
            .container {
              flex-direction: column;
            }
          }
          
          @media (max-width: 640px) {
            h1 {
              font-size: 28px !important;
            }
          }
        `}
      </style>
    </div>
  );
}