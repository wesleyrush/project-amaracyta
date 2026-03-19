import apiClient from './client';
import type { Module, UserModule, ModulePackage } from '../types';

export async function listModules(): Promise<{ items: Module[] }> {
  const res = await apiClient.get<{ items: Module[] }>('/modules');
  return { items: res.data.items ?? [] };
}

export async function listUserModules(): Promise<{ items: UserModule[] }> {
  const res = await apiClient.get<{ items: UserModule[] }>('/modules/user');
  return { items: res.data.items ?? [] };
}

export async function listModulePackages(): Promise<{ items: ModulePackage[] }> {
  const res = await apiClient.get<{ items: ModulePackage[] }>('/modules/packages');
  return { items: res.data.items ?? [] };
}

export async function purchaseModules(
  module_quantities: Record<number, number>,
  payment_method: string,
): Promise<void> {
  await apiClient.post('/modules/purchase', { module_quantities, payment_method });
}
