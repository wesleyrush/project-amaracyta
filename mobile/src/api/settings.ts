import apiClient from './client';
import type { SiteSettings } from '../types';

export async function getSettings(): Promise<SiteSettings> {
  const res = await apiClient.get<SiteSettings>('/settings');
  return res.data;
}
