// Centralized handling for expired/invalid sessions.
// Wraps window.fetch once: if any /api request returns 401 while the user
// had a token, clear the session and send them to the login page. Login
// requests are excluded so a bad password doesn't trigger a redirect.
let installed = false;

export function installAuthInterceptor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await originalFetch(input, init);
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;

      const isApi = url.includes('/api/');
      const isLogin = url.includes('/api/auth/login');
      // Best-effort game endpoints (score saving, progress, leaderboards). A
      // 401 here — e.g. saving a score on loss/forfeit — must NOT tear down the
      // session and bounce the player to /login; components handle these
      // failures quietly. Covers all snake- and checkers-game sub-routes so new
      // endpoints don't reintroduce the logout bug.
      const isOptionalAuth = url.includes('/api/snake-game/') ||
                             url.includes('/api/checkers-game/');
      const hadToken = !!sessionStorage.getItem('auth_token');

      // Don't redirect to login for optional auth endpoints - let components handle 401s gracefully
      if (res.status === 401 && isApi && !isLogin && !isOptionalAuth && hadToken) {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      }
    } catch {
      /* never let the interceptor break a request */
    }
    return res;
  };
}
