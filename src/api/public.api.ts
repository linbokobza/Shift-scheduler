import axios from 'axios';
import { Schedule, User, Holiday } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Separate axios instance without JWT interceptor
const publicAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

export interface PublicScheduleResponse {
  schedule: Schedule | null;
  employees: User[];
  holidays: Holiday[];
}

export const publicAPI = {
  getScheduleForWeek: async (weekStart: string): Promise<PublicScheduleResponse> => {
    const response = await publicAxios.get('/public/schedule', {
      params: { weekStart },
    });
    return response.data;
  },
  getLatestSchedule: async (): Promise<PublicScheduleResponse> => {
    const response = await publicAxios.get('/public/schedule/latest');
    return response.data;
  },
};
