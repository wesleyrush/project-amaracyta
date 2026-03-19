import api from './client';
import type { CoinOrder } from '../types';

export interface OrdersResponse {
  total: number;
  page: number;
  limit: number;
  items: CoinOrder[];
}

export const listOrders = (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
  api.get<OrdersResponse>('/orders', { params }).then(r => r.data);

export const refundOrder = (id: number) =>
  api.post<{ ok: boolean; status: string; status_label: string }>(`/orders/${id}/refund`).then(r => r.data);

export const cancelOrder = (id: number) =>
  api.post<{ ok: boolean; status: string; status_label: string }>(`/orders/${id}/cancel`).then(r => r.data);
