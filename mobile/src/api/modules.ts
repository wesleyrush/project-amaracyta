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
  moduleQuantities: Record<number, number>,
  paymentMethod: string,
): Promise<{ status: string; order_id: number; quantity: number; price_brl: number; modules: { id: number; name: string }[] }> {
  const res = await apiClient.post('/modules/purchase', {
    module_quantities: moduleQuantities,
    payment_method: paymentMethod,
  });
  return res.data;
}
