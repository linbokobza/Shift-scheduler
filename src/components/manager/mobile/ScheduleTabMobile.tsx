import React, { useState, useEffect } from 'react';
import { Calendar, Send, ChevronLeft, ChevronRight, LayoutGrid, Table2 } from 'lucide-react';
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
  availabilities: Availability[];
  weekStart: Date;
  holidays: Holiday[];
  onGenerateSchedule: () => void;
  onPublishSchedule: () => void;
  isGenerating: boolean;
  isPublishing: boolean;
  onAssignmentChange?: (day: string, shiftId: string, employeeId: string | null) => void;
  onBulkAssignmentChange?: (changes: Array<{ day: string; shiftId: string; employeeId: string | null }>) => void;
}

const STORAGE_KEY = 'manager-schedule-view-mode';

export const ScheduleTabMobile: React.FC<ScheduleTabMobileProps> = ({
  schedule,
  employees,
  availabilities,
  weekStart,
  holidays,
  onGenerateSchedule,
  onPublishSchedule,
  isGenerating,
  isPublishing,
  onAssignmentChange,
  onBulkAssignmentChange
}) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'cards' || saved === 'table') ? saved : 'cards';
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

  const getAvailableCount = (dayIndex: number, shiftId: string) => {
    return availabilities.filter(av =>
      av.shifts[dayIndex.toString()]?.[shiftId]?.status === 'available'
    ).length;
  };

  if (!schedule) {
    return (
      <div className="p-4">
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg mb-2">אין סידור זמין</p>
          <p className="text-gray-500 text-sm mb-4">לחץ ליצירת סידור חדש</p>
          <button
            onClick={onGenerateSchedule}
            disabled={isGenerating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isGenerating ? 'יוצר...' : 'צור סידור'}
          </button>
        </div>
      </div>
    );
  }

  const dayStr = currentDayIndex.toString();

  return (
    <div className="p-4" {...swipeHandlers}>
      {/* Schedule Status */}
      {schedule && !schedule.isPublished && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <h4 className="text-green-900 font-medium text-sm mb-1">סידור נוצר</h4>
          <p className="text-green-700 text-xs mb-3">
            הסידור מוכן. לחץ לפרסם כדי שהעובדים יוכלו לראות
          </p>
          <button
            onClick={onPublishSchedule}
            disabled={isPublishing}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isPublishing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
            ) : (
              <Send className="w-4 h-4 ml-2" />
            )}
            {isPublishing ? 'מפרסם...' : 'פרסם סידור'}
          </button>
        </div>
      )}

      {schedule && schedule.isPublished && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-purple-600 ml-2" />
            <span className="text-purple-900 font-medium text-sm">סידור פורסם</span>
          </div>
        </div>
      )}

      {/* Generate Schedule Button */}
      <button
        onClick={onGenerateSchedule}
        disabled={isGenerating}
        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium mb-4 flex items-center justify-center gap-2"
      >
        <Calendar className="w-5 h-5" />
        {isGenerating ? 'יוצר...' : (schedule ? 'צור סידור חדש' : 'צור סידור')}
      </button>

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
        <>
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
          const availableCount = getAvailableCount(currentDayIndex, shift.id);

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

              <div className="flex items-center justify-between mt-3">
                <div className="flex-1">
                  {assignedEmployee ? (
                    <div>
                      <span className="text-green-700 font-medium text-base">
                        ● {assignedEmployee.name}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">משובץ</div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-red-500 text-base">✕ לא משובץ</span>
                      <div className="text-xs text-gray-500 mt-1">אין שיבוץ</div>
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-600">{availableCount}</div>
                  <div className="text-xs text-gray-500">זמינים</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

          {/* Day Progress Indicator */}
          <div className="text-center text-sm text-gray-500 mt-4">
            יום {currentDayIndex + 1} מתוך 7
          </div>
        </>
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
            readonly={false}
            onBulkAssignmentChange={onBulkAssignmentChange || (() => {})}
          />
        </div>
      )}
    </div>
  );
};
