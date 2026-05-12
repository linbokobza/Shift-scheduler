import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Send, ChevronLeft, ChevronRight, LayoutGrid, Table2, Camera } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Schedule, User, Availability, Holiday } from '../../../types';
import { SHIFTS, DAYS } from '../../../data/mockData';
import { getWeekDates, formatDateHebrew, formatDate } from '../../../utils/dateUtils';
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
  onExtraAssignmentChange?: (day: string, shiftId: string, employeeId: string | null) => void;
  onLockToggle?: (day: string, shiftId: string, locked: boolean) => void;
  onFreezeToggle?: (day: string, shiftId: string, frozen: boolean) => void;
  currentDayIndex?: number;
  onCurrentDayIndexChange?: (index: number) => void;
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
  onBulkAssignmentChange,
  onExtraAssignmentChange,
  onLockToggle,
  onFreezeToggle,
  currentDayIndex: propCurrentDayIndex,
  onCurrentDayIndexChange
}) => {
  // Use prop if provided, otherwise use local state (for backward compatibility)
  const [localCurrentDayIndex, setLocalCurrentDayIndex] = useState(0);
  const currentDayIndex = propCurrentDayIndex ?? localCurrentDayIndex;
  const setCurrentDayIndex = onCurrentDayIndexChange ?? setLocalCurrentDayIndex;

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'cards' || saved === 'table') ? saved : 'table';
  });
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const weekDates = getWeekDates(weekStart);

  const handleExport = async () => {
    setIsExporting(true);

    // Switch to table view temporarily if in cards mode so the ref is populated
    const wasCards = viewMode === 'cards';
    if (wasCards) setViewMode('table');

    // Wait a tick for the DOM to render the table
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!scheduleRef.current) {
      if (wasCards) setViewMode('cards');
      setIsExporting(false);
      return;
    }

    try {
      const { toPng } = await import('html-to-image');

      // Collect all elements that restrict width/overflow and expand them
      const allEls = scheduleRef.current.querySelectorAll<HTMLElement>('*');
      type SavedStyle = { el: HTMLElement; overflow: string; overflowX: string; width: string; maxWidth: string; minWidth: string };
      const saved: SavedStyle[] = [];

      allEls.forEach(el => {
        const cs = getComputedStyle(el);
        const needsFix =
          cs.overflow === 'hidden' || cs.overflow === 'auto' || cs.overflow === 'scroll' ||
          cs.overflowX === 'hidden' || cs.overflowX === 'auto' || cs.overflowX === 'scroll';
        if (needsFix) {
          saved.push({ el, overflow: el.style.overflow, overflowX: el.style.overflowX, width: el.style.width, maxWidth: el.style.maxWidth, minWidth: el.style.minWidth });
          el.style.overflow = 'visible';
          el.style.overflowX = 'visible';
          el.style.width = 'max-content';
          el.style.maxWidth = 'none';
          el.style.minWidth = 'max-content';
        }
      });

      // Also fix the root capture element itself
      const rootOrig = { overflow: scheduleRef.current.style.overflow, width: scheduleRef.current.style.width, maxWidth: scheduleRef.current.style.maxWidth };
      scheduleRef.current.style.overflow = 'visible';
      scheduleRef.current.style.width = 'max-content';
      scheduleRef.current.style.maxWidth = 'none';

      const dataUrl = await toPng(scheduleRef.current, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        width: scheduleRef.current.scrollWidth,
        height: scheduleRef.current.scrollHeight,
      });

      // Restore everything
      scheduleRef.current.style.overflow = rootOrig.overflow;
      scheduleRef.current.style.width = rootOrig.width;
      scheduleRef.current.style.maxWidth = rootOrig.maxWidth;
      saved.forEach(({ el, overflow, overflowX, width, maxWidth, minWidth }) => {
        el.style.overflow = overflow;
        el.style.overflowX = overflowX;
        el.style.width = width;
        el.style.maxWidth = maxWidth;
        el.style.minWidth = minWidth;
      });

      const link = document.createElement('a');
      link.download = `schedule-${formatDate(weekStart)}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('שגיאה בייצוא. אנא נסה שוב.');
    } finally {
      if (wasCards) setViewMode('cards');
      setIsExporting(false);
    }
  };

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
          <p className="text-green-700 text-xs text-center mb-2">
            הסידור מוכן. לחץ לפרסם כדי שהעובדים יוכלו לראות
          </p>
        </div>
      )}

      {schedule && schedule.isPublished && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-4">
          <div className="flex items-center justify-center">
            <Calendar className="w-4 h-4 text-purple-600 ml-1" />
            <span className="text-purple-900 font-medium text-sm">סידור פורסם</span>
          </div>
        </div>
      )}

      {/* Action Buttons - Side by Side */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={onPublishSchedule}
          disabled={isPublishing || !schedule || schedule.isPublished || hasPendingChanges}
          className="flex-1 bg-blue-600 text-white px-3 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm font-medium"
        >
          {isPublishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>מפרסם...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>פרסם סידור</span>
            </>
          )}
        </button>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 bg-green-600 text-white px-3 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm font-medium"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>מייצא...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>שמור כתמונה</span>
            </>
          )}
        </button>

        <button
          onClick={onGenerateSchedule}
          disabled={isGenerating}
          className="flex-1 bg-gray-600 text-white px-3 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm font-medium"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>יוצר...</span>
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              <span>{schedule ? 'צור חדש' : 'צור סידור'}</span>
            </>
          )}
        </button>
      </div>

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
        <div ref={scheduleRef} className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <ScheduleView
            schedule={schedule}
            employees={employees}
            availabilities={availabilities}
            holidays={holidays}
            weekStart={weekStart}
            readonly={false}
            onBulkAssignmentChange={onBulkAssignmentChange || (() => {})}
            onExtraAssignmentChange={onExtraAssignmentChange}
            onLockToggle={onLockToggle}
            onFreezeToggle={onFreezeToggle}
            onPendingChanges={setHasPendingChanges}
            showLockControls={true}
          />
        </div>
      )}
    </div>
  );
};
