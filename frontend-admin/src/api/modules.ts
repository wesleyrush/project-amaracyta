import api from './client';
import type { Module, ModuleFlowStep, ModuleLevel } from '../types';

// Module Levels
export const listModuleLevels = () =>
  api.get<{ items: ModuleLevel[] }>('/module-levels').then(r => r.data.items);

export const getModuleLevel = (id: number) =>
  api.get<ModuleLevel>(`/module-levels/${id}`).then(r => r.data);

export const createModuleLevel = (data: Omit<ModuleLevel, 'id' | 'created_at' | 'updated_at'>) =>
  api.post<ModuleLevel>('/module-levels', data).then(r => r.data);

export const updateModuleLevel = (id: number, data: Omit<ModuleLevel, 'id' | 'created_at' | 'updated_at'>) =>
  api.put<ModuleLevel>(`/module-levels/${id}`, data).then(r => r.data);

export const toggleModuleLevel = (id: number) =>
  api.patch(`/module-levels/${id}/toggle`).then(r => r.data);

export const deleteModuleLevel = (id: number) =>
  api.delete(`/module-levels/${id}`).then(r => r.data);

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

// Flow Steps
export const listFlowSteps = (moduleId: number) =>
  api.get<{ items: ModuleFlowStep[] }>(`/modules/${moduleId}/flow-steps`).then(r => r.data.items);

export const createFlowStep = (moduleId: number, data: Omit<ModuleFlowStep, 'id' | 'module_id' | 'created_at' | 'updated_at'>) =>
  api.post<ModuleFlowStep>(`/modules/${moduleId}/flow-steps`, data).then(r => r.data);

export const updateFlowStep = (moduleId: number, stepId: number, data: Partial<Omit<ModuleFlowStep, 'id' | 'module_id' | 'created_at' | 'updated_at'>>) =>
  api.put<ModuleFlowStep>(`/modules/${moduleId}/flow-steps/${stepId}`, data).then(r => r.data);

export const deleteFlowStep = (moduleId: number, stepId: number) =>
  api.delete(`/modules/${moduleId}/flow-steps/${stepId}`).then(r => r.data);
