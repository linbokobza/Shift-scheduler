import { axiosInstance } from './axios.config';
import { Availability } from '../types';

export const availabilityAPI = {
  getAll: async (weekStart?: string): Promise<{ availabilities: Availability[] }> => {
    const params = weekStart ? { weekStart } : {};
    const response = await axiosInstance.get('/availabilities', { params });
    return response.data;
  },

  getByEmployee: async (employeeId: string, weekStart: string): Promise<{ availability: Availability | null }> => {
    const response = await axiosInstance.get(`/availabilities/${employeeId}`, {
      params: { weekStart },
    });
    return response.data;
  },

  create: async (data: {
    employeeId: string;
    weekStart: string;
    shifts: Availability['shifts'];
  }): Promise<{ availability: Availability }> => {
    const response = await axiosInstance.post('/availabilities', data);
    return response.data;
  },

  update: async (id: string, data: { shifts: Availability['shifts'] }): Promise<{ availability: Availability }> => {
    const response = await axiosInstance.put(`/availabilities/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/availabilities/${id}`);
  },
};
