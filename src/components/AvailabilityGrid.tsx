import React, { useState } from 'react';
import { MessageSquare, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { AvailabilityStatus, Holiday } from '../types';
import { SHIFTS, DAYS } from '../data/mockData';
import { formatDateHebrew, getWeekDates, formatDate } from '../utils/dateUtils';

interface AvailabilityGridProps {
  availability: { [day: string]: { [shiftId: string]: { status: AvailabilityStatus; comment?: string } } };
  vacationDays: string[];
  holidays: Holiday[];
  onAvailabilityChange: (day: string, shiftId: string, status: AvailabilityStatus) => void;
  onCommentChange: (day: string, shiftId: string, comment: string) => void;
  readonly?: boolean;
  weekStart: Date;
  forceViewMode?: 'cards' | 'table'; // New prop to force view mode on mobile
}

const AvailabilityGrid: React.FC<AvailabilityGridProps> = ({
  availability,
  vacationDays,
  holidays,
  onAvailabilityChange,
  onCommentChange,
  readonly = false,
  weekStart,
  forceViewMode
}) => {
  const [selectedCell, setSelectedCell] = useState<{ day: string; shift: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const weekDates = getWeekDates(weekStart);

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

  const isVacationDay = (dayIndex: number) => {
    const date = weekDates[dayIndex];
    const dateString = formatDate(date);
    return vacationDays.includes(dateString);
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
    const dayIndex = parseInt(day);
    if (readonly || isVacationDay(dayIndex) || isHolidayShiftBlocked(dayIndex, shiftId)) return;

    // Check if it's Friday evening/night or Saturday (not available)
    const isRestrictedTime = (dayIndex === 5 && (shiftId === 'evening' || shiftId === 'night')) || dayIndex === 6;
    if (isRestrictedTime) return;

    const currentStatus = availability[day]?.[shiftId]?.status;

    // Toggle between available and unavailable
    const nextStatus: AvailabilityStatus = currentStatus === 'available' ? 'unavailable' : 'available';

    onAvailabilityChange(day, shiftId, nextStatus);
  };

  const handleCommentClick = (day: string, shiftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dayIndex = parseInt(day);
    if (readonly || isVacationDay(dayIndex) || isHolidayShiftBlocked(dayIndex, shiftId)) return;
    
    // Check if it's Friday evening/night or Saturday (not available)
    const isRestrictedTime = (dayIndex === 5 && (shiftId === 'evening' || shiftId === 'night')) || dayIndex === 6;
    if (isRestrictedTime) return;
    
    setSelectedCell({ day, shift: shiftId });
    setCommentText(availability[day]?.[shiftId]?.comment || '');
  };

  const saveComment = () => {
    if (selectedCell) {
      onCommentChange(selectedCell.day, selectedCell.shift, commentText);
      setSelectedCell(null);
      setCommentText('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Mobile Day-by-Day View */}
      <div className="lg:hidden p-4">
        {/* Day Navigator */}
        <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 lg:p-3 rounded-lg">
          <button
            onClick={() => setCurrentDayIndex(prev => Math.max(0, prev - 1))}
            disabled={currentDayIndex === 0}
            className="p-3 min-h-[44px] min-w-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="text-center">
            <div className="font-bold text-lg">{DAYS[currentDayIndex]}</div>
            <div className="text-sm text-gray-500">{formatDateHebrew(weekDates[currentDayIndex])}</div>
          </div>

          <button
            onClick={() => setCurrentDayIndex(prev => Math.min(6, prev + 1))}
            disabled={currentDayIndex === 6}
            className="p-3 min-h-[44px] min-w-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Shift Cards */}
        <div className="space-y-2">
          {SHIFTS.map((shift) => {
            const dayStr = currentDayIndex.toString();
            const cellData = availability[dayStr]?.[shift.id];
            const isVacation = isVacationDay(currentDayIndex);
            const holiday = getHolidayForDay(currentDayIndex);
            const isHolidayBlocked = isHolidayShiftBlocked(currentDayIndex, shift.id);
            const isWeekend = (currentDayIndex === 5 && (shift.id === 'evening' || shift.id === 'night')) || currentDayIndex === 6;
            const hasComment = cellData?.comment && cellData.comment.length > 0;

            return (
              <div
                key={shift.id}
                className={`
                  relative p-3 rounded-lg border-2 min-h-[100px] cursor-pointer transition-all
                  ${isWeekend
                    ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                    : isHolidayBlocked
                    ? 'bg-indigo-200 text-indigo-800 border-indigo-300 cursor-not-allowed'
                    : isVacation
                    ? 'bg-blue-100 text-blue-800 border-blue-200 cursor-not-allowed'
                    : cellData
                      ? getStatusColor(cellData.status)
                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                  }
                  ${readonly || isWeekend || isHolidayBlocked ? 'cursor-default' : ''}
                `}
                onClick={() => !readonly && !isWeekend && !isHolidayBlocked && handleCellClick(dayStr, shift.id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${shift.color}`}>
                    {shift.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>

                <div className="text-center text-base font-medium">
                  {isWeekend
                    ? 'לא זמין'
                    : isHolidayBlocked
                      ? `חג: ${holiday?.name}`
                    : isVacation
                      ? 'חופשה/מחלה'
                      : cellData?.status
                        ? getStatusText(cellData.status)
                        : 'לא נבחר'
                  }
                </div>

                {/* Comment button */}
                {hasComment && !readonly && !isVacation && !isHolidayBlocked && (
                  <button
                    onClick={(e) => handleCommentClick(dayStr, shift.id, e)}
                    className="absolute bottom-2 left-2 text-blue-600 hover:text-blue-800 transition-colors z-10 p-2"
                    title="ערוך הערה"
                  >
                    <MessageSquare className="w-5 h-5 fill-current" />
                  </button>
                )}

                {!readonly && !isVacation && !hasComment && !isWeekend && !isHolidayBlocked && (
                  <button
                    onClick={(e) => handleCommentClick(dayStr, shift.id, e)}
                    className="absolute bottom-2 left-2 text-gray-400 hover:text-blue-600 transition-all z-10 p-2"
                    title="הוסף הערה"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="text-center text-sm text-gray-500 mt-4">
          יום {currentDayIndex + 1} מתוך 7
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
                <th key={index} className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b min-w-24">
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
                  const cellData = availability[dayStr]?.[shift.id];
                  const isVacation = isVacationDay(dayIndex);
                  const holiday = getHolidayForDay(dayIndex);
                  const isHolidayBlocked = isHolidayShiftBlocked(dayIndex, shift.id);
                  const isWeekend = (dayIndex === 5 && (shift.id === 'evening' || shift.id === 'night')) || dayIndex === 6; // Friday evening/night and Saturday
                  const hasComment = cellData?.comment && cellData.comment.length > 0;

                  return (
                    <td key={dayIndex} className="px-2 py-4 border-b">
                      <div
                        className={`
                          relative min-h-[64px] lg:h-16 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                          ${isWeekend
                            ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                            : isHolidayBlocked
                            ? 'bg-indigo-200 text-indigo-800 border-indigo-300 cursor-not-allowed'
                            : isVacation 
                            ? 'bg-blue-100 text-blue-800 border-blue-200 cursor-not-allowed' 
                            : cellData 
                              ? getStatusColor(cellData.status)
                              : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                          }
                          ${readonly || isWeekend || isHolidayBlocked ? 'cursor-default' : ''}
                        `}
                        onClick={() => handleCellClick(dayStr, shift.id)}
                      >
                        <div className="flex items-center justify-center h-full text-center px-2">
                          <div className="text-xs font-medium">
                            {isWeekend
                              ? 'לא זמין'
                              : isHolidayBlocked
                                ? `חג: ${holiday?.name}`
                              : isVacation
                                ? 'חופשה/מחלה'
                                : cellData?.status
                                  ? getStatusText(cellData.status)
                                  : 'לא נבחר'
                            }
                          </div>
                        </div>
                        
                        {hasComment && !readonly && !isVacation && !isHolidayBlocked && (
                          <button
                            onClick={(e) => handleCommentClick(dayStr, shift.id, e)}
                            className="absolute bottom-1 right-1 text-blue-600 hover:text-blue-800 transition-colors z-10"
                            title="ערוך הערה"
                          >
                            <MessageSquare className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        
                        {!readonly && !isVacation && !hasComment && !isWeekend && !isHolidayBlocked && (
                          <button
                            onClick={(e) => handleCommentClick(dayStr, shift.id, e)}
                            className="absolute bottom-1 right-1 text-gray-400 hover:text-blue-600 transition-all z-10"
                            title="הוסף הערה"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
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

      {/* Comment Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 lg:p-4" onClick={() => setSelectedCell(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full modal-container" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">הוספת הערה</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="הכניסו הערה..."
              className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              dir="rtl"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 min-h-[44px] text-gray-600 hover:text-gray-800 transition-colors ml-3"
              >
                ביטול
              </button>
              <button
                onClick={saveComment}
                className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                שמירה
              </button>
              {commentText && (
                <button
                  onClick={() => {
                    setCommentText('');
                    if (selectedCell) {
                      onCommentChange(selectedCell.day, selectedCell.shift, '');
                    }
                    setSelectedCell(null);
                  }}
                  className="px-4 py-2 min-h-[44px] text-red-600 hover:text-red-700 transition-colors"
                >
                  מחק הערה
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityGrid;