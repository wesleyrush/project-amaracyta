import apiClient, { ensureCsrf } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

export async function login(email: string, password: string): Promise<User> {
  await ensureCsrf();
  const res = await apiClient.post<{ user: User; access_token: string }>('/auth/login', { email, password });
  if (res.data.access_token) await AsyncStorage.setItem('AUTH_TOKEN', res.data.access_token);
  return res.data.user ?? (res.data as any);
}

export async function register(payload: {
  email: string;
  password: string;
  full_name?: string | null;
  initiatic_name?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_country?: string | null;
  birth_state?: string | null;
  birth_city?: string | null;
}): Promise<User> {
  await ensureCsrf();
  const res = await apiClient.post<{ user: User; access_token: string }>('/auth/register', payload);
  if (res.data.access_token) await AsyncStorage.setItem('AUTH_TOKEN', res.data.access_token);
  return res.data.user ?? (res.data as any);
}

export async function me(): Promise<User> {
  const res = await apiClient.get<User>('/auth/me');
  return res.data;
}

export async function refresh(): Promise<void> {
  const res = await apiClient.post<{ access_token: string }>('/auth/refresh');
  if (res.data.access_token) await AsyncStorage.setItem('AUTH_TOKEN', res.data.access_token);
}

export async function logout(): Promise<void> {
  try { await apiClient.post('/auth/logout'); } catch {}
  await AsyncStorage.removeItem('AUTH_TOKEN');
}

export async function getProfile(): Promise<User> {
  const res = await apiClient.get<User>('/auth/profile');
  return res.data;
}

export async function putProfile(data: Partial<User>): Promise<User> {
  const res = await apiClient.put<User>('/auth/profile', data);
  return res.data;
}

export async function changePwd(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
}
