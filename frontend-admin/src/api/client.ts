import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// ── CSRF (double-submit cookie) ───────────────────────────────────────────────

function getCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrf(): Promise<string | null> {
  let token = getCsrfCookie();
  if (!token) {
    try {
      await fetch('/api/auth/csrf', { method: 'GET', credentials: 'include' });
      token = getCsrfCookie();
    } catch { /* noop */ }
  }
  return token;
}

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(async config => {
  if (WRITE_METHODS.has((config.method ?? '').toLowerCase())) {
    const token = await ensureCsrf();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

// ── Auth redirect ─────────────────────────────────────────────────────────────

let redirecting = false;

api.interceptors.response.use(
  res => res,
  err => {
    if (
      err.response?.status === 401 &&
      !redirecting &&
      window.location.pathname !== '/login'
    ) {
      redirecting = true;
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
