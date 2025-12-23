import React, { useState } from 'react';
import { Clock, Eye, Save, AlertCircle, CheckCircle, Calendar, CalendarDays } from 'lucide-react';
import WeekNavigator from '../../WeekNavigator';
import AvailabilityGrid from '../../AvailabilityGrid';
import ScheduleView from '../../ScheduleView';
import VacationManager from '../../VacationManager';
import CalendarView from '../../CalendarView';
import { Availability, AvailabilityStatus, Schedule, User, VacationDay, Holiday } from '../../../types';

interface EmployeeDashboardDesktopProps {
  // Data
  availability: Availability['shifts'];
  currentSchedule: Schedule | null;
  employees: User[];
  vacations: VacationDay[];
  holidays: Holiday[];
  currentWeekStart: Date;
  validationErrors: string[];
  hasChanges: boolean;
  isDeadlinePassed: boolean;
  isSchedulePublished: boolean;
  existingAvailability: Availability | undefined;

  // Handlers
  onAvailabilityChange: (day: string, shiftId: string, status: AvailabilityStatus) => void;
  onCommentChange: (day: string, shiftId: string, comment: string) => void;
  onSave: () => Promise<void>;
  onWeekChange: (weekStart: Date) => void;
  goToSubmissionWeek: () => void;
  isCurrentWeekSubmissionWeek: boolean;
  getDeadlineText: () => string;
}

export const EmployeeDashboardDesktop: React.FC<EmployeeDashboardDesktopProps> = ({
  availability,
  currentSchedule,
  employees,
  vacations,
  holidays,
  currentWeekStart,
  validationErrors,
  hasChanges,
  isDeadlinePassed,
  isSchedulePublished,
  existingAvailability,
  onAvailabilityChange,
  onCommentChange,
  onSave,
  onWeekChange,
  goToSubmissionWeek,
  isCurrentWeekSubmissionWeek,
  getDeadlineText
}) => {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const vacationDates = vacations.map(v => v.date);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              הגשת זמינות למשמרות
            </h2>
            <p className="text-gray-600">
              בחרו את הזמינות שלכם לכל משמרת בשבוע. ניתן להוסיף הערות לכל משמרת.
            </p>
          </div>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <CalendarDays className="w-5 h-5 ml-2" />
            לוח שנה
          </button>
        </div>
      </div>

      {/* Week Navigator */}
      <WeekNavigator
        currentWeekStart={currentWeekStart}
        onWeekChange={onWeekChange}
        showSubmissionWeekButton={true}
        onGoToSubmissionWeek={goToSubmissionWeek}
        isCurrentWeekSubmissionWeek={isCurrentWeekSubmissionWeek}
      />

      {/* Tab Toggle */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSchedule(false)}
                className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                  !showSchedule
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-4 h-4 ml-1" />
                הגשת זמינות
              </button>

              <button
                onClick={() => setShowSchedule(true)}
                className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                  showSchedule
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={!currentSchedule || !isSchedulePublished}
              >
                <Eye className="w-4 h-4 ml-1" />
                צפייה בסידור
                {(!currentSchedule || !isSchedulePublished) && (
                  <span className="text-xs mr-1">(לא זמין)</span>
                )}
              </button>
            </div>

            {currentSchedule && isSchedulePublished && (
              <div className="flex items-center text-green-600">
                <Calendar className="w-4 h-4 ml-1" />
                <span className="text-sm">סידור פורסם</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar for Availability Tab */}
        {!showSchedule && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-600 ml-2" />
                  <span className="text-sm text-gray-700">
                    מועד אחרון: {getDeadlineText()}
                  </span>
                </div>

                {isDeadlinePassed ? (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-4 h-4 ml-1" />
                    <span className="text-sm">המועד עבר</span>
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 ml-1" />
                    <span className="text-sm">ניתן להגיש</span>
                  </div>
                )}
              </div>

              {hasChanges && !isDeadlinePassed && (
                <button
                  onClick={handleSave}
                  disabled={isSaving || validationErrors.length > 0}
                  className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                  ) : (
                    <Save className="w-4 h-4 ml-1" />
                  )}
                  שמירה
                </button>
              )}
            </div>

            {existingAvailability && (
              <div className="mt-2 text-xs text-gray-500">
                נשמר לאחרונה: {new Date(existingAvailability.submittedAt).toLocaleTimeString('he-IL')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {!showSchedule && validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 ml-2" />
            <h4 className="text-red-900 font-medium">שגיאות בהגשה</h4>
          </div>
          <ul className="text-red-700 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Content */}
      {showSchedule ? (
        <ScheduleView
          schedule={currentSchedule}
          employees={employees}
          availabilities={[]}
          vacationDays={vacations}
          holidays={holidays}
          weekStart={currentWeekStart}
          readonly={true}
        />
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Availability Grid (2/3) */}
          <div className="col-span-2">
            <AvailabilityGrid
              availability={availability}
              vacationDays={vacationDates}
              holidays={holidays}
              onAvailabilityChange={onAvailabilityChange}
              onCommentChange={onCommentChange}
              readonly={isDeadlinePassed}
              weekStart={currentWeekStart}
            />
          </div>

          {/* Right: Sidebar (1/3) */}
          <div className="space-y-6">
            <VacationManager
              vacationDays={vacations}
              onAddVacation={() => {}} // Disabled for employees
              onRemoveVacation={() => {}} // Disabled for employees
              readonly={true}
              weekStart={currentWeekStart}
            />

            {/* Legend */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h4 className="font-medium text-gray-900 mb-3">מקרא</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-100 border border-green-200 rounded ml-2"></div>
                  <span className="text-sm text-gray-700">זמין</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-100 border border-red-200 rounded ml-2"></div>
                  <span className="text-sm text-gray-700">לא זמין</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded ml-2"></div>
                  <span className="text-sm text-gray-700">חופשה/מחלה</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-indigo-200 border border-indigo-300 rounded ml-2"></div>
                  <span className="text-sm text-gray-700">חג</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarView
          employees={employees}
          vacationDays={vacations}
          holidays={holidays}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
};
