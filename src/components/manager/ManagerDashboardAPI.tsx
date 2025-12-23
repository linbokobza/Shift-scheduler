import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../api/axios.config';
import { scheduleAPI } from '../../api/schedule.api';
import { useEmployees, useToggleEmployeeActive, useCreateEmployee } from '../../hooks/useEmployees';
import { useAvailabilities } from '../../hooks/useAvailabilities';
import { useScheduleByWeek, useGenerateSchedule } from '../../hooks/useSchedules';
import { useVacations, useCreateVacation, useDeleteVacation, useHolidays, useCreateHoliday, useDeleteHoliday } from '../../hooks/useVacations';
import { formatDate, getSubmissionWeek, isSubmissionDeadlinePassed } from '../../utils/dateUtils';
import { ManagerDashboardMobile } from './mobile/ManagerDashboardMobile';
import { ManagerDashboardDesktop } from './desktop/ManagerDashboardDesktop';

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

  // Shared props for both mobile and desktop
  const sharedProps = {
    employees,
    availabilities,
    currentSchedule: currentSchedule || null,
    vacations,
    holidays,
    currentWeekStart,
    activeEmployees,
    currentWeekAvailabilities,
    scheduleLoading,
    activeMenu,
    isMobileMenuOpen,
    onWeekChange: handleWeekChange,
    onGenerateSchedule: handleGenerateSchedule,
    onPublishSchedule: handlePublishSchedule,
    onToggleActive: handleToggleActive,
    onAddEmployee: handleAddEmployee,
    onRemoveEmployee: handleRemoveEmployee,
    onResetPassword: handleResetPassword,
    onAddVacation: handleAddVacation,
    onRemoveVacation: handleRemoveVacation,
    onAddHoliday: handleAddHoliday,
    onRemoveHoliday: handleRemoveHoliday,
    onBulkAssignmentChange: handleBulkAssignmentChange,
    onMenuChange: setActiveMenu,
    onMobileMenuClose,
    isGenerating: generateScheduleMutation.isPending,
    isPublishing
  };

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden">
        <ManagerDashboardMobile {...sharedProps} />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <ManagerDashboardDesktop {...sharedProps} />
      </div>
    </>
  );
};

export default ManagerDashboardAPI;
