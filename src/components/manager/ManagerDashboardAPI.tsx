import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../api/axios.config';
import { scheduleAPI } from '../../api/schedule.api';
import { employeeAPI } from '../../api/employee.api';
import { useEmployees, useToggleEmployeeActive, useCreateEmployee, useDeleteEmployee } from '../../hooks/useEmployees';
import { useAvailabilities, useUpdateAvailability } from '../../hooks/useAvailabilities';
import { useScheduleByWeek, useGenerateSchedule } from '../../hooks/useSchedules';
import { useVacations, useCreateVacation, useDeleteVacation, useHolidays, useCreateHoliday, useDeleteHoliday } from '../../hooks/useVacations';
import { useShiftAvailability } from '../../hooks/useShiftAvailability';
import { formatDate, getSubmissionWeek, isSubmissionDeadlinePassed } from '../../utils/dateUtils';
import { ManagerDashboardMobile } from './mobile/ManagerDashboardMobile';
import { ManagerDashboardDesktop } from './desktop/ManagerDashboardDesktop';
import { AvailabilityStatus } from '../../types';
import DeleteEmployeeModal from './DeleteEmployeeModal';

type MenuOption = 'employees' | 'vacations' | 'holidays';

interface ManagerDashboardAPIProps {}

const ManagerDashboardAPI: React.FC<ManagerDashboardAPIProps> = () => {
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

  // Tab state preservation
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [availabilityEditMode, setAvailabilityEditMode] = useState(false);
  const [scheduleCurrentDayIndex, setScheduleCurrentDayIndex] = useState(0);

  // Delete employee state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [futureSchedulesForDelete, setFutureSchedulesForDelete] = useState<any[]>([]);

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
  const deleteEmployeeMutation = useDeleteEmployee();
  const generateScheduleMutation = useGenerateSchedule();
  const createVacationMutation = useCreateVacation();
  const deleteVacationMutation = useDeleteVacation();
  const createHolidayMutation = useCreateHoliday();
  const deleteHolidayMutation = useDeleteHoliday();
  const updateAvailabilityMutation = useUpdateAvailability();

  const activeEmployees = employees.filter(emp => emp.role === 'employee' && emp.isActive);

  // Filter availabilities for current week only (for stats display)
  const currentWeekAvailabilities = availabilities.filter(a => a.weekStart === weekStartString);

  // Analyze shift availability
  const { analysis: shiftAnalysis } = useShiftAvailability(
    currentWeekAvailabilities,
    activeEmployees,
    vacations,
    holidays,
    weekStartString
  );

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

  const handleRemoveEmployee = async (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    setEmployeeToDelete({ id: employeeId, name: employee.name });

    try {
      // Check for schedule conflicts without deleting (confirm=false means check only)
      const result = await employeeAPI.delete(employeeId, { confirm: false });

      if (result.hasScheduleConflicts && result.futureSchedules) {
        // Show modal with schedule conflict info
        setFutureSchedulesForDelete(result.futureSchedules);
        setDeleteModalOpen(true);
      } else {
        // No conflicts, show simple confirmation
        setFutureSchedulesForDelete([]);
        setDeleteModalOpen(true);
      }
    } catch (error: any) {
      console.error('Error checking employee deletion:', error);
      alert(error.response?.data?.error || 'שגיאה בבדיקת העובד למחיקה');
      setEmployeeToDelete(null);
    }
  };

  const handleConfirmDelete = async (removeFromSchedules: boolean) => {
    if (!employeeToDelete) return;

    try {
      const result = await deleteEmployeeMutation.mutateAsync({
        id: employeeToDelete.id,
        confirm: true,
        removeFromSchedules,
      });

      if (!result.hasScheduleConflicts) {
        const scheduleMessage = result.removedFromSchedules
          ? ` והוסר מ-${result.scheduleCount} סידורים עתידיים`
          : '';
        alert(`העובד ${employeeToDelete.name} נמחק בהצלחה${scheduleMessage}!`);
        setDeleteModalOpen(false);
        setEmployeeToDelete(null);
        setFutureSchedulesForDelete([]);
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      alert(error.response?.data?.error || 'שגיאה במחיקת העובד');
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setEmployeeToDelete(null);
    setFutureSchedulesForDelete([]);
  };

  const handleResetPassword = (employeeId: string) => {
    console.log('Reset password:', employeeId);
    // TODO: Implement password reset
  };

  const handleAvailabilityChange = async (employeeId: string, day: string, shiftId: string, status: AvailabilityStatus) => {
    // Find the employee's availability for the current week
    const employeeAvailability = availabilities.find(
      a => a.employeeId === employeeId && a.weekStart === weekStartString
    );

    if (!employeeAvailability) {
      console.error('No availability found for employee');
      return;
    }

    // Create updated shifts object
    const updatedShifts = { ...employeeAvailability.shifts };
    if (!updatedShifts[day]) {
      updatedShifts[day] = {};
    }
    updatedShifts[day][shiftId] = {
      ...updatedShifts[day][shiftId],
      status
    };

    try {
      await updateAvailabilityMutation.mutateAsync({
        id: employeeAvailability.id,
        shifts: updatedShifts
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('שגיאה בעדכון הזמינות');
    }
  };

  const handleCommentChange = async (employeeId: string, day: string, shiftId: string, comment: string) => {
    // Find the employee's availability for the current week
    const employeeAvailability = availabilities.find(
      a => a.employeeId === employeeId && a.weekStart === weekStartString
    );

    if (!employeeAvailability) {
      console.error('No availability found for employee');
      return;
    }

    // Create updated shifts object
    const updatedShifts = { ...employeeAvailability.shifts };
    if (!updatedShifts[day]) {
      updatedShifts[day] = {};
    }
    updatedShifts[day][shiftId] = {
      ...updatedShifts[day][shiftId],
      comment
    };

    try {
      await updateAvailabilityMutation.mutateAsync({
        id: employeeAvailability.id,
        shifts: updatedShifts
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('שגיאה בעדכון ההערה');
    }
  };

  const handleLockToggle = async (day: string, shiftId: string, locked: boolean) => {
    if (!currentSchedule) return;

    const updatedLockedAssignments = {
      ...currentSchedule.lockedAssignments,
      [day]: {
        ...(currentSchedule.lockedAssignments?.[day] || {}),
        [shiftId]: locked
      }
    };

    try {
      await scheduleAPI.update(currentSchedule.id, {
        lockedAssignments: updatedLockedAssignments
      });

      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', 'week', weekStartString] });
    } catch (error) {
      console.error('Error updating lock status:', error);
      alert('שגיאה בעדכון נעילת המשמרת');
    }
  };

  const handleFreezeToggle = async (day: string, shiftId: string, frozen: boolean) => {
    if (!currentSchedule) return;

    console.log('🧊 handleFreezeToggle called:', { day, shiftId, frozen, currentScheduleId: currentSchedule.id });

    const updatedFrozenAssignments = {
      ...currentSchedule.frozenAssignments,
      [day]: {
        ...(currentSchedule.frozenAssignments?.[day] || {}),
        [shiftId]: frozen
      }
    };

    console.log('🧊 Updated frozenAssignments:', updatedFrozenAssignments);

    try {
      const result = await scheduleAPI.update(currentSchedule.id, {
        frozenAssignments: updatedFrozenAssignments
      });

      console.log('🧊 API update successful, returned schedule:', result.schedule.frozenAssignments);

      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', 'week', weekStartString] });

      console.log('🧊 Invalidated queries');
    } catch (error) {
      console.error('Error updating freeze status:', error);
      alert('שגיאה בעדכון הקפאת המשמרת');
    }
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
    shiftAnalysis,
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
    onAvailabilityChange: handleAvailabilityChange,
    onCommentChange: handleCommentChange,
    onLockToggle: handleLockToggle,
    onFreezeToggle: handleFreezeToggle,
    onMenuChange: setActiveMenu,
    isGenerating: generateScheduleMutation.isPending,
    isPublishing,
    // Tab state preservation props
    selectedEmployee,
    onSelectedEmployeeChange: setSelectedEmployee,
    availabilityEditMode,
    onAvailabilityEditModeChange: setAvailabilityEditMode,
    scheduleCurrentDayIndex,
    onScheduleCurrentDayIndexChange: setScheduleCurrentDayIndex
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

      {/* Delete Employee Modal */}
      {employeeToDelete && (
        <DeleteEmployeeModal
          isOpen={deleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          employeeName={employeeToDelete.name}
          futureSchedules={futureSchedulesForDelete}
          isLoading={deleteEmployeeMutation.isPending}
        />
      )}
    </>
  );
};

export default ManagerDashboardAPI;
