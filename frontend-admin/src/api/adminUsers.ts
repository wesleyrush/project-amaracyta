import api from './client';
import type { AdminUserFull, Permission } from '../types';

export const listAdminUsers = () =>
  api.get<{ items: AdminUserFull[] }>('/admin-users').then(r => r.data.items);

export const getAdminUser = (id: number) =>
  api.get<AdminUserFull>(`/admin-users/${id}`).then(r => r.data);

export const createAdminUser = (data: {
  name: string; cpf: string; email: string;
  password: string; status: string; permissions: Partial<Permission>[];
}) => api.post('/admin-users', data).then(r => r.data);

export const updateAdminUser = (id: number, data: {
  name: string; cpf: string; email: string;
  password?: string; status: string; permissions: Partial<Permission>[];
}) => api.put(`/admin-users/${id}`, data).then(r => r.data);

export const toggleAdminUser = (id: number) =>
  api.patch(`/admin-users/${id}/toggle`).then(r => r.data);

export const deleteAdminUser = (id: number) =>
  api.delete(`/admin-users/${id}`).then(r => r.data);
