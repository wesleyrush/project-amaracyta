import api from './client';
import type { Module } from '../types';

export const listModules = () =>
  api.get<{ items: Module[] }>('/modules').then(r => r.data.items);

export const getModule = (id: number) =>
  api.get<Module>(`/modules/${id}`).then(r => r.data);

export const createModule = (data: Omit<Module, 'id' | 'is_active' | 'created_at'>) =>
  api.post('/modules', data).then(r => r.data);

export const updateModule = (id: number, data: Omit<Module, 'id' | 'is_active' | 'created_at'>) =>
  api.put(`/modules/${id}`, data).then(r => r.data);


export const toggleModule = (id: number) =>
  api.patch(`/modules/${id}/toggle`).then(r => r.data);

export const deleteModule = (id: number) =>
  api.delete(`/modules/${id}`).then(r => r.data);
