import api from './client';
import type { CoinChest } from '../types';

export const listChests   = () => api.get<{ items: CoinChest[] }>('/chests').then(r => r.data.items);
export const getChest     = (id: number) => api.get<CoinChest>(`/chests/${id}`).then(r => r.data);
export const createChest  = (data: Partial<CoinChest>) => api.post('/chests', data).then(r => r.data);
export const updateChest  = (id: number, data: Partial<CoinChest>) => api.put(`/chests/${id}`, data).then(r => r.data);
export const deleteChest  = (id: number) => api.delete(`/chests/${id}`).then(r => r.data);
export const toggleChest  = (id: number) => api.patch(`/chests/${id}/toggle`).then(r => r.data);
