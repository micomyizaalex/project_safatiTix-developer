import { API_BASE_URL, API_URL } from '../config';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizePath = (path: string) => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

export const API_ORIGIN = trimTrailingSlash(API_BASE_URL);
export const SOCKET_ORIGIN = API_ORIGIN;

export const apiUrl = (path: string) => {
  const normalizedPath = normalizePath(path);
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

  if (normalizedPath.startsWith('/api/')) {
    return `${API_ORIGIN}${normalizedPath}`;
  }
  return `${API_URL}${normalizedPath}`;
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
