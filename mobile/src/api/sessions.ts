import apiClient from './client';
import type { Session, SessionListItem } from '../types';

export async function listSessions(): Promise<SessionListItem[]> {
  const res = await apiClient.get<{ items: SessionListItem[] }>('/sessions');
  return res.data.items ?? [];
}

export async function createSession(moduleId?: number, childId?: number | null): Promise<Session> {
  const res = await apiClient.post<Session>('/sessions', { module_id: moduleId, child_id: childId ?? null });
  return res.data;
}

export async function getSession(cid: string): Promise<Session> {
  const res = await apiClient.get<Session>(`/sessions/${cid}`);
  return res.data;
}

export async function patchTitle(cid: string, title: string): Promise<void> {
  await apiClient.patch(`/sessions/${cid}`, { title });
}

export async function deleteSession(cid: string): Promise<void> {
  await apiClient.delete(`/sessions/${cid}`);
}

export async function flowAdvance(cid: string): Promise<{ flow_step: number; flow_next_button: string | null }> {
  const res = await apiClient.post<{ flow_step: number; flow_next_button: string | null }>(`/sessions/${cid}/flow-advance`);
  return res.data;
}
