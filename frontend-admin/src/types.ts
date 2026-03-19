export interface Permission {
  resource: 'agente' | 'clientes' | 'usuarios' | 'cobranca';
  can_insert: number;
  can_update: number;
  can_delete: number;
}

export type CoinType = 'gold' | 'silver' | 'bronze';

export interface CoinChest {
  id: number;
  name: string;
  image_url: string | null;
  coin_amount: number;
  coin_type: CoinType;
  price_brl: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'completed' | 'refunded' | 'cancelled';

export interface CoinOrder {
  id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  chest_name: string;
  coin_type: CoinType;
  coin_label: string;
  coin_amount: number;
  price_brl: number;
  payment_method: string;
  payment_label: string;
  status: OrderStatus;
  status_label: string;
  created_at: string;
}

export interface CoinTransaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'admin_credit' | 'message_debit';
  coin_type: CoinType | null;
  description: string | null;
  created_at: string;
}

export interface CoinProportion {
  id: number;
  coin_type: CoinType;
  cost_per_message: number;
  updated_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  permissions: Permission[];
}

export interface Module {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image_svg: string | null;
  system_prompt: string;
  opening_prompt: string | null;
  few_shot: string | null;
  welcome_message: string | null;
  use_opening_prompt: boolean;
  is_active: number;
  module_type: 'free' | 'fixed';
  price_brl: number | null;
  created_at: string;
}

export interface ModulePackage {
  id: number;
  quantity: number;
  price_brl: number;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: number;
  full_name:      string;
  initiatic_name: string | null;
  email:          string;
  birth_date:     string | null;
  birth_time:     string | null;
  birth_country:  string | null;
  birth_state:    string | null;
  birth_city:     string | null;
  created_at:     string;
  last_login_at:  string | null;
  is_active:      number;
  coins_gold:     number;
  coins_silver:   number;
  coins_bronze:   number;
  session_count:  number;
  message_count:  number;
}

export interface ClientSession {
  id: string;
  full_name: string;
  title: string;
  created_at: string;
  module_name: string | null;
}

export interface ClientMessage {
  id: number;
  session_id: string;
  role: string;
  content: string;
  ts: string;
  coin_value: number | null;
  coin_type: CoinType | null;
  session_title: string;
  module_name: string | null;
}

export interface AdminUserFull {
  id: number;
  name: string;
  cpf: string;
  email: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}
