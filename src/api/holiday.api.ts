import { axiosInstance } from './axios.config';
import { Holiday } from '../types';

export const holidayAPI = {
  getAll: async (year?: string): Promise<{ holidays: Holiday[] }> => {
    const params = year ? { year } : {};
    const response = await axiosInstance.get('/holidays', { params });
    return response.data;
  },

  create: async (data: {
    date: string;
    name: string;
    type: 'no-work' | 'morning-only';
  }): Promise<{ holiday: Holiday }> => {
    const response = await axiosInstance.post('/holidays', data);
    return response.data;
  },

  update: async (
    id: string,
    data: { name?: string; type?: 'no-work' | 'morning-only' }
  ): Promise<{ holiday: Holiday }> => {
    const response = await axiosInstance.put(`/holidays/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/holidays/${id}`);
  },
};
