import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type User = { id?: string; name?: string; email?: string; phone?: string | null; companyId?: string; companyName?: string; role?: string; homePath?: string; avatar_url?: string | null; profile_image?: string | null } | null;

interface AuthContextValue {
  user: User;
  accessToken?: string;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Initialize auth from localStorage and optionally verify token
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const token = localStorage.getItem('token');
      const stored = localStorage.getItem('user');

      if (!token || !stored) {
        if (mounted) {
          setUser(null);
          setAccessToken(undefined);
          setLoading(false);
        }
        return;
      }

      try {
        // Attempt server verification if endpoint exists
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          if (mounted) {
            setUser(json.user || JSON.parse(stored));
            setAccessToken(token);
            setLoading(false);
          }
          return;
        }
      } catch (e) {
        // ignore and fall back to stored user
      }

      if (mounted) {
        try {
          setUser(JSON.parse(stored));
          setAccessToken(token);
        } catch (e) {
          setUser(null);
          setAccessToken(undefined);
        }
        setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  const signIn = async (token: string, u: User) => {
    // Persist and update state
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u || null));
    setAccessToken(token);
    setUser(u || null);
    setLoading(false);
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAccessToken(undefined);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthProvider;
