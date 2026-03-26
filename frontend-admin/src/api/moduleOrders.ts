import api from './client';
import type { ModuleOrder } from '../types';

export interface ModuleOrdersResponse {
  total: number;
  page: number;
  limit: number;
  items: ModuleOrder[];
}

export const listModuleOrders = (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
  api.get<ModuleOrdersResponse>('/module-orders', { params }).then(r => r.data);

export const cancelModuleOrder = (id: number) =>
  api.post<{ ok: boolean; status: string; status_label: string }>(`/module-orders/${id}/cancel`).then(r => r.data);
