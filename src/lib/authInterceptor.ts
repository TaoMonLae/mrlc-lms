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
      const hadToken = !!sessionStorage.getItem('auth_token');

      if (res.status === 401 && isApi && !isLogin && hadToken) {
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
