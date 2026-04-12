import { axiosInstance } from './axios.config';
import { Schedule, ScheduleGenerationResult } from '../types';

export const scheduleAPI = {
  getAll: async (weekStart?: string): Promise<{ schedules: Schedule[] }> => {
    const params = weekStart ? { weekStart } : {};
    const response = await axiosInstance.get('/schedules', { params });
    return response.data;
  },

  getByWeek: async (weekStart: string): Promise<{ schedule: Schedule | null }> => {
    try {
      const response = await axiosInstance.get('/schedules/week', {
        params: { weekStart },
      });
      return response.data;
    } catch (error: ny) {
      if (error.response?.status === 404) {
        return { schedule: null };
      }
      throw error;
    }
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
      frozenAssignments?: Schedule['frozenAssignments'];
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
