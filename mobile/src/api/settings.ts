import apiClient from './client';
import type { SiteSettings } from '../types';

export type { SiteSettings };

export async function getSettings(): Promise<SiteSettings> {
  try {
    const res = await apiClient.get<SiteSettings>('/settings');
    return res.data;
  } catch { return {}; }
}
