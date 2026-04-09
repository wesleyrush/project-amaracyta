
import { apiGet, apiWrite } from './client';
import type { Module, ModuleLevel, ModulePackage, ModulePurchaseResult, UserModule } from '../types';

export const listModules = () => apiGet<{ items: Module[] }>('/modules');

export const listModuleLevels = () => apiGet<{ items: ModuleLevel[] }>('/module-levels');

export const listModulePackages = () => apiGet<{ items: ModulePackage[] }>('/module-packages');

export const listUserModules = () =>
  apiGet<{ items: UserModule[]; total_quantity: number; total_active: number; total_available: number }>('/user-modules');

export const purchaseModules = (module_quantities: Record<number, number>, payment_method: string) =>
  apiWrite<ModulePurchaseResult>('/modules/purchase', 'POST', { module_quantities, payment_method });
