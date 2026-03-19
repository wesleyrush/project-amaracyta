import apiClient from './client';
import type { Child } from '../types';

export async function listChildren(): Promise<{ items: Child[] }> {
  const res = await apiClient.get<{ items: Child[] }>('/children');
  return { items: res.data.items ?? [] };
}

export async function createChild(data: Omit<Child, 'id' | 'user_id' | 'created_at'>): Promise<Child> {
  const res = await apiClient.post<Child>('/children', data);
  return res.data;
}

export async function updateChild(id: number, data: Partial<Omit<Child, 'id' | 'user_id' | 'created_at'>>): Promise<Child> {
  const res = await apiClient.put<Child>(`/children/${id}`, data);
  return res.data;
}

export async function deleteChild(id: number): Promise<void> {
  await apiClient.delete(`/children/${id}`);
}
