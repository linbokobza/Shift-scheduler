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

  const getStatusColorWithoutBorder = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-500';
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

    // Check if it's Friday evening/night (not available)
    const isRestrictedTime = (dayIndex === 5 && (shiftId === 'evening' || shiftId === 'night'));
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

    // Check if it's Friday evening/night (not available)
    const isRestrictedTime = (dayIndex === 5 && (shiftId === 'evening' || shiftId === 'night'));
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

  // Determine which view to show based on forceViewMode or default responsive behavior
  const showCardsView = forceViewMode === 'cards' || (!forceViewMode);
  const showTableView = forceViewMode === 'table' || (!forceViewMode);

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Mobile Day-by-Day View (Cards) */}
      {showCardsView && forceViewMode !== 'table' && (
        <div className={forceViewMode === 'cards' ? 'p-4' : 'lg:hidden p-4'}>
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
            onClick={() => setCurrentDayIndex(prev => Math.min(5, prev + 1))}
            disabled={currentDayIndex === 5}
            className="p-3 min-h-[44px] min-w-[44px] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Shift Cards */}
        <div className="space-y-1.5">
          {SHIFTS.map((shift) => {
            const dayStr = currentDayIndex.toString();
            const cellData = availability[dayStr]?.[shift.id];
            const isVacation = isVacationDay(currentDayIndex);
            const holiday = getHolidayForDay(currentDayIndex);
            const isHolidayBlocked = isHolidayShiftBlocked(currentDayIndex, shift.id);
            const isWeekend = (currentDayIndex === 5 && (shift.id === 'evening' || shift.id === 'night'));
            const hasComment = cellData?.comment && cellData.comment.length > 0;

            return (
              <div
                key={shift.id}
                className={`
                  relative p-2 rounded-lg border-2 min-h-[80px] cursor-pointer transition-all
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
                <div className="flex justify-between items-center mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs sm:text-sm font-medium ${shift.color}`}>
                    {shift.name}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    {shift.startTime} - {shift.endTime}
                  </span>
                </div>

                <div className="text-center text-sm sm:text-base font-medium">
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
                    className="absolute bottom-1 left-1 text-blue-600 hover:text-blue-800 transition-colors z-10 p-1"
                  >
                    <MessageSquare className="w-4 h-4 fill-current" />
                  </button>
                )}

                {!readonly && !isVacation && !hasComment && !isWeekend && !isHolidayBlocked && (
                  <button
                    onClick={(e) => handleCommentClick(dayStr, shift.id, e)}
                    className="absolute bottom-1 left-1 text-gray-400 hover:text-blue-600 transition-all z-10 p-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="text-center text-sm text-gray-500 mt-4">
          יום {currentDayIndex + 1} מתוך 6
        </div>
        </div>
      )}

      {/* Desktop/Mobile Table View */}
      {showTableView && forceViewMode !== 'cards' && (
        <div className={forceViewMode === 'table' ? 'overflow-x-auto' : 'hidden lg:block overflow-x-auto'}>
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
                  const cellData = availability[dayStr]?.[shift.id];
                  const isVacation = isVacationDay(dayIndex);
                  const holiday = getHolidayForDay(dayIndex);
                  const isHolidayBlocked = isHolidayShiftBlocked(dayIndex, shift.id);
                  const isWeekend = (dayIndex === 5 && (shift.id === 'evening' || shift.id === 'night')); // Friday evening/night
                  const hasComment = cellData?.comment && cellData.comment.length > 0;

                  return (
                    <td key={dayIndex} className="px-1 lg:px-2 py-2 lg:py-4 border-b">
                      <div className="relative">
                        <div
                          className={`
                            min-h-[48px] lg:h-16 rounded flex items-center justify-center transition-all cursor-pointer text-[10px] lg:text-xs
                            ${isWeekend
                              ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed border lg:border-2'
                              : isHolidayBlocked
                              ? 'bg-indigo-200 text-indigo-800 border-indigo-300 cursor-not-allowed border lg:border-2'
                              : isVacation
                              ? 'bg-blue-100 text-blue-800 border-blue-200 cursor-not-allowed border lg:border-2'
                              : cellData
                                ? `${getStatusColorWithoutBorder(cellData.status)} hover:opacity-80 shadow-sm ${hasComment ? 'border-2 border-blue-600 shadow-md lg:border lg:border-2 lg:border-gray-200' : 'border lg:border-2'}`
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:bg-gray-100 border lg:border-2'
                            }
                            ${readonly || isWeekend || isHolidayBlocked ? 'cursor-not-allowed' : ''}
                          `}
                          onClick={() => !readonly && !isWeekend && !isHolidayBlocked && handleCellClick(dayStr, shift.id)}
                        >
                          <div className="text-center px-1 lg:px-2">
                            <div className={`font-medium leading-tight ${cellData ? 'font-semibold' : ''}`}>
                              {isWeekend
                                ? '×'
                                : isHolidayBlocked
                                  ? `חג: ${holiday?.name}`
                                : isVacation
                                  ? 'חופשה/מחלה'
                                  : cellData?.status
                                    ? getStatusText(cellData.status)
                                    : ''
                              }
                            </div>
                          </div>
                        </div>

                        {/* Comment icon - desktop only */}
                        {!readonly && !isVacation && !isHolidayBlocked && !isWeekend && (
                          <button
                            onClick={(e) => handleCommentClick(dayStr, shift.id, e)}
                            className={`hidden lg:block absolute bottom-1 right-1 transition-colors z-10 p-1 ${
                              hasComment
                                ? 'text-blue-600 hover:text-blue-800'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <MessageSquare className={`w-3 h-3 ${hasComment ? 'fill-current' : ''}`} />
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

      {/* Comment Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 lg:p-4" onClick={() => setSelectedCell(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {/* Mobile - editable */}
            <div className="lg:hidden">
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

            {/* Desktop - editable */}
            <div className="hidden lg:block">
              <h3 className="text-lg font-semibold mb-4">{commentText ? 'ערוך הערה' : 'הוסף הערה'}</h3>
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors ml-3"
                >
                  ביטול
                </button>
                <button
                  onClick={saveComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                    className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
                  >
                    מחק הערה
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityGrid;