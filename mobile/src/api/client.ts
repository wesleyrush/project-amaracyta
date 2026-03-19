import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_BASE_URL = 'http://10.0.2.2:3002'; // Android emulator → localhost
// For physical devices, change to your machine's LAN IP, e.g. http://192.168.1.x:3002

export async function getBaseUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem('BASE_URL');
  return stored || DEFAULT_BASE_URL;
}

let _csrfToken: string | null = null;
let _baseUrl: string = DEFAULT_BASE_URL;

export async function initClient() {
  _baseUrl = await getBaseUrl();
}

export const apiClient = axios.create({
  withCredentials: false,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach base URL and auth token to every request
apiClient.interceptors.request.use(async (config) => {
  const base = await getBaseUrl();
  if (!config.url?.startsWith('http')) {
    config.url = base + config.url;
  }
  const token = await AsyncStorage.getItem('AUTH_TOKEN');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (_csrfToken) {
    config.headers['X-CSRFToken'] = _csrfToken;
  }
  return config;
});

// On 401, try refresh once
let _refreshing = false;
apiClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && !_refreshing) {
      original._retry = true;
      _refreshing = true;
      try {
        const base = await getBaseUrl();
        const res = await axios.post(`${base}/auth/refresh`, {}, { withCredentials: false });
        const newToken = res.data?.access_token;
        if (newToken) {
          await AsyncStorage.setItem('AUTH_TOKEN', newToken);
          original.headers['Authorization'] = `Bearer ${newToken}`;
          _refreshing = false;
          return apiClient(original);
        }
      } catch {
        await AsyncStorage.removeItem('AUTH_TOKEN');
      }
      _refreshing = false;
    }
    return Promise.reject(err);
  }
);

export async function ensureCsrf(): Promise<void> {
  try {
    const base = await getBaseUrl();
    const res = await axios.get(`${base}/auth/csrf`, { withCredentials: false });
    _csrfToken = res.data?.csrf_token || null;
  } catch {
    // CSRF may not be required
  }
}

export default apiClient;
