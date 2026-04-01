const SAFARITIX = {
  primary: "#0077B6",
  primaryDark: "#005F8E",
  primarySoft: "#E6F4FB",
};

import React, { useState, CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import {
  AlertCircle,
  Eye,
  EyeOff,
  TrendingUp,
  MapPin,
  Users,
  Check,
} from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import BrandLogo from "../components/BrandLogo";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null); // set after successful signup

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState("commuter");
  const [companyName, setCompanyName] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedName = signupName.trim();
    const normalizedEmail = signupEmail.trim().toLowerCase();
    const normalizedCompanyName = companyName.trim();

    if (!agreeToTerms) {
      setError("Please agree to the Terms & Privacy");
      return;
    }

    if (!normalizedName || !normalizedEmail || !signupPassword) {
      setError("Please complete all required fields.");
      return;
    }

    if (signupRole === "company_admin" && !normalizedCompanyName) {
      setError("Company name is required for transport company accounts.");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        full_name: normalizedName,
        email: normalizedEmail,
        password: signupPassword,
        role: signupRole,
        company_name:
          signupRole === "company_admin" ? normalizedCompanyName : undefined,
      };

      console.log("Signup payload:", payload);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      let data: Record<string, any> = {};

      if (rawResponse) {
        try {
          data = JSON.parse(rawResponse);
        } catch {
          data = { message: rawResponse };
        }
      }

      if (!response.ok) {
        console.error("Signup failed:", {
          status: response.status,
          payload,
          response: data,
        });

        const backendMessage =
          data.error ||
          data.message ||
          `Signup failed with status ${response.status}`;

        if (backendMessage === "Validation error") {
          throw new Error(
            "That email may already be registered. Try logging in, resetting your password, or using a different email address.",
          );
        }

        throw new Error(
          backendMessage,
        );
      }

      // company_admin gets a token (auto-approved) — log them in directly
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        const role = data.user?.role;
        const rolePath: Record<string, string> = {
          admin: "/dashboard/admin",
          company_admin: "/dashboard/company",
          commuter: "/dashboard/commuter",
          driver: "/dashboard/driver",
        };
        window.location.href = rolePath[role] || "/";
        return;
      }

      // All other roles: email verification required
      setRegisteredEmail(data.email || signupEmail);
    } catch (err: any) {
      console.error("Signup request error:", err);
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const styles: Record<string, CSSProperties> = {
    container: {
      display: "flex",
      minHeight: "100vh",
      fontFamily: "Inter, sans-serif",
    },
    // Left Side - Form
    leftSide: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center",
      padding: "40px",
      background: "white",
      overflowY: "auto" as const,
    },
    leftContent: {
      maxWidth: "480px",
      width: "100%",
      margin: "0 auto",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "48px",
    },
    logoIcon: {
      width: "40px",
      height: "40px",
      background: SAFARITIX.primary,
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
    },
    logoText: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#2B2D42",
      fontFamily: "Montserrat, sans-serif",
    },
    heading: {
      fontSize: "clamp(28px, 4vw, 36px)",
      fontWeight: "700",
      color: "#2B2D42",
      marginBottom: "8px",
      fontFamily: "Montserrat, sans-serif",
    },
    subheading: {
      fontSize: "16px",
      color: "#6b7280",
      marginBottom: "32px",
    },
    socialButtons: {
      display: "flex",
      gap: "12px",
      marginBottom: "24px",
    },
    socialBtn: {
      flex: 1,
      padding: "12px 20px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "12px",
      background: "white",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      transition: "all 0.2s",
    },
    divider: {
      display: "flex",
      alignItems: "center",
      margin: "24px 0",
      color: "#9ca3af",
      fontSize: "14px",
    },
    dividerLine: {
      flex: 1,
      height: "1px",
      background: "#e5e7eb",
    },
    dividerText: {
      padding: "0 16px",
    },
    formGroup: {
      marginBottom: "20px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "8px",
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      border: "1.5px solid #e5e7eb",
      borderRadius: "12px",
      fontSize: "15px",
      outline: "none",
      transition: "all 0.2s",
      background: "white",
    },
    passwordWrapper: {
      position: "relative" as const,
    },
    passwordToggle: {
      position: "absolute" as const,
      right: "16px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: "#9ca3af",
      padding: "4px",
    },
    checkbox: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "24px",
    },
    checkboxInput: {
      width: "18px",
      height: "18px",
      cursor: "pointer",
      accentColor: SAFARITIX.primary,
    },
    checkboxLabel: {
      fontSize: "14px",
      color: "#6b7280",
    },
    link: {
      color: SAFARITIX.primary,
      textDecoration: "none",
      fontWeight: "500",
    },
    submitBtn: {
      width: "100%",
      padding: "14px",
      background: SAFARITIX.primary,
      color: "white",
      border: "none",
      borderRadius: "12px",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
      marginBottom: "20px",
    },
    footer: {
      textAlign: "center" as const,
      fontSize: "14px",
      color: "#6b7280",
    },
    // Right Side - Info Panel
    rightSide: {
      flex: 1,
      background: `linear-gradient(135deg, ${SAFARITIX.primary} 0%, ${SAFARITIX.primaryDark} 100%)`,
      padding: "60px",
      color: "white",
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center",
      position: "relative" as const,
      overflow: "hidden" as const,
    },
    rightContent: {
      position: "relative" as const,
      zIndex: 2,
    },
    rightHeading: {
      fontSize: "clamp(32px, 4vw, 48px)",
      fontWeight: "700",
      marginBottom: "16px",
      fontFamily: "Montserrat, sans-serif",
      lineHeight: "1.2",
    },
    rightSubheading: {
      fontSize: "18px",
      marginBottom: "48px",
      opacity: 0.95,
      lineHeight: "1.6",
    },
    statsCard: {
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(10px)",
      borderRadius: "20px",
      padding: "24px",
      marginBottom: "20px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    statsHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },
    statsTitle: {
      fontSize: "14px",
      opacity: 0.9,
    },
    statsValue: {
      fontSize: "32px",
      fontWeight: "700",
      marginBottom: "8px",
    },
    statsChange: {
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    features: {
      marginTop: "40px",
    },
    feature: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px",
    },
    featureIcon: {
      width: "24px",
      height: "24px",
      background: "rgba(255, 255, 255, 0.2)",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    trustedBy: {
      marginTop: "60px",
      paddingTop: "40px",
      borderTop: "1px solid rgba(255, 255, 255, 0.2)",
    },
    trustedTitle: {
      fontSize: "14px",
      marginBottom: "20px",
      opacity: 0.8,
    },
    logos: {
      display: "flex",
      gap: "32px",
      alignItems: "center",
      flexWrap: "wrap" as const,
    },
    logoItem: {
      opacity: 0.7,
      fontSize: "20px",
      fontWeight: "600",
    },
    // Decorative elements
    circle1: {
      position: "absolute" as const,
      width: "400px",
      height: "400px",
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.05)",
      top: "-100px",
      right: "-100px",
      zIndex: 1,
    },
    circle2: {
      position: "absolute" as const,
      width: "300px",
      height: "300px",
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.05)",
      bottom: "-50px",
      left: "-50px",
      zIndex: 1,
    },
  };

  // Show "check your email" screen after successful registration
  if (registeredEmail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '48px 40px', maxWidth: '440px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <BrandLogo imageWidth={192} imageHeight={62} align="center" style={{ marginBottom: '32px' }} />
          <div style={{ width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Check size={32} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2B2D42', marginBottom: '12px' }}>Check your email</h2>
          <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
            We sent a verification link to <strong>{registeredEmail}</strong>.<br />
            Click the link to activate your account before logging in.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>Didn't receive it? Check your spam folder, or{' '}
            <button
              onClick={async () => {
                await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: registeredEmail }) });
                alert('A new verification email has been sent.');
              }}
              style={{ background: 'none', border: 'none', color: SAFARITIX.primary, fontWeight: '600', cursor: 'pointer', fontSize: '13px', padding: 0 }}
            >resend it</button>.
          </p>
          <Link to="/login" style={{ display: 'inline-block', padding: '12px 28px', background: SAFARITIX.primary, color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px' }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Left Side - Form */}
      <div style={styles.leftSide}>
        <div style={styles.leftContent}>
          {/* Logo */}
          <div style={styles.logo}>
            <BrandLogo imageWidth={196} imageHeight={64} />
          </div>

          {/* Heading */}
          <h1 style={styles.heading}>Get Started Now</h1>
          <p style={styles.subheading}>
            Discover the power of smart bus ticketing to enhance your travel
            experience.
          </p>

          {/* Social Login Buttons */}
          <div style={styles.socialButtons}>
            <button
              style={styles.socialBtn}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f9fafb")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google
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
            <Alert
              style={{
                marginBottom: "20px",
                borderColor: "#E63946",
                background: "#FEE2E2",
              }}
            >
              <AlertCircle
                style={{ width: "16px", height: "16px", color: "#E63946" }}
              />
              <AlertDescription style={{ color: "#991B1B" }}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert
              style={{
                marginBottom: "20px",
                borderColor: "#27AE60",
                background: "#DCFCE7",
              }}
            >
              <Check
                style={{ width: "16px", height: "16px", color: "#27AE60" }}
              />
              <AlertDescription style={{ color: "#166534" }}>
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSignup}>
            {/* Name */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                style={styles.input}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = SAFARITIX.primary)
                }
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                required
              />
            </div>

            {/* Email */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                placeholder="william@company.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                style={styles.input}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = SAFARITIX.primary)
                }
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                required
              />
            </div>

            {/* Password */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  style={styles.input}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = SAFARITIX.primary)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e5e7eb")
                  }
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

            {/* Role Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>I am a</label>
              <Select>
                <SelectContent
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value)}
                  style={{ ...styles.input, appearance: "auto" }}
                >
                  <SelectItem value="commuter">Commuter (Passenger)</SelectItem>
                  <SelectItem value="company_admin">
                    Transport Company
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Name (conditional) */}
            {signupRole === "company_admin" && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Company Name</label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={styles.input}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = SAFARITIX.primary)
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e5e7eb")
                  }
                  required
                />
              </div>
            )}

            {/* Terms Checkbox */}
            <div style={styles.checkbox}>
              <input
                type="checkbox"
                id="terms"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                style={styles.checkboxInput}
              />
              <label htmlFor="terms" style={styles.checkboxLabel}>
                I agree to the{" "}
                <a href="/terms" style={styles.link}>
                  Terms & Privacy
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={isLoading}
              onMouseEnter={(e) =>
                !isLoading &&
                (e.currentTarget.style.background = SAFARITIX.primaryDark)
              }
              onMouseLeave={(e) =>
                !isLoading &&
                (e.currentTarget.style.background = SAFARITIX.primary)
              }
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          {/* Footer */}
          <p style={styles.footer}>
            Already have an account?{" "}
            <Link to="/app/login" style={styles.link}>
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Info Panel */}
      <div
        style={{
          ...styles.rightSide,
          display: window.innerWidth >= 1024 ? "flex" : "none",
        }}
      >
        {/* Decorative circles */}
        <div style={styles.circle1} />
        <div style={styles.circle2} />

        <div style={styles.rightContent}>
          <h2 style={styles.rightHeading}>
            Simplify Your Journey
            <br />
            and Boost Travel Efficiency
          </h2>
          <p style={styles.rightSubheading}>
            Elevate Your Travel with Smart Bus Ticketing Platform.
          </p>

          {/* Stats Cards */}
          <div style={styles.statsCard}>
            <div style={styles.statsHeader}>
              <span style={styles.statsTitle}>Active Users</span>
              <MapPin size={20} />
            </div>
            <div style={styles.statsValue}>12,543</div>
            <div style={styles.statsChange}>
              <TrendingUp size={16} />
              <span>40% last month</span>
            </div>
          </div>

          <div style={styles.statsCard}>
            <div style={styles.statsHeader}>
              <span style={styles.statsTitle}>Monthly Bookings</span>
              <Users size={20} />
            </div>
            <div style={styles.statsValue}>8,234</div>
            <div style={styles.statsChange}>
              <TrendingUp size={16} />
              <span>25% last month</span>
            </div>
          </div>

          {/* Features */}
          <div style={styles.features}>
            {[
              "Instant ticket booking",
              "Real-time bus tracking",
              "Secure payments",
              "Monthly subscriptions",
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
            <p style={styles.trustedTitle}>
              Trusted by leading transport companies
            </p>
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
