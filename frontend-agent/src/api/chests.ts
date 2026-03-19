import { apiGet, apiWrite } from './client';
import type { CoinChest } from '../types';

export interface PurchaseResult {
  status: string;
  chest_name: string;
  coin_type: 'gold' | 'silver' | 'bronze';
  coin_amount: number;
  price_brl: number;
  coins_gold: number;
  coins_silver: number;
  coins_bronze: number;
}

export const listChests = () =>
  apiGet<{ items: CoinChest[] }>('/chests');

export const purchaseChest = (chestId: number, paymentMethod: string) =>
  apiWrite<PurchaseResult>(`/chests/${chestId}/purchase`, 'POST', { payment_method: paymentMethod });
