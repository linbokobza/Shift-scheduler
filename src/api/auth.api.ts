import { axiosInstance } from './axios.config';
import { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (name: string, email: string, password: string, role: 'employee' | 'manager'): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/auth/register', { name, email, password, role });
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post('/auth/logout');
  },

  updatePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await axiosInstance.put('/auth/update-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string; resetToken?: string; resetLink: string }> => {
    const response = await axiosInstance.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },
};
