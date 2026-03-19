import { apiGet } from './client';

export interface BalanceResponse {
  coins_gold: number;
  coins_silver: number;
  coins_bronze: number;
  costs: { gold: number; silver: number; bronze: number };
}

export interface CoinTransactionItem {
  id: number;
  amount: number;
  type: 'admin_credit' | 'message_debit';
  coin_type: 'gold' | 'silver' | 'bronze' | null;
  description: string | null;
  created_at: string;
}

export const getBalance = () => apiGet<BalanceResponse>('/auth/balance');
export const getTransactions = () => apiGet<{ items: CoinTransactionItem[] }>('/auth/transactions');
