// api/client.ts (revisado)
import { getCookie } from '../utils/cookies';

/** Chave de override da base (apenas para DEV) */
const BASE_KEY = 'CHAT_XAI_BASE_URL';

/**
 * Em produção (mesma origem), a base deve ser vazia.
 * Em DEV, você pode setar localStorage[BASE_KEY] = 'http://127.0.0.1:8000'
 */
export const getBaseURL = () =>
  (localStorage.getItem(BASE_KEY) || '').replace(/\/+$/, ''); // '' por padrão
export const setBaseURL = (v: string) => localStorage.setItem(BASE_KEY, v);

/** Onde guardamos o CSRF obtido do /auth/csrf */
const CSRF_STORAGE_KEY = 'csrf_token_memory';

function setCsrfToken(v: string | null) {
  if (!v) sessionStorage.removeItem(CSRF_STORAGE_KEY);
  else sessionStorage.setItem(CSRF_STORAGE_KEY, v);
}
function getCsrfToken(): string | null {
  // prioridade: storage; fallback: cookie (same-site)
  return sessionStorage.getItem(CSRF_STORAGE_KEY) || getCookie('csrf_token') || null;
}

/** Prefixo fixo da API na mesma origem */
const API_PREFIX = '/api';

/** Junta base + /api + path, sem barras duplicadas */
function apiURL(path: string): string {
  const base = getBaseURL(); // '' (prod) ou 'http://127.0.0.1:8000' (dev)
  const p = path.startsWith('/') ? path : `/${path}`;
  // Quando base === '', retorna '/api/...'
  return `${base}${API_PREFIX}${p}`.replace(/([^:]\/)\/+/g, '$1');
}

/** Cabeçalho de CSRF (quando disponível) */
function buildCsrfHeader(): Record<string, string> {
  const v = getCsrfToken();
  return v ? { 'X-CSRF-Token': v } : {};
}

/** Util: tenta extrair JSON com {detail|message} para melhor erro */
async function readErrorPayload(r: Response): Promise<string> {
  try {
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await r.json();
      return (data?.detail || data?.message || JSON.stringify(data)) ?? r.statusText;
    }
    return await r.text();
  } catch {
    return r.statusText || 'Erro na requisição';
  }
}

/** Garante CSRF no storage chamando /auth/csrf */
export async function ensureCsrf(): Promise<void> {
  try {
    const r = await fetch(apiURL('/auth/csrf'), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (r.ok) {
      const data = (await r.json().catch(() => null)) as { csrf?: string } | null;
      setCsrfToken(data?.csrf || null);
    }
  } catch {
    /* noop */
  }
}

/** GET com credenciais (cookies) */
export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(apiURL(path), {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) {
    if (r.status === 401) {
      handleUnauthenticated();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    throw new Error(`GET ${path} → ${r.status} ${await readErrorPayload(r)}`);
  }
  return (await r.json()) as T;
}

/** Escritas (POST/PUT/PATCH/DELETE) com CSRF + credenciais */
export async function apiWrite<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T> {
  // 1) Garante CSRF antes de enviar escrita
  await ensureCsrf();

  const mkHeaders = () =>
    ({
      Accept: 'application/json',
      ...(body != null ? { 'Content-Type': 'application/json' } : {}),
      ...buildCsrfHeader(),
    }) as HeadersInit;

  const url = apiURL(path);

  let r = await fetch(url, {
    method,
    credentials: 'include',
    headers: mkHeaders(),
    body: body != null ? JSON.stringify(body) : null,
  });

  // 2) Se 401, tentar refresh uma única vez
  if (r.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      // Re-assegura CSRF após refresh (tokens renovados)
      await ensureCsrf();
      r = await fetch(url, {
        method,
        credentials: 'include',
        headers: mkHeaders(),
        body: body != null ? JSON.stringify(body) : null,
      });
    } else {
      handleUnauthenticated();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  if (!r.ok) {
    if (r.status === 401) {
      handleUnauthenticated();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    throw new Error(`${method} ${path} → ${r.status} ${await readErrorPayload(r)}`);
  }
  // alguns endpoints podem responder 204
  if (r.status === 204) return undefined as unknown as T;

  const ct = r.headers.get('content-type') || '';
  return (ct.includes('application/json') ? r.json() : r.text()) as Promise<T>;
}

/** Callback chamado quando a sessão expira e não é possível renovar */
let _onUnauthenticated: (() => void) | null = null;
let _unauthHandled = false;

export function setUnauthenticatedHandler(fn: () => void) {
  _onUnauthenticated = fn;
}
function handleUnauthenticated() {
  if (_unauthHandled) return;
  _unauthHandled = true;
  _onUnauthenticated?.();
}

/** Tenta /auth/refresh uma única vez; retorna true se sucesso */
async function tryRefresh(): Promise<boolean> {
  try {
    const r = await fetch(apiURL('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Atalhos úteis */
export const api = {
  health: () => apiGet('/healthz'),
  login: (email: string, password: string) => apiWrite('/auth/login', 'POST', { email, password }),
  logout: () => apiWrite('/auth/logout', 'POST'),
  me: () => apiGet('/auth/me'),
  register: (p: {
    email: string; password: string;
    full_name: string;
    initiatic_name?: string | null;
    birth_date?: string | null;
    birth_time?: string | null;
    birth_country?: string | null;
    birth_state?: string | null;
    birth_city?: string | null;
  }) => apiWrite('/auth/register', 'POST', p),
};
``