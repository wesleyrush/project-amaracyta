import apiClient from './client';
import type { CoinBalances, CoinCosts } from '../types';

export type { CoinBalances, CoinCosts };

export interface BalanceResponse {
  balances?: CoinBalances;
  costs?: CoinCosts;
  coins_gold?: number;
  coins_silver?: number;
  coins_bronze?: number;
  gold?: number;
  silver?: number;
  bronze?: number;
}

export interface CoinTransactionItem {
  id: number;
  type?: string;
  transaction_type?: string;
  coin_type?: string | null;
  amount: number;
  description?: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  coin_type: 'gold' | 'silver' | 'bronze';
  transaction_type: string;
  amount: number;
  description?: string | null;
  created_at: string;
}

export async function getBalance(): Promise<BalanceResponse> {
  const res = await apiClient.get<BalanceResponse>('/auth/balance');
  return res.data;
}

export async function getTransactions(): Promise<Transaction[]> {
  const res = await apiClient.get<{ transactions?: Transaction[]; items?: Transaction[] }>('/auth/transactions');
  return res.data.transactions ?? res.data.items ?? [];
}
