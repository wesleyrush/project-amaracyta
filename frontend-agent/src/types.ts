
export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  role: Role;
  content: string;
  ts?: string;
}

export interface SessionListItem {
  id: string;
  title: string;
  child_id?: number | null;
  child_name?: string | null;
  module_id?: number | null;
  module_name?: string | null;
  module_slug?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  preview?: string | null;
  coins_consumed?: { gold: number; silver: number; bronze: number } | null;
}

export interface Session {
  id: string;
  title: string;
  child_id?: number | null;
  child_name?: string | null;
  module_id?: number | null;
  module_name?: string | null;
  module_slug?: string | null;
  module_use_opening_prompt?: boolean;
  module_opening_prompt?: string | null;
  module_welcome_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  messages: Message[];
}

export interface User {
  id: number;
  email: string;
  full_name?:      string | null;
  initiatic_name?: string | null;
  birth_date?:     string | null;
  birth_time?:     string | null;
  birth_country?:  string | null;
  birth_state?:    string | null;
  birth_city?:     string | null;
  is_admin?: boolean;
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
  description: string | null;
  is_active: boolean;
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
  created_at: string;
  updated_at: string;
}

export interface UserModule {
  module_id: number;
  quantity: number;
  available_qty: number;
  purchased_at: string;
}

export interface ModulePurchaseResult {
  status: string;
  order_id: number;
  quantity: number;
  price_brl: number;
  modules: { id: number; name: string }[];
}
