import { apiGet } from './client';

export interface SiteSettings {
  site_title?: string;
  logo_url?: string;
  logo_svg?: string;
  login_bg_url?: string;
}

export const getSettings = () => apiGet<SiteSettings>('/settings');
