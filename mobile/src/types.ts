export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  role: Role;
  content: string;
  ts?: string;
  hidden?: boolean;
}

export interface SessionListItem {
  id: string;
  title: string;
  module_id?: number | null;
  module_name?: string | null;
  module_slug?: string | null;
  child_id?: number | null;
  child_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  preview?: string | null;
  coins_consumed?: { gold: number; silver: number; bronze: number } | null;
}

export interface Session {
  id: string;
  title: string;
  module_id?: number | null;
  module_name?: string | null;
  module_slug?: string | null;
  child_id?: number | null;
  child_name?: string | null;
  module_use_opening_prompt?: boolean;
  module_opening_prompt?: string | null;
  module_welcome_message?: string | null;
  flow_step?: number;
  flow_next_button?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  messages: Message[];
}

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  initiatic_name?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_country?: string | null;
  birth_state?: string | null;
  birth_city?: string | null;
  is_admin?: boolean;
  is_active?: boolean;
}

export interface Child {
  id: number;
  user_id: number;
  full_name: string;
  initiatic_name?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_country?: string | null;
  birth_state?: string | null;
  birth_city?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserModule {
  module_id: number;
  quantity: number;
  available_qty: number;
  purchased_at?: string | null;
}

export interface CoinChest {
  id: number;
  name: string;
  image_url: string | null;
  coin_type: 'gold' | 'silver' | 'bronze';
  coin_amount: number;
  price_brl: number;
}

export interface Module {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  image_svg?: string | null;
  use_opening_prompt?: boolean;
  opening_prompt?: string | null;
  few_shot?: string | null;
  welcome_message?: string | null;
  system_prompt?: string | null;
  is_active?: boolean;
  module_type?: 'free' | 'fixed';
  price_brl?: number | null;
}

export interface ModulePackage {
  id: number;
  quantity: number;
  price_brl: number;
  description?: string | null;
  is_active?: boolean;
}

export interface SiteSettings {
  site_title?: string;
  logo_url?: string;
  logo_svg?: string;
  site_name?: string | null;
}

export interface CoinBalances {
  gold: number;
  silver: number;
  bronze: number;
}

export interface CoinCosts {
  gold: number;
  silver: number;
  bronze: number;
}
