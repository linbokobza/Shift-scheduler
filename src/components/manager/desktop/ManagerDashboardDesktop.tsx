import React, { useState } from 'react';
import { Calendar, CalendarDays, Send } from 'lucide-react';
import WeekNavigator from '../../WeekNavigator';
import ScheduleView from '../../ScheduleView';
import Sidebar from '../Sidebar';
import AvailabilityViewer from '../AvailabilityViewer';
import AvailabilitySummary from '../../AvailabilitySummary';
import CalendarView from '../../CalendarView';
import UnavailableShiftsAlert from '../UnavailableShiftsAlert';
import { Availability, Schedule, User, VacationDay, Holiday, AvailabilityStatus } from '../../../types';
import { ShiftAvailabilityAnalysis } from '../../../utils/availabilityUtils';

interface ManagerDashboardDesktopProps {
  // Data
  employees: User[];
  availabilities: Availability[];
  currentSchedule: Schedule | null;
  vacations: VacationDay[];
  holidays: Holiday[];
  currentWeekStart: Date;
  activeEmployees: User[];
  currentWeekAvailabilities: Availability[];
  scheduleLoading: boolean;
  activeMenu: 'employees' | 'vacations' | 'holidays';
  isMobileMenuOpen?: boolean;
  shiftAnalysis: ShiftAvailabilityAnalysis;

  // Handlers
  onWeekChange: (weekStart: Date) => void;
  onGenerateSchedule: () => void;
  onPublishSchedule: () => void;
  onToggleActive: (employeeId: string) => void;
  onAddEmployee: (name: string, email: string, password: string) => void;
  onRemoveEmployee: (employeeId: string) => void;
  onResetPassword: (employeeId: string) => void;
  onAddVacation: (employeeId: string, startDate: Date, endDate: Date, type: 'vacation' | 'sick') => void;
  onRemoveVacation: (vacationId: string) => void;
  onAddHoliday: (date: string, name: string, type: 'no-work' | 'morning-only') => void;
  onRemoveHoliday: (holidayId: string) => void;
  onBulkAssignmentChange: (changes: Array<{ day: string; shiftId: string; employeeId: string | null }>) => void;
  onAvailabilityChange: (employeeId: string, day: string, shiftId: string, status: AvailabilityStatus) => void;
  onCommentChange: (employeeId: string, day: string, shiftId: string, comment: string) => void;
  onMenuChange: (menu: 'employees' | 'vacations' | 'holidays') => void;
  onMobileMenuClose?: () => void;

  // Loading states
  isGenerating?: boolean;
  isPublishing?: boolean;
}

