
import { apiGet, apiWrite } from './client';
import type { Module, ModulePackage, ModulePurchaseResult, UserModule } from '../types';

export const listModules = () => apiGet<{ items: Module[] }>('/modules');

export const listModulePackages = () => apiGet<{ items: ModulePackage[] }>('/module-packages');

export const listUserModules = () =>
  apiGet<{ items: UserModule[] }>('/user-modules');

export const purchaseModules = (module_quantities: Record<number, number>, payment_method: string) =>
  apiWrite<ModulePurchaseResult>('/modules/purchase', 'POST', { module_quantities, payment_method });
