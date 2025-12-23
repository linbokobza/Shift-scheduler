import { axiosInstance } from './axios.config';
import { VacationDay } from '../types';

export const vacationAPI = {
  getAll: async (params?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ vacations: VacationDay[] }> => {
    const response = await axiosInstance.get('/vacations', { params });
    return response.data;
  },

  create: async (data: {
    employeeId: string;
    date: string;
    type: 'vacation' | 'sick';
  }): Promise<{ vacation: VacationDay }> => {
    const response = await axiosInstance.post('/vacations', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/vacations/${id}`);
  },
};