export const ManagerDashboardDesktop: React.FC<ManagerDashboardDesktopProps> = ({
  employees,
  availabilities,
  currentSchedule,
  vacations,
  holidays,
  currentWeekStart,
  activeEmployees,
  currentWeekAvailabilities,
  scheduleLoading,
  activeMenu,
  isMobileMenuOpen,
  shiftAnalysis,
  onWeekChange,
  onGenerateSchedule,
  onPublishSchedule,
  onToggleActive,
  onAddEmployee,
  onRemoveEmployee,
  onResetPassword,
  onAddVacation,
  onRemoveVacation,
  onAddHoliday,
  onRemoveHoliday,
  onBulkAssignmentChange,
  onAvailabilityChange,
  onCommentChange,
  onMenuChange,
  onMobileMenuClose,
  isGenerating = false,
  isPublishing = false
}) => {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 pb-8 overflow-x-hidden" dir="rtl">
      <div className="flex w-full">
        <Sidebar
          activeMenu={activeMenu}
          onMenuChange={onMenuChange}
          employees={employees}
          vacationDays={vacations}
          holidays={holidays}
          onToggleActive={onToggleActive}
          onAddEmployee={onAddEmployee}
          onRemoveEmployee={onRemoveEmployee}
          onResetPassword={onResetPassword}
          onAddVacation={onAddVacation}
          onRemoveVacation={onRemoveVacation}
          onAddHoliday={onAddHoliday}
          onRemoveHoliday={onRemoveHoliday}
          currentWeekStart={currentWeekStart}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClose={onMobileMenuClose}
        />

        <div className="flex-1 min-w-0 p-3 lg:p-6">
          {/* Header */}
          <div className="mb-3 lg:mb-6 bg-white rounded-lg shadow-sm border p-3 lg:p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg lg:text-3xl font-bold text-gray-900 mb-0.5 lg:mb-2">
                  לוח מנהל
                </h1>
                <p className="text-xs lg:text-base text-gray-600">
                  ניהול עובדים וסידור משמרות
                </p>
              </div>
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center bg-purple-600 text-white px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg hover:bg-purple-700 transition-colors text-xs lg:text-base"
              >
                <CalendarDays className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />
                לוח שנה
              </button>
            </div>
          </div>

          {/* Calendar View Modal */}
          {showCalendar && (
            <CalendarView
              employees={employees}
              vacationDays={vacations}
              holidays={holidays}
              onClose={() => setShowCalendar(false)}
            />
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-6 w-full">
            <div className="bg-white rounded-lg shadow-sm border p-2 lg:p-4">
              <div className="text-[10px] lg:text-sm text-gray-600 mb-1">עובדים פעילים</div>
              <div className="text-lg lg:text-2xl font-bold text-blue-600">{activeEmployees.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-2 lg:p-4">
              <div className="text-[10px] lg:text-sm text-gray-600 mb-1">הגשות השבוע</div>
              <div className="text-lg lg:text-2xl font-bold text-green-600">{currentWeekAvailabilities.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-2 lg:p-4 col-span-2 lg:col-span-1">
              <div className="text-[10px] lg:text-sm text-gray-600 mb-1">סידור</div>
              <div className="text-lg lg:text-2xl font-bold text-purple-600">
                {currentSchedule ? 'קיים' : 'אין'}
              </div>
            </div>
          </div>

          {/* Unavailable Shifts Alert */}
          {shiftAnalysis?.hasIssues && (
            <UnavailableShiftsAlert
              analysis={shiftAnalysis}
              weekStart={currentWeekStart}
            />
          )}

          {/* Schedule Section */}
          <div className="bg-white rounded-lg shadow-sm border p-4 lg:p-6 w-full">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
              <h2 className="text-base lg:text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 lg:w-6 lg:h-6 ml-2" />
                סידור משמרות
              </h2>
              <button
                onClick={onGenerateSchedule}
                disabled={isGenerating}
                className="w-full lg:w-auto bg-blue-600 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
              >
                {isGenerating ? 'יוצר...' : 'צור סידור'}
              </button>
            </div>

            <WeekNavigator
              currentWeekStart={currentWeekStart}
              onWeekChange={onWeekChange}
            />

            <div className="mt-6">
              {scheduleLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">טוען סידור...</p>
                </div>
              ) : currentSchedule ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 lg:p-4 mb-4">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-green-900 font-medium text-sm lg:text-base">סידור קיים</h4>
                        <p className="text-green-700 text-xs lg:text-sm mt-1">
                          ניתן לערוך את הסידור על ידי לחיצה על התאים. לחץ "פרסם סידור" כדי לפרסם לעובדים.
                        </p>
                      </div>
                      <button
                        onClick={onPublishSchedule}
                        disabled={isPublishing}
                        className="w-full lg:w-auto bg-blue-600 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center justify-center text-sm lg:text-base lg:ml-2"
                      >
                        {isPublishing ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                        ) : (
                          <Send className="w-4 h-4 ml-1" />
                        )}
                        {isPublishing ? 'מפרסם...' : 'פרסם סידור'}
                      </button>
                    </div>
                  </div>
                  <ScheduleView
                    schedule={currentSchedule}
                    employees={employees}
                    availabilities={availabilities}
                    holidays={holidays}
                    weekStart={currentWeekStart}
                    readonly={false}
                    onBulkAssignmentChange={onBulkAssignmentChange}
                  />
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 text-lg mb-2">אין סידור לשבוע זה</p>
                  <p className="text-gray-500 text-sm mb-4">לחץ על "צור סידור" ליצירת סידור חדש</p>
                </div>
              )}
            </div>
          </div>

          {/* Availability Summary - מוצג רק אם יש סידור */}
          {currentSchedule && (
            <>
              {/* Availability Viewer - מוצג אחרי Summary */}
              <div className="mt-6">
                <AvailabilityViewer
                  employees={employees}
                  availabilities={availabilities}
                  vacationDays={vacations}
                  holidays={holidays}
                  weekStart={currentWeekStart}
                  onAvailabilityChange={onAvailabilityChange}
                  onCommentChange={onCommentChange}
                  shiftAnalysis={shiftAnalysis}
                />
              </div>

              <AvailabilitySummary
                schedule={currentSchedule}
                employees={employees}
                availabilities={availabilities}
              />
            </>
          )}

          {/* Availability Viewer - מוצג תמיד אם אין סידור */}
          {!currentSchedule && (
            <div className="mt-6">
              <AvailabilityViewer
                employees={employees}
                availabilities={availabilities}
                vacationDays={vacations}
                holidays={holidays}
                weekStart={currentWeekStart}
                onAvailabilityChange={onAvailabilityChange}
                onCommentChange={onCommentChange}
                shiftAnalysis={shiftAnalysis}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
