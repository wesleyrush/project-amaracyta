
import { apiGet, apiWrite } from './client';
import type { User } from '../types';

export const me        = () => apiGet<User>('/auth/me');
export const refresh   = () => apiWrite<{status:'ok'}>('/auth/refresh','POST');
export const logout    = () => apiWrite<{status:'ok'}>('/auth/logout','POST');
export const getProfile= () => apiGet<User>('/auth/profile');
export const putProfile= (payload: Partial<Pick<User,'full_name'|'initiatic_name'|'birth_date'|'birth_time'|'birth_country'|'birth_state'|'birth_city'>>) =>
  apiWrite<User>('/auth/profile','PUT', payload);
export const changePwd = (payload: {current_password:string; new_password:string;}) =>
  apiWrite<{status:'ok'}>('/auth/change-password','POST', payload);

export async function doLogout(): Promise<void> {
  try {
    // 1) dispara o backend para expirar cookies HttpOnly
    await logout();
  } catch {
    // se a rede falhar, ainda assim prossiga limpando o lado cliente
  }

  // 2) limpa storages do app
  try {
    // remova apenas as chaves do app, ou use clear() se preferir
    localStorage.removeItem('CHAT_XAI_BASE_URL');
    sessionStorage.removeItem('csrf_token_memory');
    // localStorage.clear(); sessionStorage.clear(); // se quiser zerar tudo
  } catch {}

  // 3) redireciona para a página de login
  location.href = '/login';
}