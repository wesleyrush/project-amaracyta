import { apiGet, apiWrite } from './client';
import type { Child } from '../types';

export const listChildren = () => apiGet<{ items: Child[] }>('/children');

export const createChild = (data: {
  full_name: string;
  initiatic_name?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_country?: string | null;
  birth_state?: string | null;
  birth_city?: string | null;
}) => apiWrite<Child>('/children', 'POST', data);

export const updateChild = (id: number, data: Partial<{
  full_name: string;
  initiatic_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_country: string | null;
  birth_state: string | null;
  birth_city: string | null;
}>) => apiWrite<Child>(`/children/${id}`, 'PUT', data);

export const deleteChild = (id: number) =>
  apiWrite<{ status: 'ok' }>(`/children/${id}`, 'DELETE');
