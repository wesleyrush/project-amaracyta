import { apiGet } from './client';

export interface SiteSettings {
  site_title?: string;
  logo_url?: string;
  logo_svg?: string;
}

export const getSettings = () => apiGet<SiteSettings>('/settings');
