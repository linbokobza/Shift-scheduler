import { useState } from 'react';
import { Calendar, CalendarDays, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../api/axios.config';
import { scheduleAPI } from '../../api/schedule.api';
import { useEmployees, useToggleEmployeeActive, useCreateEmployee } from '../../hooks/useEmployees';
import { useAvailabilities } from '../../hooks/useAvailabilities';
import { useScheduleByWeek, useGenerateSchedule } from '../../hooks/useSchedules';
import { useVacations, useCreateVacation, useDeleteVacation, useHolidays, useCreateHoliday, useDeleteHoliday } from '../../hooks/useVacations';
import { getWeekStart, formatDate, getSubmissionWeek, isSubmissionDeadlinePassed } from '../../utils/dateUtils';
import WeekNavigator from '../WeekNavigator';
import ScheduleView from '../ScheduleView';
import Sidebar from './Sidebar';
import AvailabilityViewer from './AvailabilityViewer';
import AvailabilitySummary from '../AvailabilitySummary';
import CalendarView from '../CalendarView';

type MenuOption = 'employees' | 'vacations' | 'holidays';

interface ManagerDashboardAPIProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

const ManagerDashboardAPI: React.FC<ManagerDashboardAPIProps> = ({
  isMobileMenuOpen: externalMobileMenuOpen = false,
  onMobileMenuClose: externalOnMobileMenuClose
}) => {
  const queryClient = useQueryClient();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const submissionWeek = getSubmissionWeek();
    const isDeadlinePassed = isSubmissionDeadlinePassed(submissionWeek);

    // If deadline passed for current submission week, show next submission week
    if (isDeadlinePassed) {
      const nextWeek = new Date(submissionWeek);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    return submissionWeek;
  });
  const [activeMenu, setActiveMenu] = useState<MenuOption>('employees');
  const [showCalendar, setShowCalendar] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Use external mobile menu state from App.tsx
  const isMobileMenuOpen = externalMobileMenuOpen;
  const onMobileMenuClose = externalOnMobileMenuClose || (() => {});

  const weekStartString = formatDate(currentWeekStart);

  // Fetch data with React Query
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  // Fetch ALL availabilities (not filtered by week) so manager can see all submissions
  const { data: availabilities = [], isLoading: availabilitiesLoading } = useAvailabilities();
  const { data: currentSchedule, isLoading: scheduleLoading } = useScheduleByWeek(weekStartString);
  const { data: vacations = [] } = useVacations();
  const { data: holidays = [] } = useHolidays();

  // Mutations
  const toggleActiveMutation = useToggleEmployeeActive();
  const createEmployeeMutation = useCreateEmployee();
  const generateScheduleMutation = useGenerateSchedule();
  const createVacationMutation = useCreateVacation();
  const deleteVacationMutation = useDeleteVacation();
  const createHolidayMutation = useCreateHoliday();
  const deleteHolidayMutation = useDeleteHoliday();

  const activeEmployees = employees.filter(emp => emp.role === 'employee' && emp.isActive);

  // Filter availabilities for current week only (for stats display)
  const currentWeekAvailabilities = availabilities.filter(a => a.weekStart === weekStartString);

  const handleToggleActive = (employeeId: string) => {
    toggleActiveMutation.mutate(employeeId);
  };

  const handlePublishSchedule = async () => {
    if (!currentSchedule) return;

    setIsPublishing(true);

    try {
      // Call the API to publish the schedule
      const response = await axiosInstance.patch(`/schedules/${currentSchedule.id}/publish`);

      if (response.status === 200) {
        // Invalidate React Query cache to refetch with updated data
        // This ensures employees will immediately see the published schedule
        queryClient.invalidateQueries({ queryKey: ['schedules'] });
        queryClient.invalidateQueries({ queryKey: ['schedules', 'week', weekStartString] });

        // Show success message
        alert('הסידור פורסם בהצלחה! העובדים יכולים כעת לראות את הסידור.');
      }
    } catch (error) {
      console.error('Failed to publish schedule:', error);
      alert('שגיאה בפרסום הסידור. אנא נסו שוב.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddVacation = (employeeId: string, startDate: Date, endDate: Date, type: 'vacation' | 'sick') => {
    // Create vacation for each day in the range
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      createVacationMutation.mutate({
        employeeId,
        date: formatDate(currentDate),
        type
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
  };

  const handleRemoveVacation = (vacationId: string) => {
    deleteVacationMutation.mutate(vacationId);
  };

  const handleAddHoliday = (date: string, name: string, type: 'no-work' | 'morning-only') => {
    createHolidayMutation.mutate({ date, name, type });
  };

  const handleRemoveHoliday = (holidayId: string) => {
    deleteHolidayMutation.mutate(holidayId);
  };

  const handleGenerateSchedule = async () => {
    try {
      await generateScheduleMutation.mutateAsync(weekStartString);
      alert('סידור נוצר בהצלחה!');
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('שגיאה ביצירת הסידור');
    }
  };

  const handleBulkAssignmentChange = async (
    changes: Array<{ day: string; shiftId: string; employeeId: string | null }>
  ) => {
    if (!currentSchedule) return;

    try {
      // יצירת אובייקט assignments מעודכן
      const updatedAssignments = { ...currentSchedule.assignments };

      changes.forEach(change => {
        if (!updatedAssignments[change.day]) {
          updatedAssignments[change.day] = {};
        }
        updatedAssignments[change.day][change.shiftId] = change.employeeId;
      });

      // קריאה ל-API לעדכון
      await scheduleAPI.update(currentSchedule.id, {
        assignments: updatedAssignments,
      });

      // עדכון הקאש
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', 'week', weekStartString] });

      alert('השינויים נשמרו בהצלחה!');
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('שגיאה בשמירת השינויים');
      throw error;
    }
  };

  const handleWeekChange = (newWeekStart: Date) => {
    setCurrentWeekStart(newWeekStart);
  };

  // Employee management handlers
  const handleAddEmployee = async (name: string, email: string, password: string) => {
    try {
      await createEmployeeMutation.mutateAsync({
        name,
        email,
        password,
        role: 'employee',
      });
      alert('עובד נוסף בהצלחה!');
    } catch (error: any) {
      console.error('Error creating employee:', error);
      alert(error.response?.data?.message || 'שגיאה בהוספת עובד');
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    console.log('Remove employee:', employeeId);
    // TODO: Implement employee removal
  };

  const handleResetPassword = (employeeId: string) => {
    console.log('Reset password:', employeeId);
    // TODO: Implement password reset
  };

  // Loading state
  if (employeesLoading || availabilitiesLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8 overflow-x-hidden" dir="rtl">
      <div className="flex w-full">
        <Sidebar
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          employees={employees}
          vacationDays={vacations}
          holidays={holidays}
          onToggleActive={handleToggleActive}
          onAddEmployee={handleAddEmployee}
          onRemoveEmployee={handleRemoveEmployee}
          onResetPassword={handleResetPassword}
          onAddVacation={handleAddVacation}
          onRemoveVacation={handleRemoveVacation}
          onAddHoliday={handleAddHoliday}
          onRemoveHoliday={handleRemoveHoliday}
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

          {/* Schedule Section */}
          <div className="bg-white rounded-lg shadow-sm border p-4 lg:p-6 w-full">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
              <h2 className="text-base lg:text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 lg:w-6 lg:h-6 ml-2" />
                סידור משמרות
              </h2>
              <button
                onClick={handleGenerateSchedule}
                disabled={generateScheduleMutation.isPending}
                className="w-full lg:w-auto bg-blue-600 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
              >
                {generateScheduleMutation.isPending ? 'יוצר...' : 'צור סידור'}
              </button>
            </div>

            <WeekNavigator
              currentWeekStart={currentWeekStart}
              onWeekChange={handleWeekChange}
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
                        onClick={handlePublishSchedule}
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
                    onBulkAssignmentChange={handleBulkAssignmentChange}
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
                  onAvailabilityChange={() => {}}
                  onCommentChange={() => {}}
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
                onAvailabilityChange={() => {}}
                onCommentChange={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboardAPI;
