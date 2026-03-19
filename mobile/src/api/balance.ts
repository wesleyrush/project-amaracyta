import apiClient from './client';
import type { CoinBalances, CoinCosts } from '../types';

export interface BalanceResponse {
  balances: CoinBalances;
  costs: CoinCosts;
}

export interface Transaction {
  id: number;
  coin_type: 'gold' | 'silver' | 'bronze';
  transaction_type: 'admin_credit' | 'message_debit';
  amount: number;
  description?: string | null;
  created_at: string;
}

export async function getBalance(): Promise<BalanceResponse> {
  const res = await apiClient.get<BalanceResponse>('/auth/balance');
  return res.data;
}

export async function getTransactions(): Promise<Transaction[]> {
  const res = await apiClient.get<{ transactions: Transaction[] }>('/auth/transactions');
  return res.data.transactions ?? [];
}
