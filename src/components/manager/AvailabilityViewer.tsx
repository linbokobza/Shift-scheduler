import React, { useState } from 'react';
import { Eye, Edit3, Save, MessageSquare } from 'lucide-react';
import { User, Availability, VacationDay, AvailabilityStatus, Holiday } from '../../types';
import { SHIFTS, DAYS } from '../../data/mockData';
import { formatDateHebrew, getWeekDates, formatDate } from '../../utils/dateUtils';

interface AvailabilityViewerProps {
  employees: User[];
  availabilities: Availability[];
  vacationDays: VacationDay[];
  holidays: Holiday[];
  weekStart: Date;
  onAvailabilityChange: (employeeId: string, day: string, shiftId: string, status: AvailabilityStatus) => void;
  onCommentChange: (employeeId: string, day: string, shiftId: string, comment: string) => void;
  selectedEmployee: string | null;
  onSelectedEmployeeChange: (employeeId: string | null) => void;
  editMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
}

const AvailabilityViewer: React.FC<AvailabilityViewerProps> = ({
  employees,
  availabilities,
  vacationDays,
  holidays,
  weekStart,
  onAvailabilityChange,
  onCommentChange,
  selectedEmployee,
  onSelectedEmployeeChange,
  editMode,
  onEditModeChange
}) => {
  const [selectedCell, setSelectedCell] = useState<{ day: string; shift: string; comment: string } | null>(null);

  // Use the submission week from the props
  const submissionWeekStart = weekStart;
  const weekStartString = formatDate(submissionWeekStart);
  const weekDates = getWeekDates(submissionWeekStart);
  const activeEmployees = employees.filter(emp => emp.role === 'employee' && emp.isActive);

  const getEmployeeAvailability = (employeeId: string) => {
    return availabilities.find(a => a.employeeId === employeeId && a.weekStart === weekStartString);
  };

  const getEmployeeVacations = (employeeId: string) => {
    return vacationDays.filter(v => {
      if (v.employeeId !== employeeId) return false;
      const vacationDate = new Date(v.date);
      const currentWeekStartDate = new Date(submissionWeekStart);
      const weekEnd = new Date(currentWeekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return vacationDate >= currentWeekStartDate && vacationDate <= weekEnd;
    });
  };

  const getStatusColor = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unavailable':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusText = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return 'זמין';
      case 'unavailable':
        return 'לא זמין';
      default:
        return 'לא נבחר';
    }
  };

  const isVacationDay = (employeeId: string, dayIndex: number) => {
    const date = weekDates[dayIndex];
    const dateString = formatDate(date);
    const employeeVacations = getEmployeeVacations(employeeId);
    return employeeVacations.some(v => v.date === dateString);
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

  const handleCellClick = (day: string, shiftId: string) => {
    if (!editMode || !selectedEmployee) return;
    
    const dayIndex = parseInt(day);
    if (isVacationDay(selectedEmployee, dayIndex) || isHolidayShiftBlocked(dayIndex, shiftId)) return;
    
    const isRestrictedTime = (dayIndex === 5 && (shiftId === 'evening' || shiftId === 'night')) || dayIndex === 6;
    if (isRestrictedTime) return;

    const employeeAvailability = getEmployeeAvailability(selectedEmployee);
    const currentStatus = employeeAvailability?.shifts[day]?.[shiftId]?.status;
    const statuses: AvailabilityStatus[] = ['available', 'unavailable'];
    const currentIndex = statuses.indexOf(currentStatus || 'available');
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    onAvailabilityChange(selectedEmployee, day, shiftId, nextStatus);
  };

  const handleCommentClick = (day: string, shiftId: string, comment: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCell({ day, shift: shiftId, comment });
  };

  if (activeEmployees.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין עובדים פעילים</h3>
        <p className="text-gray-600">הוסף עובדים פעילים כדי לראות את האילוצים שלהם</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 flex items-center">
              <Eye className="w-5 h-5 ml-2" />
              צפייה באילוצי עובדים
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {selectedEmployee && (
              <button
                onClick={() => onEditModeChange(!editMode)}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ml-2 ${
                  editMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {editMode ? (
                  <>
                    <Save className="w-4 h-4 ml-1" />
                    שמור שינויים
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 ml-1" />
                    עריכה
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Employee Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            בחר עובד לצפייה:
          </label>
          <select
            value={selectedEmployee || ''}
            onChange={(e) => {
              const empId = e.target.value || null;
              onSelectedEmployeeChange(empId);
              onEditModeChange(false);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-md"
          >
            <option value="">-- בחר עובד --</option>
            {activeEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-500 mt-2">
            צפייה באילוצים לשבוע ההגשה: {formatDateHebrew(submissionWeekStart)} - {formatDateHebrew(new Date(submissionWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000))} (מתחלף כל שלישי)
          </div>
        </div>

        {selectedEmployee && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-right font-medium text-gray-700 border-b">
                    משמרת
                  </th>
                  {DAYS.map((day, index) => (
                    <th key={index} className="px-2 py-2 text-center font-medium text-gray-700 border-b min-w-[80px]">
                      <div className="text-xs">{day}</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        {formatDateHebrew(weekDates[index])}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFTS.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border-b">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${shift.color}`}>
                        {shift.name}
                      </div>
                    </td>
                    {DAYS.map((_, dayIndex) => {
                      const dayStr = dayIndex.toString();
                      const employeeAvailability = getEmployeeAvailability(selectedEmployee);
                      const cellData = employeeAvailability?.shifts[dayStr]?.[shift.id];
                      const isVacation = isVacationDay(selectedEmployee, dayIndex);
                      const holiday = getHolidayForDay(dayIndex);
                      const isHolidayBlocked = isHolidayShiftBlocked(dayIndex, shift.id);
                      const isRestrictedTime = (dayIndex === 5 && (shift.id === 'evening' || shift.id === 'night')) || dayIndex === 6;
                      const hasComment = cellData?.comment && cellData.comment.length > 0;

                      return (
                        <td key={dayIndex} className="px-1 lg:px-2 py-2 lg:py-4 border-b">
                          <div
                            className={`
                              relative min-h-[48px] lg:h-16 rounded border lg:border-2 flex items-center justify-center transition-all text-[10px] lg:text-xs
                              ${editMode ? 'cursor-pointer' : 'cursor-default'}
                              ${isRestrictedTime
                                ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                                : isHolidayBlocked
                                ? 'bg-indigo-200 text-indigo-800 border-indigo-300 cursor-not-allowed'
                                : isVacation
                                ? 'bg-blue-100 text-blue-800 border-blue-200 cursor-not-allowed'
                                : cellData
                                  ? `${getStatusColor(cellData.status)} hover:opacity-80 shadow-sm`
                                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                              }
                            `}
                            onClick={() => handleCellClick(dayStr, shift.id)}
                          >
                            <div className="text-center px-1 lg:px-2">
                              <div className={`font-medium leading-tight ${cellData ? 'font-semibold' : ''}`}>
                                {isRestrictedTime
                                  ? '×'
                                  : isHolidayBlocked
                                    ? `חג: ${holiday?.name}`
                                  : isVacation
                                    ? 'חופשה/מחלה'
                                    : getStatusText(cellData?.status || 'available')
                                }
                              </div>
                            </div>

                            {hasComment && !isHolidayBlocked && (
                              <button
                                onClick={(e) => handleCommentClick(dayStr, shift.id, cellData?.comment || '', e)}
                                className="absolute bottom-1 right-1 text-blue-600 hover:text-blue-800 transition-colors z-10"
                                title={cellData?.comment}
                              >
                                <MessageSquare className="w-3 h-3 fill-current" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!selectedEmployee && (
          <div className="text-center py-8 text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>בחר עובד כדי לראות את האילוצים שלו</p>
          </div>
        )}
      </div>

      {/* Comment Modal - View Only */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCell(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">הערה</h3>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[96px] whitespace-pre-wrap" dir="rtl">
              {selectedCell.comment || 'אין הערה'}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityViewer;