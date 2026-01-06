export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export const SHIFTS: Shift[] = [
  {
    id: 'morning',
    name: 'בוקר',
    startTime: '07:30',
    endTime: '15:30',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'evening',
    name: 'ערב',
    startTime: '15:30',
    endTime: '23:30',
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'night',
    name: 'לילה',
    startTime: '23:30',
    endTime: '07:30',
    color: 'bg-purple-100 text-purple-800'
  }
];

export const DAYS = [
  'ראשון',
  'שני',
  'שלישי',
  'רביעי',
  'חמישי',
  'שישי'
];
