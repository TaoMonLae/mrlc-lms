import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { User } from '../lib/permissions';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── API user → permissions User mapper ───────────────────────────────────────

function mapApiUser(apiUser: Record<string, any>): User {
  return {
    id: apiUser.id,
    name: `${apiUser.firstName ?? ''} ${apiUser.lastName ?? ''}`.trim() || apiUser.email,
    username: apiUser.email,
    email: apiUser.email,
    profilePhotoUrl: apiUser.profilePhotoUrl ?? null,
    role: apiUser.role,
    status: apiUser.isActive ? 'ACTIVE' : 'DISABLED',
    mustChangePassword: Boolean(apiUser.mustChangePassword),
    createdAt: apiUser.createdAt ?? new Date().toISOString(),
    updatedAt: apiUser.updatedAt ?? new Date().toISOString(),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: validate any existing token via /api/auth/me.
  // sessionStorage is the canonical in-app store; "Remember me" additionally
  // mirrors the token to localStorage so it survives browser restarts —
  // restore it into sessionStorage here if the session copy is gone.
  useEffect(() => {
    let token = sessionStorage.getItem('auth_token');
    if (!token) {
      const remembered = localStorage.getItem('auth_token');
      if (remembered) {
        token = remembered;
        sessionStorage.setItem('auth_token', remembered);
        const rememberedUser = localStorage.getItem('auth_user');
        if (rememberedUser) sessionStorage.setItem('auth_user', rememberedUser);
      }
    }
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token invalid or expired');
        return res.json();
      })
      .then((data) => {
        setUser(mapApiUser(data.user));
      })
      .catch(() => {
        // Token is stale — clear it so the user is sent back to login
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe = false
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data.error ?? 'Login failed' };
        }

        sessionStorage.setItem('auth_token', data.token);
        sessionStorage.setItem('auth_user', JSON.stringify(data.user));
        if (rememberMe) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
        } else {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
        setUser(mapApiUser(data.user));

        // Dispatch custom event for other providers to listen to
        window.dispatchEvent(new Event('auth-state-changed'));

        return { success: true };
      } catch {
        return { success: false, error: 'Unable to connect to the server. Please try again.' };
      }
    },
    []
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);

    // Dispatch custom event for other providers to listen to
    window.dispatchEvent(new Event('auth-state-changed'));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
