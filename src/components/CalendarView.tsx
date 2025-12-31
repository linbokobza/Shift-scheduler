import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, User, Star } from 'lucide-react';
import { VacationDay, Holiday, User as UserType } from '../types';
import { formatDateHebrew } from '../utils/dateUtils';
import { getShiftsForDate, SHIFT_DISPLAY_ORDER, SHIFT_NAMES_HEBREW } from '../utils/calendarUtils';
import { usePublishedSchedulesForMonth } from '../hooks/useSchedules';

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

interface CalendarViewProps {
  employees: UserType[];
  vacationDays: VacationDay[];
  holidays: Holiday[];
  onClose: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  employees,
  vacationDays,
  holidays,
  onClose
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const activeEmployees = employees.filter(emp => emp.isActive);

  const { data: publishedSchedules = [], isLoading: schedulesLoading } =
    usePublishedSchedulesForMonth(
      currentDate.getFullYear(),
      currentDate.getMonth()
    );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const endingDayOfWeek = lastDay.getDay();

    const days = [];

    // Add days from previous month to fill the week starting from Sunday
    if (startingDayOfWeek > 0) {
      const prevMonth = month - 1;
      const prevYear = prevMonth < 0 ? year - 1 : year;
      const prevMonthAdjusted = prevMonth < 0 ? 11 : prevMonth;
      const prevMonthLastDay = new Date(prevYear, prevMonthAdjusted + 1, 0).getDate();

      // Calculate how many days from previous month to show
      const daysFromPrevMonth = startingDayOfWeek;
      const startDay = prevMonthLastDay - daysFromPrevMonth + 1;

      for (let day = startDay; day <= prevMonthLastDay; day++) {
        days.push(new Date(prevYear, prevMonthAdjusted, day));
      }
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    // Add days from next month to complete the week until Friday (day 5)
    // If month ends on Sunday (0) through Thursday (4), add days to reach Friday
    if (endingDayOfWeek < 5) {
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const nextMonthAdjusted = nextMonth > 11 ? 0 : nextMonth;
      const daysToAdd = 5 - endingDayOfWeek;

      for (let day = 1; day <= daysToAdd; day++) {
        days.push(new Date(nextYear, nextMonthAdjusted, day));
      }
    }

    return days;
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || 'עובד לא נמצא';
  };

  const getEmployeeColor = (employeeName: string): string => {
    const employee = employees.find(emp => emp.name === employeeName);
    if (!employee) return 'bg-gray-100 text-gray-800 border-gray-200';

    const employeeIndex = activeEmployees.findIndex(emp => emp.id === employee.id);
    if (employeeIndex === -1) return 'bg-gray-100 text-gray-800 border-gray-200';
    return EMPLOYEE_COLORS[employeeIndex % EMPLOYEE_COLORS.length];
  };

  const getVacationsForDate = (date: Date) => {
    // Format date in local timezone (YYYY-MM-DD) to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return vacationDays.filter(v => v.date === dateString);
  };

  const getHolidayForDate = (date: Date) => {
    // Format date in local timezone (YYYY-MM-DD) to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return holidays.find(h => h.date === dateString);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  const days = getDaysInMonth(currentDate);

  if (schedulesLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">טוען נתונים...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-h-[95vh] max-w-7xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-50 border-b border-blue-200 p-2 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-lg font-semibold text-blue-900 flex items-center">
                <Calendar className="w-5 h-5 ml-2" />
                לוח שנה - משמרות, חופשות וחגים
              </h3>
              <p className="text-xs sm:text-sm text-blue-700 mt-1 hidden sm:block">
                צפייה במשמרות, חופשות וחגים במבט חודשי
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl sm:text-2xl p-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-gray-50 border-b p-2 sm:p-4 flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-all"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-all"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <h2 className="text-base sm:text-xl font-semibold text-gray-900 order-first sm:order-none w-full sm:w-auto text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>

            <button
              onClick={goToCurrentMonth}
              className="text-xs sm:text-sm bg-blue-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              החודש הנוכחי
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-1 sm:p-4">
          <div className="grid grid-cols-7 gap-px sm:gap-1 min-w-0">
            {/* Day headers */}
            {dayNames.map((day, index) => (
              <div key={index} className="p-0.5 sm:p-2 text-center font-medium text-gray-700 bg-gray-100 rounded text-[10px] sm:text-sm">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => {
              const vacations = getVacationsForDate(day);
              const holiday = getHolidayForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={index}
                  className={`p-0.5 sm:p-2 min-h-[70px] sm:min-h-[110px] border rounded relative overflow-hidden ${
                    isToday
                      ? 'bg-blue-100 border-blue-300'
                      : isCurrentMonth
                      ? 'bg-white border-gray-200 hover:bg-gray-50'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {/* Day number */}
                  <div className={`text-xs sm:text-sm font-medium mb-0.5 ${
                    isToday ? 'text-blue-900' : isCurrentMonth ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {day.getDate()}
                  </div>

                  {/* Holiday */}
                  {holiday && (
                    <div className="mb-0.5">
                      <div className="flex items-center text-[9px] sm:text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded leading-tight">
                        <Star className="w-2 h-2 ml-0.5 flex-shrink-0" />
                        <span className="truncate">{holiday.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Shifts */}
                  {(() => {
                    const shifts = getShiftsForDate(day, publishedSchedules, employees);
                    if (!shifts) return null;

                    return (
                      <div className="mt-0.5 space-y-px">
                        {SHIFT_DISPLAY_ORDER.map((shiftType) => {
                          const employeeName = shifts[shiftType];
                          if (!employeeName) return null;

                          const employeeColor = getEmployeeColor(employeeName);

                          // Get first name only to save space
                          const firstName = employeeName.split(' ')[0];

                          return (
                            <div
                              key={shiftType}
                              className={`text-[9px] sm:text-xs px-1 py-0.5 rounded border ${employeeColor} truncate leading-tight`}
                              title={`${SHIFT_NAMES_HEBREW[shiftType]}: ${employeeName}`}
                            >
                              {firstName}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Vacations */}
                  {vacations.length > 0 && (
                    <div className="space-y-0.5 mt-0.5">
                      {vacations.slice(0, 2).map((vacation) => (
                        <div
                          key={vacation.id}
                          className={`flex items-center text-[9px] sm:text-xs px-1 py-0.5 rounded leading-tight ${
                            vacation.type === 'vacation'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <User className="w-2 h-2 ml-0.5 flex-shrink-0" />
                          <span className="truncate">
                            {getEmployeeName(vacation.employeeId).split(' ')[0]}
                          </span>
                        </div>
                      ))}
                      {vacations.length > 2 && (
                        <div className="text-[10px] text-gray-500 text-center">
                          +{vacations.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gray-50 border-t p-3 sm:p-4 flex-shrink-0">
          <h4 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">מקרא</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 border border-blue-200 rounded ml-1 sm:ml-2 flex-shrink-0"></div>
              <span className="text-gray-700">חופשה</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 border border-red-200 rounded ml-1 sm:ml-2 flex-shrink-0"></div>
              <span className="text-gray-700">מחלה</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-100 border border-purple-200 rounded ml-1 sm:ml-2 flex-shrink-0"></div>
              <span className="text-gray-700">חג</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 border border-blue-300 rounded ml-1 sm:ml-2 flex-shrink-0"></div>
              <span className="text-gray-700">היום</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;