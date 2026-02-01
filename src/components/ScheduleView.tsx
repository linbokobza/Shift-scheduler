import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Lock, Unlock, Save, X, MessageSquare, Snowflake } from 'lucide-react';
import { Schedule, User, Holiday, Availability } from '../types';
import { SHIFTS, DAYS } from '../data/mockData';
import { formatDateHebrew, getWeekDates, formatDate } from '../utils/dateUtils';
import ShiftDropdown from './ShiftDropdown';
import ShiftReplacementModal from './manager/ShiftReplacementModal';

// Color palette for employees
const EMPLOYEE_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-red-100 text-red-800 border-red-200',
];

const EMPLOYEE_COLORS_NO_BORDER = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-teal-100 text-teal-800',
  'bg-red-100 text-red-800',
];

interface ScheduleViewProps {
  schedule: Schedule | null;
  employees: User[];
  availabilities?: Availability[];
  holidays: Holiday[];
  weekStart: Date;
  onAssignmentChange?: (day: string, shiftId: string, employeeId: string | null) => void;
  onBulkAssignmentChange?: (changes: Array<{ day: string; shiftId: string; employeeId: string | null }>) => Promise<void>;
  onLockToggle?: (day: string, shiftId: string, locked: boolean) => void;
  onFreezeToggle?: (day: string, shiftId: string, frozen: boolean) => void;
  onPendingChanges?: (hasPendingChanges: boolean) => void;
  readonly?: boolean;
  showLockControls?: boolean;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  employees,
  availabilities = [],
  holidays,
  weekStart,
  onAssignmentChange,
  onBulkAssignmentChange,
  onLockToggle,
  onFreezeToggle,
  onPendingChanges,
  readonly = false,
  showLockControls = false
}) => {
  console.log('🧊 ScheduleView render - frozenAssignments:', schedule?.frozenAssignments);
  const weekDates = getWeekDates(weekStart);
  const weekStartString = formatDate(weekStart);
  const activeEmployees = employees.filter(emp => emp.role === 'employee' && emp.isActive);

  // State לניהול רשימה נפתחת
  const [openDropdown, setOpenDropdown] = useState<{
    day: string;
    shiftId: string;
  } | null>(null);

  // State למעקב אחר שינויים שלא נשמרו
  const [pendingChanges, setPendingChanges] = useState<Array<{
    day: string;
    shiftId: string;
    employeeId: string | null;
  }>>([]);

  // State לטעינה בזמן שמירה
  const [isSaving, setIsSaving] = useState(false);

  // State למודל החלפת עובדים
  const [replacementModal, setReplacementModal] = useState<{
    day: string;
    shiftId: string;
  } | null>(null);

  // State למודל הערות
  const [commentModal, setCommentModal] = useState<{
    comment: string;
  } | null>(null);

  // Notify parent component about pending changes
  useEffect(() => {
    if (onPendingChanges) {
      onPendingChanges(pendingChanges.length > 0);
    }
  }, [pendingChanges, onPendingChanges]);

  // Get available employees for a specific day and shift
  const getAvailableEmployeesForShift = (dayIndex: number, shiftId: string): User[] => {
    const dayStr = dayIndex.toString();
    return activeEmployees.filter(emp => {
      // Find availability for this employee AND this specific week
      const empAvailability = availabilities.find(
        a => a.employeeId === emp.id && a.weekStart === weekStartString
      );
      if (!empAvailability) return false;
      const shiftStatus = empAvailability.shifts[dayStr]?.[shiftId]?.status;
      return shiftStatus === 'available';
    });
  };

  // Get employee IDs who submitted availability for this week
  const getSubmittedEmployeeIds = (): string[] => {
    return availabilities
      .filter(a => a.weekStart === weekStartString)
      .map(a => a.employeeId);
  };

  const getEmployeeName = (employeeId: string | null): string => {
    if (!employeeId) return '';
    // Special case for 119 emergency service
    if (employeeId === '119-emergency-service') return '119';
    // Note: employees array should only contain role='employee' from backend
    // If you see "עובד לא נמצא", check that backend filters by role='employee' correctly
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) {
      console.error(`[ScheduleView] Employee not found for ID: ${employeeId}`, {
        employeeId,
        availableEmployeeIds: employees.map(e => e.id),
        employeesList: employees
      });
    }
    return employee?.name || `עובד לא נמצא (${employeeId})`;
  };

  const getEmployeeColor = (employeeId: string | null): string => {
    if (!employeeId) return '';
    // Special case for 119 emergency service
    if (employeeId === '119-emergency-service') return 'bg-red-100 text-red-800 border-red-200';
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return 'bg-gray-100 text-gray-800 border-gray-200';

    const employeeIndex = activeEmployees.findIndex(emp => emp.id === employeeId);
    if (employeeIndex === -1) return 'bg-gray-100 text-gray-800 border-gray-200';
    return EMPLOYEE_COLORS[employeeIndex % EMPLOYEE_COLORS.length];
  };

  const getEmployeeColorWithoutBorder = (employeeId: string | null): string => {
    if (!employeeId) return '';
    // Special case for 119 emergency service
    if (employeeId === '119-emergency-service') return 'bg-red-100 text-red-800';
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return 'bg-gray-100 text-gray-800';

    const employeeIndex = activeEmployees.findIndex(emp => emp.id === employeeId);
    if (employeeIndex === -1) return 'bg-gray-100 text-gray-800';
    return EMPLOYEE_COLORS_NO_BORDER[employeeIndex % EMPLOYEE_COLORS_NO_BORDER.length];
  };

  const getHolidayForDay = (dayIndex: number) => {
    const date = weekDates[dayIndex];
    const dateString = formatDate(date);
    return holidays.find(h => h.date === dateString);
  };

  const isHolidayShiftBlocked = (dayIndex: number, shiftId: string) => {
    const holiday = getHolidayForDay(dayIndex);
    if (!holiday) return false;

    if (holiday.type === 'no-work') return true;
    if (holiday.type === 'morning-only' && (shiftId === 'evening' || shiftId === 'night')) return true;

    return false;
  };

  const getEmployeeComment = (employeeId: string | null, dayIndex: number, shiftId: string): string | undefined => {
    if (!employeeId) return undefined;
    const dayStr = dayIndex.toString();
    const empAvailability = availabilities.find(
      a => a.employeeId === employeeId && a.weekStart === weekStartString
    );
    return empAvailability?.shifts[dayStr]?.[shiftId]?.comment;
  };

  const handleAssignmentClick = (day: string, shiftId: string) => {
    if (readonly || !onAssignmentChange) return;

    // Don't allow changes to Friday evening/night
    const dayNum = parseInt(day);
    const isRestrictedTime = (dayNum === 5 && (shiftId === 'evening' || shiftId === 'night'));
    const isHolidayBlocked = isHolidayShiftBlocked(dayNum, shiftId);
    const isLocked = schedule?.lockedAssignments?.[day]?.[shiftId];

    if (isRestrictedTime || isHolidayBlocked || isLocked) return;

    const currentAssignment = schedule?.assignments[day]?.[shiftId];

    // Cycle through available employees
    if (!currentAssignment) {
      // No assignment - assign first active employee
      const firstEmployee = activeEmployees[0];
      onAssignmentChange(day, shiftId, firstEmployee?.id || null);
    } else {
      // Find current employee index
      const currentIndex = activeEmployees.findIndex(emp => emp.id === currentAssignment);
      if (currentIndex === -1) {
        // Current employee not found in active list - assign first active employee
        const firstEmployee = activeEmployees[0];
        onAssignmentChange(day, shiftId, firstEmployee?.id || null);
      } else if (currentIndex === activeEmployees.length - 1) {
        // Last employee - go to unassigned
        onAssignmentChange(day, shiftId, null);
      } else {
        // Go to next employee
        const nextEmployee = activeEmployees[currentIndex + 1];
        onAssignmentChange(day, shiftId, nextEmployee?.id || null);
      }
    }
  };

  const handleLockToggle = (day: string, shiftId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onLockToggle || readonly) return;

    const currentLock = schedule?.lockedAssignments?.[day]?.[shiftId];
    onLockToggle(day, shiftId, !currentLock);
  };

  const handleFreezeToggle = (day: string, shiftId: string, frozen: boolean) => {
    if (!onFreezeToggle || readonly) return;
    onFreezeToggle(day, shiftId, frozen);
  };

  // קבלת ערך משמרת (מקורי או עם שינוי ממתין)
  const getCurrentAssignment = (day: string, shiftId: string): string | null => {
    const pendingChange = pendingChanges.find(c => c.day === day && c.shiftId === shiftId);
    if (pendingChange) return pendingChange.employeeId;
    return schedule?.assignments[day]?.[shiftId] || null;
  };

  // בדיקה האם יש שינוי ממתין לתא זה
  const hasPendingChange = (day: string, shiftId: string): boolean => {
    return pendingChanges.some(c => c.day === day && c.shiftId === shiftId);
  };

  // טיפול בלחיצה על תא - פתיחת מודל החלפה
  const handleCellClick = (day: string, shiftId: string) => {
    if (readonly) return;

    // לא לאפשר שינויים בזמנים מוגבלים, חגים ומשמרות נעולות
    const dayNum = parseInt(day);
    const isRestrictedTime = (dayNum === 5 && (shiftId === 'evening' || shiftId === 'night'));
    const isHolidayBlocked = isHolidayShiftBlocked(dayNum, shiftId);
    const isLocked = schedule?.lockedAssignments?.[day]?.[shiftId];

    if (isRestrictedTime || isHolidayBlocked || isLocked) return;

    // פתיחת מודל החלפה
    setReplacementModal({ day, shiftId });
  };

  // טיפול בבחירת עובד מהרשימה
  const handleEmployeeSelect = (day: string, shiftId: string, employeeId: string | null) => {
    // בדיקה אם זה שונה מהערך המקורי
    const originalValue = schedule?.assignments[day]?.[shiftId] || null;

    if (originalValue === employeeId) {
      // אם זהה לערך המקורי, נמחק שינוי קודם (אם יש)
      setPendingChanges(prev => prev.filter(c => !(c.day === day && c.shiftId === shiftId)));
    } else {
      // הוספה או עדכון של שינוי
      setPendingChanges(prev => {
        const filtered = prev.filter(c => !(c.day === day && c.shiftId === shiftId));
        return [...filtered, { day, shiftId, employeeId }];
      });
    }

    setOpenDropdown(null);
  };

  // שמירת כל השינויים
  const handleSaveChanges = async () => {
    if (pendingChanges.length === 0 || !onBulkAssignmentChange) return;

    setIsSaving(true);
    try {
      await onBulkAssignmentChange(pendingChanges);
      setPendingChanges([]);
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('שגיאה בשמירת השינויים. נסה שוב.');
    } finally {
      setIsSaving(false);
    }
  };

  // ביטול כל השינויים
  const handleCancelChanges = () => {
    setPendingChanges([]);
    setOpenDropdown(null);
  };

  // Handler לשמירה מהמודל
  const handleReplacementSave = (employeeId: string | null) => {
    if (!replacementModal) return;

    handleEmployeeSelect(
      replacementModal.day,
      replacementModal.shiftId,
      employeeId
    );

    setReplacementModal(null);
  };

  if (!schedule) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין סידור לשבוע זה</h3>
        <p className="text-gray-600">לא נוצר עדיין סידור עבודה לשבוע זה</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="bg-green-50 border-b border-green-200 p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Right side - Title and date stacked */}
          <div className="flex flex-col items-end">
            <h3 className="text-base lg:text-lg font-semibold text-green-900 flex items-center">
              <UserIcon className="w-4 h-4 lg:w-5 lg:h-5 ml-1 lg:ml-2" />
              סידור עבודה
            </h3>
            <p className="text-xs lg:text-sm text-green-700 mt-0.5">
              נוצר ב-{new Date(schedule.createdAt).toLocaleDateString('he-IL')}
            </p>
          </div>

          {/* Left side - Pending count and buttons stacked */}
          {pendingChanges.length > 0 && onBulkAssignmentChange && !readonly && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-blue-700 font-medium">
                {pendingChanges.length} ממתינים
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCancelChanges}
                  disabled={isSaving}
                  className="flex items-center gap-0.5 px-2 py-0.5 bg-gray-500 text-white rounded text-[11px] hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                  ביטול
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex items-center gap-0.5 px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      שמור
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Compact Table View */}
      <div className="lg:hidden overflow-x-auto -mx-4 scrollbar-thin">
        <div className="min-w-[600px]">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky-header">
            <tr>
              <th className="px-2 py-2 text-right font-medium text-gray-700 border-b sticky-col bg-gray-50 z-20">
                משמרת
              </th>
              {DAYS.map((day, index) => (
                <th key={index} className="px-2 py-2 text-center font-medium text-gray-700 border-b min-w-[80px]">
                  <div className="text-xs">{day}</div>
                  <div className="text-[10px] text-gray-500 font-normal">
                    {new Date(weekDates[index]).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHIFTS.map((shift) => (
              <tr key={shift.id} className="hover:bg-gray-50">
                <td className="px-2 py-2 border-b sticky-col bg-white z-20">
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${shift.color}`}>
                    {shift.name}
                  </div>
                </td>
                {weekDates.map((date, dayIndex) => {
                  const dayStr = dayIndex.toString();
                  const currentAssignment = getCurrentAssignment(dayStr, shift.id);
                  const employeeName = getEmployeeName(currentAssignment);
                  const employeeColor = getEmployeeColor(currentAssignment);
                  const employeeColorNoBorder = getEmployeeColorWithoutBorder(currentAssignment);
                  const holiday = getHolidayForDay(dayIndex);
                  const isHolidayBlocked = isHolidayShiftBlocked(dayIndex, shift.id);
                  const isRestrictedTime = (dayIndex === 5 && (shift.id === 'evening' || shift.id === 'night'));
                  const isPending = hasPendingChange(dayStr, shift.id);
                  const isDropdownOpen = openDropdown?.day === dayStr && openDropdown?.shiftId === shift.id;
                  const isLocked = schedule?.lockedAssignments?.[dayStr]?.[shift.id];
                  const isFrozen = schedule?.frozenAssignments?.[dayStr]?.[shift.id];
                  const availableEmployees = getAvailableEmployeesForShift(dayIndex, shift.id);
                  const allEmployeeComments = availableEmployees.reduce((acc, emp) => {
                    const comment = getEmployeeComment(emp.id, dayIndex, shift.id);
                    if (comment) acc[emp.id] = comment;
                    return acc;
                  }, {} as { [key: string]: string });

                  return (
                    <ShiftCell
                      key={dayIndex}
                      dayStr={dayStr}
                      dayIndex={dayIndex}
                      shiftId={shift.id}
                      currentAssignment={currentAssignment}
                      employeeName={employeeName}
                      employeeColor={employeeColor}
                      employeeColorNoBorder={employeeColorNoBorder}
                      holiday={holiday}
                      isHolidayBlocked={isHolidayBlocked}
                      isRestrictedTime={isRestrictedTime}
                      availableEmployees={availableEmployees}
                      isPending={isPending}
                      isDropdownOpen={isDropdownOpen}
                      isLocked={isLocked || false}
                      isFrozen={isFrozen || false}
                      readonly={readonly}
                      showLockControls={showLockControls}
                      employees={employees}
                      employeeComment={getEmployeeComment(currentAssignment, dayIndex, shift.id)}
                      allEmployeeComments={allEmployeeComments}
                      onCellClick={handleCellClick}
                      onEmployeeSelect={handleEmployeeSelect}
                      onDropdownClose={() => setOpenDropdown(null)}
                      onLockToggle={handleLockToggle}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 border-b">
                משמרת
              </th>
              {DAYS.map((day, index) => (
                <th key={index} className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b min-w-32">
                  <div>{day}</div>
                  <div className="text-xs text-gray-500 font-normal">
                    {formatDateHebrew(weekDates[index])}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHIFTS.map((shift) => (
              <tr key={shift.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 border-b">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${shift.color}`}>
                    {shift.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {shift.startTime} - {shift.endTime}
                  </div>
                </td>
                {DAYS.map((_, dayIndex) => {
                  const dayStr = dayIndex.toString();
                  const currentAssignment = getCurrentAssignment(dayStr, shift.id);
                  const employeeName = getEmployeeName(currentAssignment);
                  const employeeColor = getEmployeeColor(currentAssignment);
                  const employeeColorNoBorder = getEmployeeColorWithoutBorder(currentAssignment);
                  const holiday = getHolidayForDay(dayIndex);
                  const isHolidayBlocked = isHolidayShiftBlocked(dayIndex, shift.id);
                  const isRestrictedTime = (dayIndex === 5 && (shift.id === 'evening' || shift.id === 'night'));
                  const availableEmployees = getAvailableEmployeesForShift(dayIndex, shift.id);
                  const isPending = hasPendingChange(dayStr, shift.id);
                  const isDropdownOpen = openDropdown?.day === dayStr && openDropdown?.shiftId === shift.id;

                  const isLocked = schedule?.lockedAssignments?.[dayStr]?.[shift.id];
                  const isFrozen = schedule?.frozenAssignments?.[dayStr]?.[shift.id];
                  const allEmployeeComments = availableEmployees.reduce((acc, emp) => {
                    const comment = getEmployeeComment(emp.id, dayIndex, shift.id);
                    if (comment) acc[emp.id] = comment;
                    return acc;
                  }, {} as { [key: string]: string });

                  return (
                    <ShiftCell
                      key={dayIndex}
                      dayStr={dayStr}
                      dayIndex={dayIndex}
                      shiftId={shift.id}
                      currentAssignment={currentAssignment}
                      employeeName={employeeName}
                      employeeColor={employeeColor}
                      employeeColorNoBorder={employeeColorNoBorder}
                      holiday={holiday}
                      isHolidayBlocked={isHolidayBlocked}
                      isRestrictedTime={isRestrictedTime}
                      availableEmployees={availableEmployees}
                      isPending={isPending}
                      isDropdownOpen={isDropdownOpen}
                      isLocked={isLocked || false}
                      isFrozen={isFrozen || false}
                      readonly={readonly}
                      showLockControls={showLockControls}
                      employees={employees}
                      employeeComment={getEmployeeComment(currentAssignment, dayIndex, shift.id)}
                      allEmployeeComments={allEmployeeComments}
                      onCellClick={handleCellClick}
                      onEmployeeSelect={handleEmployeeSelect}
                      onDropdownClose={() => setOpenDropdown(null)}
                      onLockToggle={handleLockToggle}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shift Replacement Modal */}
      {replacementModal && (
        <ShiftReplacementModal
          isOpen={true}
          onClose={() => setReplacementModal(null)}
          onSave={handleReplacementSave}
          currentEmployeeId={getCurrentAssignment(replacementModal.day, replacementModal.shiftId)}
          allEmployees={activeEmployees}
          availableEmployeeIds={getAvailableEmployeesForShift(
            parseInt(replacementModal.day),
            replacementModal.shiftId
          ).map(e => e.id)}
          submittedEmployeeIds={getSubmittedEmployeeIds()}
          shiftInfo={{
            dayName: DAYS[parseInt(replacementModal.day)],
            shiftName: SHIFTS.find(s => s.id === replacementModal.shiftId)?.name || '',
            shiftTime: `${SHIFTS.find(s => s.id === replacementModal.shiftId)?.startTime || ''} - ${SHIFTS.find(s => s.id === replacementModal.shiftId)?.endTime || ''}`,
            day: replacementModal.day,
            shiftId: replacementModal.shiftId
          }}
          employeeComments={getAvailableEmployeesForShift(
            parseInt(replacementModal.day),
            replacementModal.shiftId
          ).reduce((acc, emp) => {
            const comment = getEmployeeComment(emp.id, parseInt(replacementModal.day), replacementModal.shiftId);
            if (comment) acc[emp.id] = comment;
            return acc;
          }, {} as { [key: string]: string })}
          isFrozen={schedule?.frozenAssignments?.[replacementModal.day]?.[replacementModal.shiftId] || false}
          onFreezeToggle={(frozen) => handleFreezeToggle(replacementModal.day, replacementModal.shiftId, frozen)}
        />
      )}
    </div>
  );
};

// Shift Cell Component - קומפוננטה עצמאית לתא בטבלה
interface ShiftCellProps {
  dayStr: string;
  dayIndex: number;
  shiftId: string;
  currentAssignment: string | null;
  employeeName: string;
  employeeColor: string;
  employeeColorNoBorder: string;
  holiday: Holiday | undefined;
  isHolidayBlocked: boolean;
  isRestrictedTime: boolean;
  availableEmployees: User[];
  isPending: boolean;
  isDropdownOpen: boolean;
  isLocked: boolean;
  isFrozen: boolean;
  readonly: boolean;
  showLockControls: boolean;
  employees: User[];
  employeeComment?: string;
  allEmployeeComments: { [employeeId: string]: string };
  onCellClick: (day: string, shiftId: string) => void;
  onEmployeeSelect: (day: string, shiftId: string, employeeId: string | null) => void;
  onDropdownClose: () => void;
  onLockToggle: (day: string, shiftId: string, event: React.MouseEvent) => void;
}

const ShiftCell: React.FC<ShiftCellProps> = ({
  dayStr,
  dayIndex,
  shiftId,
  currentAssignment,
  employeeName,
  employeeColor,
  employeeColorNoBorder,
  holiday,
  isHolidayBlocked,
  isRestrictedTime,
  availableEmployees,
  isPending,
  isDropdownOpen,
  isLocked,
  isFrozen,
  readonly,
  showLockControls,
  employees,
  employeeComment,
  allEmployeeComments,
  onCellClick,
  onEmployeeSelect,
  onDropdownClose,
  onLockToggle,
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const hasComment = employeeComment && employeeComment.length > 0;
  const [showCommentModal, setShowCommentModal] = useState(false);

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCommentModal(true);
  };

  return (
    <td className="px-1 lg:px-2 py-2 lg:py-4 border-b">
      <div className="relative" ref={cellRef}>
        <div
          className={`
            min-h-[48px] lg:h-16 rounded flex items-center justify-center transition-all cursor-pointer text-[10px] lg:text-xs
            ${isRestrictedTime
              ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed border lg:border-2'
              : isHolidayBlocked
              ? 'bg-indigo-200 text-indigo-800 border-indigo-300 cursor-not-allowed border lg:border-2'
              : isLocked
              ? `${employeeColor} border-2 lg:border-[3px] border-yellow-500 shadow-sm lg:shadow-md`
              : currentAssignment
              ? `${hasComment ? employeeColorNoBorder : employeeColor} hover:opacity-80 shadow-sm border lg:border-2 ${hasComment ? 'border-2 border-blue-600 shadow-md lg:border-gray-200' : ''}`
              : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:bg-gray-100 border lg:border-2'
            }
            ${readonly || isRestrictedTime || isHolidayBlocked || isLocked ? 'cursor-not-allowed' : ''}
          `}
          onClick={() => onCellClick(dayStr, shiftId)}
        >
          <div className="text-center px-1 lg:px-2">
            <div className={`font-medium leading-tight ${currentAssignment ? 'font-semibold' : ''}`}>
              {isRestrictedTime
                ? '×'
                : isHolidayBlocked
                  ? ` ${holiday?.name || 'חג'}`
                  : currentAssignment
                    ? employeeName
                    : '-'
              }
            </div>

            {/* Freeze Badge - only visible to managers (not readonly), works for both assigned and empty shifts */}
            {isFrozen && !readonly && (
              <div className={`${currentAssignment ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-400 text-gray-900'} text-[8px] lg:text-[9px] px-1 py-0.5 rounded font-bold mt-0.5 inline-flex items-center gap-0.5 shadow-sm`}>
                <Snowflake className="w-2 h-2" />
                <span>{currentAssignment ? 'קפוא' : 'ריק קפוא'}</span>
              </div>
            )}

            {/* Lock icon removed per user request - lock/unlock button at top-left remains */}
          </div>
        </div>

        {/* Dropdown Component */}
        {isDropdownOpen && !readonly && !isRestrictedTime && !isHolidayBlocked && !isLocked && (
          <ShiftDropdown
            availableEmployees={availableEmployees}
            allEmployees={employees}
            currentEmployeeId={currentAssignment}
            onSelect={(employeeId) => onEmployeeSelect(dayStr, shiftId, employeeId)}
            onClose={onDropdownClose}
            cellRef={cellRef}
            employeeComments={allEmployeeComments}
          />
        )}

        {/* Lock/Unlock button removed per user request */}

        {/* Comment icon - desktop only - only shown when comment exists */}
        {hasComment && currentAssignment && !isRestrictedTime && !isHolidayBlocked && (
          <button
            onClick={handleCommentClick}
            className="hidden lg:block absolute bottom-1 right-1 transition-colors z-10 p-1 text-blue-600 hover:text-blue-800"
          >
            <MessageSquare className="w-3 h-3 fill-current" />
          </button>
        )}

        {/* Comment Modal - desktop only, read-only */}
        {showCommentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCommentModal(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">{hasComment ? 'הערה' : 'אין הערה'}</h3>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[96px] whitespace-pre-wrap" dir="rtl">
                {employeeComment || 'העובד לא הוסיף הערה למשמרת זו'}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowCommentModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </td>
  );
};

export default ScheduleView;