// Small fetch helper shared across pages. Adds the Bearer token from
// sessionStorage and surfaces server error messages as thrown Errors.

export function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;
  code: string | null;
  data: Record<string, any> | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    data: Record<string, any> | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function responseError(res: Response): Promise<ApiError> {
  let data: Record<string, any> | null = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(
    typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`,
    res.status,
    typeof data?.code === 'string' ? data.code : null,
    data,
  );
}

export async function apiGet<T = any>(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(path, { headers: authHeaders(), signal: options.signal });
  if (!res.ok) {
    throw await responseError(res);
  }
  return res.json() as Promise<T>;
}

/** Send a write request (POST/PUT/PATCH/DELETE) with auth + JSON body. */
export async function apiSend<T = any>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
  });
  if (!res.ok) {
    throw await responseError(res);
  }
  // Some endpoints may return no body
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** True only in a Vite dev build. Production never falls back to mock data. */
export const IS_DEV: boolean = import.meta.env.DEV;

/**
 * Helper to define mock data that only exists in development builds.
 * In production, this returns undefined and the mock data is tree-shaken.
 */
export function devMock<T>(mock: T): T | undefined {
  return IS_DEV ? mock : undefined;
}

/**
 * Fetch real data from the API, with a development-only mock fallback.
 *
 * - Production (`IS_DEV === false`): always returns live data. Errors propagate
 *   so the page shows a real error/empty state — users never see mock data.
 * - Development: if the request fails, or (when `emptyWhen` matches) returns no
 *   data, the provided `mock` is returned instead so demos/tests stay populated.
 *
 * The returned `source` lets a page show a subtle "Sample data" hint in dev.
 *
 * IMPORTANT: Pass mock data as a function to ensure it's only evaluated in dev.
 * Example: fetchOrMock('/api/data', () => ({ mock: 'data' }))
 */
export async function fetchOrMock<T>(
  path: string,
  mock: T | (() => T),
  opts: { emptyWhen?: (data: T) => boolean } = {},
): Promise<{ data: T; source: 'live' | 'mock' }> {
  const isEmpty =
    opts.emptyWhen ??
    ((d: T) => (Array.isArray(d) ? d.length === 0 : d == null));
  try {
    const data = await apiGet<T>(path);
    if (IS_DEV && isEmpty(data)) return { data: typeof mock === 'function' ? (mock as () => T)() : mock, source: 'mock' };
    return { data, source: 'live' };
  } catch (err) {
    if (IS_DEV) return { data: typeof mock === 'function' ? (mock as () => T)() : mock, source: 'mock' };
    throw err;
  }
}

/** Build a query string from defined, non-"all" params. */
export function qs(params: Record<string, string | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '' && v !== 'all') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
