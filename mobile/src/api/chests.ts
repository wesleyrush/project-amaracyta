import apiClient from './client';
import type { CoinChest } from '../types';

export async function listChests(): Promise<{ items: CoinChest[] }> {
  const res = await apiClient.get<{ items?: CoinChest[]; chests?: CoinChest[] }>('/chests');
  return { items: res.data.items ?? res.data.chests ?? [] };
}

export interface ChestPurchaseResult {
  chest_name: string;
  coin_type: 'gold' | 'silver' | 'bronze';
  coin_amount: number;
  price_brl: number;
  coins_gold: number;
  coins_silver: number;
  coins_bronze: number;
}

export async function purchaseChest(id: number, method: string): Promise<ChestPurchaseResult> {
  const res = await apiClient.post<ChestPurchaseResult>(`/chests/${id}/purchase`, { payment_method: method });
  return res.data;
}
