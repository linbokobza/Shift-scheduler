import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateHebrew } from '../utils/dateUtils';

interface WeekNavigatorProps {
  currentWeekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  showNavigator?: boolean;
  showSubmissionWeekButton?: boolean;
  onGoToSubmissionWeek?: () => void;
  isCurrentWeekSubmissionWeek?: boolean;
}

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  currentWeekStart,
  onWeekChange,
  showNavigator = true,
  showSubmissionWeekButton = false,
  onGoToSubmissionWeek,
  isCurrentWeekSubmissionWeek = false
}) => {
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const goToPreviousWeek = () => {
    const previousWeek = new Date(currentWeekStart);
    previousWeek.setDate(previousWeek.getDate() - 7);
    onWeekChange(previousWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    onWeekChange(nextWeek);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - day);
    onWeekChange(weekStart);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-2 mb-4">
      {/* Mobile layout - vertical stack */}
      <div className="flex flex-col gap-2 sm:hidden">
        {/* Week display with arrows */}
        <div className="flex items-center justify-center gap-1">
          {showNavigator && (
            <>
              <button
                onClick={goToPreviousWeek}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all"
                aria-label="שבוע קודם"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-xs font-semibold text-gray-900 px-2">
                שבוע {formatDateHebrew(currentWeekStart)} - {formatDateHebrew(weekEnd)}
              </h2>
              <button
                onClick={goToNextWeek}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all"
                aria-label="שבוע הבא"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
          {!showNavigator && (
            <h2 className="text-xs font-semibold text-gray-900">
              שבוע {formatDateHebrew(currentWeekStart)} - {formatDateHebrew(weekEnd)}
            </h2>
          )}
        </div>
{/* Action buttons */}
        <div className="flex items-center justify-center gap-1.5 w-full">
          {showNavigator && !showSubmissionWeekButton && (
            <button
              onClick={goToCurrentWeek}
              className="text-[10px] bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 transition-colors flex-1 min-h-[28px] sm:min-h-[32px]"
            >
              השבוע הנוכחי
            </button>
          )}

          {showSubmissionWeekButton && onGoToSubmissionWeek && (
            <>
              {!isCurrentWeekSubmissionWeek && (
                <button
                  onClick={onGoToSubmissionWeek}
                  className="text-[10px] bg-green-600 text-white px-2 py-1.5 rounded hover:bg-green-700 transition-colors flex-1 min-h-[28px] sm:min-h-[32px]"
                >
                  שבוע הגשה
                </button>
              )}
              {isCurrentWeekSubmissionWeek && (
                <div className="text-[10px] bg-green-100 text-green-700 px-2 py-1.5 rounded flex-1 text-center font-medium min-h-[28px] sm:min-h-[32px] flex items-center justify-center">
                  שבוע הגשה נוכחי
                </div>
              )}
              <button
                onClick={goToCurrentWeek}
                className="text-[10px] bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 transition-colors flex-1 min-h-[28px] sm:min-h-[32px]"
              >
                השבוע הנוכחי
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop layout - single row */}
      <div className="hidden sm:flex items-center justify-between gap-3">
        {/* Left side - Navigation arrows and week display */}
        <div className="flex items-center gap-2">
          {showNavigator && (
            <>
              <button
                onClick={goToPreviousWeek}
                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all"
                aria-label="שבוע קודם"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={goToNextWeek}
                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all"
                aria-label="שבוע הבא"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          )}
          <h2 className="text-sm font-semibold text-gray-900 whitespace-nowrap">
            שבוע {formatDateHebrew(currentWeekStart)} - {formatDateHebrew(weekEnd)}
          </h2>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          {showNavigator && !showSubmissionWeekButton && (
            <button
              onClick={goToCurrentWeek}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              השבוע הנוכחי
            </button>
          )}

          {showSubmissionWeekButton && onGoToSubmissionWeek && (
            <>
              {!isCurrentWeekSubmissionWeek && (
                <button
                  onClick={onGoToSubmissionWeek}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  שבוע הגשה
                </button>
              )}
              {isCurrentWeekSubmissionWeek && (
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                  שבוע הגשה נוכחי
                </div>
              )}
              <button
                onClick={goToCurrentWeek}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                השבוע הנוכחי
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeekNavigator;