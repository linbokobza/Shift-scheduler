import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Table2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Schedule, User, Availability, Holiday } from '../../../types';
import { SHIFTS, DAYS } from '../../../data/mockData';
import { getWeekDates, formatDateHebrew } from '../../../utils/dateUtils';
import { useSwipe } from '../../../hooks/useSwipe';
import ScheduleView from '../../ScheduleView';

type ViewMode = 'cards' | 'table';

interface ScheduleTabMobileProps {
  schedule: Schedule | null;
  employees: User[];
  weekStart: Date;
  availabilities?: Availability[];
  holidays?: Holiday[];
}

const STORAGE_KEY = 'employee-schedule-view-mode';

export const ScheduleTabMobile: React.FC<ScheduleTabMobileProps> = ({
  schedule,
  employees,
  weekStart,
  availabilities = [],
  holidays = []
}) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'cards' || saved === 'table') ? saved : 'table';
  });
  const weekDates = getWeekDates(weekStart);

  // Save view mode preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => setCurrentDayIndex(prev => Math.min(6, prev + 1)),
    onSwipeRight: () => setCurrentDayIndex(prev => Math.max(0, prev - 1)),
    threshold: 50
  });

  const handlePrevDay = () => {
    setCurrentDayIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextDay = () => {
    setCurrentDayIndex(prev => Math.min(6, prev + 1));
  };

  if (!schedule) {
    return (
      <div className="p-4">
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-lg mb-2">אין סידור זמין</p>
          <p className="text-gray-500 text-sm">הסידור טרם פורסם לשבוע זה</p>
        </div>
      </div>
    );
  }

  const dayStr = currentDayIndex.toString();

  return (
    <div className="p-4">
      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('cards')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
            viewMode === 'cards'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm font-medium">כרטיסים</span>
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
            viewMode === 'table'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Table2 className="w-4 h-4" />
          <span className="text-sm font-medium">טבלה</span>
        </button>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div {...swipeHandlers}>
          {/* Day Navigator */}
          <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg">
        <button
          onClick={handlePrevDay}
          disabled={currentDayIndex === 0}
          className="p-2 min-h-[44px] min-w-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="יום קודם"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="font-bold text-lg">{DAYS[currentDayIndex]}</div>
          <div className="text-sm text-gray-500">
            {formatDateHebrew(weekDates[currentDayIndex])}
          </div>
        </div>

        <button
          onClick={handleNextDay}
          disabled={currentDayIndex === 6}
          className="p-2 min-h-[44px] min-w-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="יום הבא"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Shift Cards for Current Day */}
      <div className="space-y-3">
        {SHIFTS.map(shift => {
          const assignedEmployeeId = schedule.assignments[dayStr]?.[shift.id];
          const assignedEmployee = employees.find(e => e.id === assignedEmployeeId);

          return (
            <Card key={shift.id} padding="md">
              <div className="flex justify-between items-center mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${shift.color}`}>
                  {shift.name}
                </span>
                <span className="text-xs text-gray-500">
                  {shift.startTime} - {shift.endTime}
                </span>
              </div>

              <div className="text-center mt-3">
                {assignedEmployee ? (
                  <div>
                    <span className="text-green-700 font-medium text-base">
                      {assignedEmployee.name}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">משובץ</div>
                  </div>
                ) : (
                  <div>
                    <span className="text-gray-400 text-base">לא משובץ</span>
                    <div className="text-xs text-gray-500 mt-1">אין שיבוץ</div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

          {/* Day Progress Indicator */}
          <div className="text-center text-sm text-gray-500 mt-4">
            יום {currentDayIndex + 1} מתוך 7
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <ScheduleView
            schedule={schedule}
            employees={employees}
            availabilities={availabilities}
            holidays={holidays}
            weekStart={weekStart}
            readonly={true}
            onBulkAssignmentChange={() => {}}
          />
        </div>
      )}
    </div>
  );
};
