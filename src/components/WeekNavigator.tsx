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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white rounded-lg shadow-sm border p-3 lg:p-4 mb-4 lg:mb-6 gap-3">
      <div className="flex items-center space-x-2">
        {showNavigator && (
          <>
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <div className="text-center">
        <h2 className="text-base lg:text-lg font-semibold text-gray-900 text-center sm:text-right order-first sm:order-none">
          שבוע {formatDateHebrew(currentWeekStart)} - {formatDateHebrew(weekEnd)}
        </h2>
      </div>

      {showNavigator && !showSubmissionWeekButton && (
        <button
          onClick={goToCurrentWeek}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          השבוע הנוכחי
        </button>
      )}
      
      {showSubmissionWeekButton && onGoToSubmissionWeek && (
        <div className="flex items-center space-x-2">
          {!isCurrentWeekSubmissionWeek && (
            <button
              onClick={onGoToSubmissionWeek}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors ml-2"
            >
              שבוע הגשת אילוצים
            </button>
          )}
          {isCurrentWeekSubmissionWeek && (
            <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium">
              שבוע הגשה נוכחי
            </div>
          )}
          <button
            onClick={goToCurrentWeek}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            השבוע הנוכחי
          </button>
        </div>
      )}
    </div>
  );
};

export default WeekNavigator;