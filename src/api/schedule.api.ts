import { axiosInstance } from './axios.config';
import { Schedule, ScheduleGenerationResult } from '../types';

export const scheduleAPI = {
  getAll: async (weekStart?: string): Promise<{ schedules: Schedule[] }> => {
    const params = weekStart ? { weekStart } : {};
    const response = await axiosInstance.get('/schedules', { params });
    return response.data;
  },

  getByWeek: async (weekStart: string): Promise<{ schedule: Schedule | null }> => {
    const response = await axiosInstance.get('/schedules/week', {
      params: { weekStart },
    });
    return response.data;
  },

  generate: async (weekStart: string): Promise<ScheduleGenerationResult & { schedule: Schedule }> => {
    const response = await axiosInstance.post('/schedules/generate', { weekStart });
    return response.data;
  },

  update: async (
    id: string,
    data: {
      assignments?: Schedule['assignments'];
      lockedAssignments?: Schedule['lockedAssignments'];
    }
  ): Promise<{ schedule: Schedule }> => {
    const response = await axiosInstance.put(`/schedules/${id}`, data);
    return response.data;
  },

  publish: async (id: string): Promise<{ schedule: Schedule }> => {
    const response = await axiosInstance.patch(`/schedules/${id}/publish`);
    return response.data;
  },

  lockShift: async (
    id: string,
    data: { day: number; shiftId: string; locked: boolean }
  ): Promise<{ schedule: Schedule }> => {
    const response = await axiosInstance.patch(`/schedules/${id}/lock`, data);
    return response.data;
  },
};
