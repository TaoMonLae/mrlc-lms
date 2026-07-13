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
  // "identifier" is whatever the person typed into the login field — their
  // email address or their username. The server figures out which it is.
  login: (
    identifier: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  // Patches the in-memory user (and its cached copy in session/local
  // storage) after a self-service change like a personal preference update,
  // without needing a full /api/auth/me round trip or page reload.
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── API user → permissions User mapper ───────────────────────────────────────

function mapApiUser(apiUser: Record<string, any>): User {
  return {
    id: apiUser.id,
    name: `${apiUser.firstName ?? ''} ${apiUser.lastName ?? ''}`.trim() || apiUser.email,
    username: apiUser.username || apiUser.email,
    email: apiUser.email,
    profilePhotoUrl: apiUser.profilePhotoUrl ?? null,
    role: apiUser.role,
    status: apiUser.isActive ? 'ACTIVE' : 'DISABLED',
    mustChangePassword: Boolean(apiUser.mustChangePassword),
    cursorEffect: apiUser.cursorEffect ?? null,
    createdAt: apiUser.createdAt ?? new Date().toISOString(),
    updatedAt: apiUser.updatedAt ?? new Date().toISOString(),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

// sessionStorage is the canonical in-app store; "Remember me" additionally
// mirrors the token to localStorage so it survives browser restarts. Restore
// it into sessionStorage synchronously, during render (NOT inside a
// useEffect below): a fresh tab has no sessionStorage copy yet, and a
// descendant provider (SettingsProvider, which reads sessionStorage in its
// own mount effect to fetch the school's logo/branding) would otherwise
// race this restoration. React fires a child's effects before its parent's,
// so if this copy happened inside AuthProvider's useEffect, SettingsProvider
// could run its effect first, see an empty sessionStorage on that brand-new
// tab, and give up permanently — nothing ever tells it to retry once
// AuthProvider finishes restoring the session a moment later (this is what
// caused the school logo to silently fall back to the default icon on a
// fresh tab/session). Doing this plain, idempotent read/write during render
// instead guarantees it's done before any child even starts rendering,
// since React renders parents top-down.
function restoreRememberedSession() {
  if (sessionStorage.getItem('auth_token')) return;
  const remembered = localStorage.getItem('auth_token');
  if (!remembered) return;
  sessionStorage.setItem('auth_token', remembered);
  const rememberedUser = localStorage.getItem('auth_user');
  if (rememberedUser) sessionStorage.setItem('auth_user', rememberedUser);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  restoreRememberedSession();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: validate any existing token via /api/auth/me.
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(mapApiUser(data.user));
          return;
        }
        // Only 401/403 mean the token itself is bad. Transient failures
        // (429 rate limit, 5xx, network) must NOT log the user out — that
        // was bouncing people to the login page whenever the server was
        // briefly rate-limited or restarting.
        if (res.status === 401 || res.status === 403) {
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('auth_user');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          return;
        }
        // Transient error: fall back to the cached user so the session survives.
        const cached = sessionStorage.getItem('auth_user');
        if (cached) {
          try { setUser(mapApiUser(JSON.parse(cached))); } catch { /* ignore */ }
        }
      })
      .catch(() => {
        // Network error — keep the session; fall back to the cached user.
        const cached = sessionStorage.getItem('auth_user');
        if (cached) {
          try { setUser(mapApiUser(JSON.parse(cached))); } catch { /* ignore */ }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (
      identifier: string,
      password: string,
      rememberMe = false
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password, rememberMe }),
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
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);

    // Dispatch custom event for other providers to listen to
    window.dispatchEvent(new Event('auth-state-changed'));
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    // Keep the cached copy (used to restore on reload / transient errors) in
    // sync too, whichever storage currently holds it.
    for (const storage of [sessionStorage, localStorage]) {
      const cached = storage.getItem('auth_user');
      if (!cached) continue;
      try {
        const parsed = JSON.parse(cached);
        storage.setItem('auth_user', JSON.stringify({ ...parsed, ...patch }));
      } catch { /* ignore malformed cache */ }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
