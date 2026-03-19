import api from './client';
import type { CoinProportion, CoinType } from '../types';

export const listCoinProportions = () =>
  api.get<{ items: CoinProportion[] }>('/coin-proportions').then(r => r.data.items);

export const updateCoinProportion = (coin_type: CoinType, cost_per_message: number) =>
  api.put(`/coin-proportions/${coin_type}`, { cost_per_message }).then(r => r.data);
