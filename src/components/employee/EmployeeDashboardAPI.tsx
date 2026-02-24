import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Availability, AvailabilityStatus } from '../../types';
import { formatDate, isSubmissionDeadlinePassed, getSubmissionWeek, getNextWeek, getWeekStart } from '../../utils/dateUtils';
import { validateAvailabilitySubmission } from '../../utils/scheduleValidation';
import { useEmployees } from '../../hooks/useEmployees';
import { useAvailabilities, useCreateAvailability, useUpdateAvailability } from '../../hooks/useAvailabilities';
import { useScheduleByWeek } from '../../hooks/useSchedules';
import { useVacations, useHolidays } from '../../hooks/useVacations';
import { EmployeeDashboardMobile } from './mobile/EmployeeDashboardMobile';
import { EmployeeDashboardDesktop } from './desktop/EmployeeDashboardDesktop';

const EmployeeDashboardAPI = () => {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const submissionWeek = getSubmissionWeek();
    return isSubmissionDeadlinePassed(submissionWeek) ? getNextWeek(submissionWeek) : submissionWeek;
  });
  const [availability, setAvailability] = useState<Availability['shifts']>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const weekStartString = formatDate(currentWeekStart);
  const isDeadlinePassed = isSubmissionDeadlinePassed(currentWeekStart);

  // Fetch data with React Query
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  // Fetch ALL availabilities for this employee (not filtered by week)
  const { data: allAvailabilities = [], isLoading: availabilityLoading } = useAvailabilities();

  // Filter to get availability for current week and current employee
  console.log('🔍 Looking for availability:', {
    userId: user?.id,
    weekStartString,
    allAvailabilities: allAvailabilities.map(av => ({
      employeeId: av.employeeId,
      weekStart: av.weekStart
    }))
  });

  const existingAvailability = allAvailabilities.find(
    av => av.employeeId === user?.id && av.weekStart === weekStartString
  );

  console.log('📊 Found availability:', existingAvailability ? 'YES' : 'NO');

  const { data: currentSchedule, isLoading: scheduleLoading } = useScheduleByWeek(weekStartString);
  const { data: vacations = [] } = useVacations({ employeeId: user?.id });
  const { data: holidays = [] } = useHolidays();

  // Mutations
  const createMutation = useCreateAvailability();
  const updateMutation = useUpdateAvailability();

  const isSchedulePublished = currentSchedule?.isPublished || false;

  // Initialize availability when data loads
  React.useEffect(() => {
    if (availabilityLoading) return;

    if (existingAvailability) {
      setAvailability(existingAvailability.shifts);
    } else {
      // Initialize with all shifts marked as available by default
      const defaultAvailability: Availability['shifts'] = {};
      // Days 0-6 (Sunday to Saturday)
      for (let day = 0; day < 7; day++) {
        defaultAvailability[day.toString()] = {
          morning: { status: 'available' },
          evening: { status: 'available' },
          night: { status: 'available' }
        };
      }
      setAvailability(defaultAvailability);
    }
    setHasChanges(false);
  }, [existingAvailability, availabilityLoading, weekStartString]);

  // Validate when availability changes
  React.useEffect(() => {
    const vacationDates = vacations.map(v => v.date);
    const errors = validateAvailabilitySubmission(availability, vacationDates, user?.name || '');
    setValidationErrors(errors.map(e => e.message));
  }, [availability, vacations, user?.name]);

  const handleAvailabilityChange = (day: string, shiftId: string, status: AvailabilityStatus) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [shiftId]: {
          ...prev[day]?.[shiftId],
          status
        }
      }
    }));
    setHasChanges(true);
  };

  const handleCommentChange = (day: string, shiftId: string, comment: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [shiftId]: {
          ...prev[day]?.[shiftId],
          comment,
          status: prev[day]?.[shiftId]?.status || 'available'
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (validationErrors.length > 0) return;

    try {
      if (existingAvailability) {
        // Update existing
        await updateMutation.mutateAsync({
          id: existingAvailability.id!,
          shifts: availability,
        });
      } else {
        // Create new
        await createMutation.mutateAsync({
          employeeId: user!.id,
          weekStart: weekStartString,
          shifts: availability,
        });
      }

      setHasChanges(false);
      alert('הזמינות נשמרה בהצלחה!');
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('שגיאה בשמירת הזמינות');
    }
  };

  const getVacationDates = () => {
    return vacations.map(v => v.date);
  };

  const getDeadlineText = () => {
    // Calculate deadline for the week that is 2 weeks before the target week
    const twoWeeksBefore = new Date(currentWeekStart);
    twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);

    const deadline = new Date(twoWeeksBefore);
    deadline.setDate(deadline.getDate() + 2); // Tuesday of 2 weeks before
    deadline.setHours(12, 0, 0, 0);

    return deadline.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const goToSubmissionWeek = () => {
    const submissionWeek = getSubmissionWeek();
    const isDeadlinePassed = isSubmissionDeadlinePassed(submissionWeek);

    // If deadline passed for current submission week, show next submission week
    if (isDeadlinePassed) {
      setCurrentWeekStart(getNextWeek(submissionWeek));
    } else {
      setCurrentWeekStart(submissionWeek);
    }
  };

  const isCurrentWeekSubmissionWeek = () => {
    const submissionWeek = getSubmissionWeek();
    const isDeadlinePassed = isSubmissionDeadlinePassed(submissionWeek);

    if (isDeadlinePassed) {
      const nextSubmissionWeek = getNextWeek(submissionWeek);
      return formatDate(currentWeekStart) === formatDate(nextSubmissionWeek);
    } else {
      return formatDate(currentWeekStart) === formatDate(submissionWeek);
    }
  };

  // Shared props for both mobile and desktop
  const sharedProps = {
    availability,
    currentSchedule: currentSchedule || null,
    employees,
    vacations,
    holidays,
    currentWeekStart,
    validationErrors,
    hasChanges,
    isDeadlinePassed,
    isSchedulePublished,
    existingAvailability,
    onAvailabilityChange: handleAvailabilityChange,
    onCommentChange: handleCommentChange,
    onSave: handleSave,
    onWeekChange: setCurrentWeekStart,
    goToSubmissionWeek,
    isCurrentWeekSubmissionWeek: isCurrentWeekSubmissionWeek(),
    getDeadlineText
  };

  // Loading state
  if (employeesLoading || availabilityLoading) {
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
    <>
      {/* Mobile View */}
      <div className="lg:hidden">
        <EmployeeDashboardMobile {...sharedProps} />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <EmployeeDashboardDesktop {...sharedProps} />
      </div>
    </>
  );
};

export default EmployeeDashboardAPI;
