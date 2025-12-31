import { User, Shift, Availability, VacationDay, Schedule } from '../types';

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
  'שישי',
  'שבת'
];

export const USERS: User[] = [
  {
    id: '1',
    name: 'דניאל כהן',
    email: 'daniel@company.com',
    role: 'employee',
    isActive: true
  },
  {
    id: '2',
    name: 'שרה לוי',
    email: 'sarah@company.com',
    role: 'employee',
    isActive: true
  },
  {
    id: '3',
    name: 'מיכאל דוד',
    email: 'michael@company.com',
    role: 'employee',
    isActive: true
  },
  {
    id: '4',
    name: 'רחל אברהם',
    email: 'rachel@company.com',
    role: 'employee',
    isActive: false
  },
  {
    id: 'manager',
    name: 'אלון מנהל',
    email: 'manager@company.com',
    role: 'manager',
    isActive: true
  }
];

// Mock data for demonstration
export const getMockAvailability = (): Availability[] => {
  // Try to load from localStorage first
  const saved = localStorage.getItem('availabilities');
  if (saved) {
    return JSON.parse(saved);
  }
  
  // Return default mock data
  return [
    {
      employeeId: '1',
      weekStart: '2025-02-03', // Updated to match submission week
      shifts: {
        '0': {
          'morning': { status: 'available' },
          'evening': { status: 'unavailable', comment: 'מועדון ספורט' },
          'night': { status: 'unavailable' }
        },
        '1': {
          'morning': { status: 'available' },
          'evening': { status: 'available' },
          'night': { status: 'unavailable' }
        },
        '2': {
          'morning': { status: 'unavailable' },
          'evening': { status: 'available' },
          'night': { status: 'unavailable' }
        },
        '3': {
          'morning': { status: 'available' },
          'evening': { status: 'available' },
          'night': { status: 'unavailable' }
        },
        '4': {
          'morning': { status: 'available' },
          'evening': { status: 'unavailable' },
          'night': { status: 'unavailable' }
        },
        '5': {
          'morning': { status: 'unavailable' },
          'evening': { status: 'unavailable' },
          'night': { status: 'unavailable' }
        },
        '6': {
          'morning': { status: 'unavailable' },
          'evening': { status: 'unavailable' },
          'night': { status: 'unavailable' }
        }
      }
    },
    {
      employeeId: '2',
      weekStart: '2025-02-03',
      shifts: {
        '0': {
          'morning': { status: 'available' },
          'evening': { status: 'available' },
          'night': { status: 'unavailable' }
        },
        '1': {
          'morning': { status: 'available' },
          'evening': { status: 'unavailable' },
          'night': { status: 'available' }
        },
        '2': {
          'morning': { status: 'available' },
          'evening': { status: 'available' },
          'night': { status: 'unavailable' }
        },
        '3': {
          'morning': { status: 'unavailable' },
          'evening': { status: 'available' },
          'night': { status: 'available' }
        },
        '4': {
          'morning': { status: 'available' },
          'evening': { status: 'available' },
          'night': { status: 'unavailable' }
        },
        '5': {
          'morning': { status: 'available' },
          'evening': { status: 'unavailable' },
          'night': { status: 'unavailable' }
        },
        '6': {
          'morning': { status: 'unavailable' },
          'evening': { status: 'unavailable' },
          'night': { status: 'unavailable' }
        }
      }
    },
    {
      employeeId: '3',
      weekStart: '2025-02-03',
      shifts: {
        '0': {
          'morning': { status: 'unavailable' },
          'evening': { status: 'available' },
          'night': { status: 'available' }
        },
        '1': {
          'morning': { status: 'available' },
          'evening': { status: 'available' },
          'night': { status: 'unavailable' }
        },
        '2': {
          'morning': { status: 'available' },
          'evening': { status: 'unavailable' },
          'night': { status: 'available' }
        },
        '3': {
          'morning': { status: 'available' },
          'evening': { status: 'available' },
          'night': { status: 'unavailable' }
        },
        '4': {
          'morning': { status: 'unavailable' },
          'evening': { status: 'available' },
          'night': { status: 'available' }
        },
        '5': {
          'morning': { status: 'available' },
          'evening': { status: 'unavailable' },
          'night': { status: 'unavailable' }
        },
        '6': {
          'morning': { status: 'unavailable' },
          'evening': { status: 'unavailable' },
          'night': { status: 'unavailable' }
        }
      }
    }
  ];
};

export const getMockVacationDays = (): VacationDay[] => {
  // Try to load from localStorage first
  const saved = localStorage.getItem('vacationDays');
  if (saved) {
    return JSON.parse(saved);
  }
  
  // Return default mock data
  return [
    {
      id: '1',
      employeeId: '1',
      date: '2025-01-22',
      type: 'vacation',
      createdAt: '2025-01-15T10:00:00Z'
    }
  ];
};

export const getMockHolidays = (): Holiday[] => {
  // Try to load from localStorage first
  const saved = localStorage.getItem('holidays');
  if (saved) {
    return JSON.parse(saved);
  }
  
  // Return default mock data
  return [
    {
      id: '1',
      date: '2025-02-10',
      name: 'ט"ו בשבט',
      type: 'morning-only',
      createdAt: '2025-01-15T10:00:00Z'
    }
  ];
};

export const mockSchedules: Schedule[] = [
  {
    id: '1',
    weekStart: '2025-01-20',
    assignments: {
      '0': {
        'morning': '1',
        'evening': '2',
        'night': '3'
      },
      '1': {
        'morning': '2',
        'evening': '1',
        'night': null
      },
      '2': {
        'morning': null,
        'evening': '1',
        'night': '2'
      },
      '3': {
        'morning': '1',
        'evening': '2',
        'night': null
      },
      '4': {
        'morning': '1',
        'evening': null,
        'night': '3'
      },
      '5': {
        'morning': '2',
        'evening': null,
        'night': null
      },
      '6': {
        'morning': null,
        'evening': null,
        'night': null
      }
    },
    createdAt: '2025-01-15T14:00:00Z',
    createdBy: 'manager'
  },
  {
    id: '2',
    weekStart: '2025-11-16',
    assignments: {
      '0': {
        'morning': '1',
        'evening': '2',
        'night': '3'
      },
      '1': {
        'morning': '2',
        'evening': '4',
        'night': '1'
      },
      '2': {
        'morning': '3',
        'evening': '1',
        'night': '2'
      },
      '3': {
        'morning': '1',
        'evening': '3',
        'night': '4'
      },
      '4': {
        'morning': '2',
        'evening': '1',
        'night': '3'
      },
      '5': {
        'morning': '1',
        'evening': null,
        'night': null
      },
      '6': {
        'morning': null,
        'evening': null,
        'night': null
      }
    },
    createdAt: '2025-11-09T14:00:00Z',
    createdBy: 'manager'
  }
];