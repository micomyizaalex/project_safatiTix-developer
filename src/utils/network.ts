const DEFAULT_BACKEND_ORIGIN = 'http://localhost:5000';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizePath = (path: string) => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const rawApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim();
const normalizedApiBase = rawApiBase ? trimTrailingSlash(rawApiBase) : '';

export const API_ORIGIN = normalizedApiBase || (import.meta.env.PROD ? DEFAULT_BACKEND_ORIGIN : '');
export const SOCKET_ORIGIN = API_ORIGIN || DEFAULT_BACKEND_ORIGIN;

export const apiUrl = (path: string) => {
  const normalizedPath = normalizePath(path);
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

  if (!API_ORIGIN) return normalizedPath;

  const originWithoutApi = API_ORIGIN.endsWith('/api') ? API_ORIGIN.slice(0, -4) : API_ORIGIN;
  if (normalizedPath.startsWith('/api/')) {
    return `${originWithoutApi}${normalizedPath}`;
  }
  return `${API_ORIGIN}${normalizedPath}`;
};

export const socketOptions = {
  path: '/socket.io',
  transports: ['websocket', 'polling'] as const,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
};

export const patchApiFetch = () => {
  const globalObj = window as typeof window & { __safaritix_fetch_patched__?: boolean };
  if (globalObj.__safaritix_fetch_patched__) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(apiUrl(input), init);
    }

    if (input instanceof URL && input.pathname.startsWith('/api/')) {
      return originalFetch(apiUrl(`${input.pathname}${input.search}`), init);
    }

    if (typeof Request !== 'undefined' && input instanceof Request) {
      const reqUrl = new URL(input.url);
      if (reqUrl.pathname.startsWith('/api/')) {
        const rewritten = new Request(apiUrl(`${reqUrl.pathname}${reqUrl.search}`), input);
        return originalFetch(rewritten, init);
      }
    }

    return originalFetch(input as RequestInfo, init);
  }) as typeof window.fetch;

  globalObj.__safaritix_fetch_patched__ = true;
};
