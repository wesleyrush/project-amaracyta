
import { apiGet, apiWrite } from './client';
import type { Session, SessionListItem } from '../types';

export const listSessions  = () => apiGet<{items:SessionListItem[]}>('/sessions');
export const createSession = (module_id: number, child_id?: number | null) =>
  apiWrite<{id:string; module_id:number; module_slug:string; module_name:string; child_id:number|null; child_name:string|null}>('/sessions','POST', { module_id, child_id: child_id ?? null });
export const getSession    = (cid:string) => apiGet<Session>(`/sessions/${encodeURIComponent(cid)}`);
export const patchTitle    = (cid:string, title:string) =>
  apiWrite<{status:'ok'; id:string; title:string}>(`/sessions/${encodeURIComponent(cid)}`,'PATCH',{ title });
export const deleteSession = (cid:string) =>
  apiWrite<{status:'ok'}>(`/sessions/${encodeURIComponent(cid)}`,'DELETE');
