import apiClient from './client';
import type { CoinChest } from '../types';

export async function listChests(): Promise<CoinChest[]> {
  const res = await apiClient.get<{ chests: CoinChest[] }>('/chests');
  return res.data.chests ?? [];
}

export async function purchaseChest(
  chestId: number,
  paymentMethod: 'credit_card' | 'pix' | 'boleto'
): Promise<{ ok: boolean; added: number }> {
  const res = await apiClient.post('/chests/purchase', { chest_id: chestId, payment_method: paymentMethod });
  return res.data;
}
