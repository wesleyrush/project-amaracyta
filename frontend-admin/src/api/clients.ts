import api from './client';
import type { Client, ClientSession, ClientMessage, CoinTransaction } from '../types';

export const listClients = () =>
  api.get<{ items: Client[] }>('/clients').then(r => r.data.items);

export const getClient = (id: number) =>
  api.get<Client>(`/clients/${id}`).then(r => r.data);

export const updateClient = (id: number, data: Partial<Client>) =>
  api.put(`/clients/${id}`, data).then(r => r.data);

export const toggleClient = (id: number) =>
  api.patch(`/clients/${id}/toggle`).then(r => r.data);

export const deleteClient = (id: number) =>
  api.delete(`/clients/${id}`).then(r => r.data);

export const getClientSessions = (id: number) =>
  api.get<{ items: ClientSession[] }>(`/clients/${id}/sessions`).then(r => r.data.items);

export const getClientMessages = (id: number) =>
  api.get<{ items: ClientMessage[] }>(`/clients/${id}/messages`).then(r => r.data.items);

export const addClientBalance = (id: number, amount: number, coin_type: string, description?: string) =>
  api.post<{ ok: boolean; coins_gold: number; coins_silver: number; coins_bronze: number }>(
    `/clients/${id}/add-balance`, { amount, coin_type, description }
  ).then(r => r.data);

export const getClientTransactions = (id: number) =>
  api.get<{ items: CoinTransaction[] }>(`/clients/${id}/transactions`).then(r => r.data.items);
