import api from './client';
import type { AdminUser } from '../types';

export const login = (email: string, password: string) =>
  api.post<AdminUser>('/auth/login', { email, password }).then(r => r.data);

export const logout = () =>
  api.post('/auth/logout').then(r => r.data);

export const getMe = () =>
  api.get<AdminUser>('/auth/me').then(r => r.data);

export const changePassword = (current_password: string, new_password: string) =>
  api.post('/auth/change-password', { current_password, new_password }).then(r => r.data);
