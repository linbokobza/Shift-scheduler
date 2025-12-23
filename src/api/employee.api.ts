import { axiosInstance } from './axios.config';
import { User } from '../types';

export const employeeAPI = {
  getAll: async (): Promise<{ employees: User[] }> => {
    const response = await axiosInstance.get('/employees');
    return response.data;
  },

  getById: async (id: string): Promise<{ employee: User }> => {
    const response = await axiosInstance.get(`/employees/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    email: string;
    password: string;
    role?: 'employee' | 'manager';
  }): Promise<{ employee: User }> => {
    const response = await axiosInstance.post('/employees', data);
    return response.data;
  },

  update: async (id: string, data: Partial<User>): Promise<{ employee: User }> => {
    const response = await axiosInstance.put(`/employees/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string): Promise<{ employee: User }> => {
    const response = await axiosInstance.patch(`/employees/${id}/toggle-active`);
    return response.data;
  },
};
