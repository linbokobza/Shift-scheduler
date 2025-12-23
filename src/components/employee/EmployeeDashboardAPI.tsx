import React, { useState } from 'react';
import { Clock, AlertCircle, CheckCircle, Save, Calendar, Eye, ArrowLeft, CalendarDays } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Availability, AvailabilityStatus } from '../../types';
import { getWeekStart, formatDate, isSubmissionDeadlinePassed, getSubmissionWeek, getNextWeek } from '../../utils/dateUtils';
import { validateAvailabilitySubmission } from '../../utils/scheduleValidation';
import { useEmployees } from '../../hooks/useEmployees';
import { useAvailabilities, useEmployeeAvailability, useCreateAvailability, useUpdateAvailability } from '../../hooks/useAvailabilities';
import { useScheduleByWeek } from '../../hooks/useSchedules';
import { useVacations, useHolidays } from '../../hooks/useVacations';
import WeekNavigator from '../WeekNavigator';
import AvailabilityGrid from '../AvailabilityGrid';
import VacationManager from '../VacationManager';
import ScheduleView from '../ScheduleView';
import CalendarView from '../CalendarView';

const EmployeeDashboardAPI = () => {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const submissionWeek = getSubmissionWeek();
    const isDeadlinePassed = isSubmissionDeadlinePassed(submissionWeek);

    // If deadline passed for current submission week, show next submission week
    if (isDeadlinePassed) {
      return getNextWeek(submissionWeek);
    }
    return submissionWeek;
  });
  const [availability, setAvailability] = useState<Availability['shifts']>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

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
    <div className="max-w-7xl mx-auto container-mobile overflow-hidden">
      {/* Header with Calendar Button */}
      <div className="mb-4 lg:mb-6 bg-white rounded-lg shadow-sm border p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">הגשת זמינות למשמרות</h2>
            <p className="text-gray-600">
              בחרו את הזמינות שלכם לכל משמרת בשבוע. ניתן להוסיף הערות לכל משמרת.
            </p>
          </div>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center bg-purple-600 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm lg:text-base"
          >
            <CalendarDays className="w-5 h-5 ml-2" />
            לוח שנה
          </button>
        </div>
      </div>

      <WeekNavigator
        currentWeekStart={currentWeekStart}
        onWeekChange={setCurrentWeekStart}
        showSubmissionWeekButton={true}
        onGoToSubmissionWeek={goToSubmissionWeek}
        isCurrentWeekSubmissionWeek={isCurrentWeekSubmissionWeek()}
      />

      {/* Toggle between availability and schedule view */}
      <div className="bg-white rounded-lg shadow-sm border mb-4 lg:mb-6">
        <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowSchedule(false)}
              className={`flex items-center px-3 lg:px-4 py-2 text-sm lg:text-base rounded-lg transition-all ${
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
              className={`flex items-center px-3 lg:px-4 py-2 text-sm lg:text-base rounded-lg transition-all ${
                showSchedule
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={!currentSchedule || !isSchedulePublished}
            >
              <Eye className="w-4 h-4 ml-1" />
              צפייה בסידור
              {(!currentSchedule || !isSchedulePublished) && <span className="text-xs mr-1">(לא זמין)</span>}
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

        {/* Navigation buttons for submission week */}
        {!showSchedule && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {!isCurrentWeekSubmissionWeek() && (
                  <button
                    onClick={goToSubmissionWeek}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 ml-1" />
                    עבור לשבוע הגשה
                  </button>
                )}

                {!isCurrentWeekSubmissionWeek() && (
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    צופה בשבוע אחר
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-600">
                {isCurrentWeekSubmissionWeek() ? (
                  <span className="text-green-600 font-medium">שבוע הגשה נוכחי</span>
                ) : (
                  <span>לחץ "עבור לשבוע הגשה" להגשת זמינות</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCalendar && (
        <CalendarView
          employees={employees}
          vacationDays={vacations}
          holidays={holidays}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Status Bar */}
      {!showSchedule && (
        <div className="bg-white rounded-lg shadow-sm border p-3 lg:p-4 mb-4 lg:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 ml-2" />
                <span className="text-sm text-gray-700">
                  מועד אחרון להגשה לשבוע זה: {getDeadlineText()}
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
              <div className="flex items-center space-x-2">
                {validationErrors.length > 0 && (
                  <div className="text-red-600 text-sm ml-2">
                    {validationErrors[0]}
                  </div>
                )}
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending || validationErrors.length > 0}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                ) : (
                  <Save className="w-4 h-4 ml-1" />
                )}
                שמירה
              </button>
              </div>
            )}
          </div>

          {existingAvailability && (
            <div className="mt-2 text-xs text-gray-500">
              נשמר לאחרונה: {new Date(existingAvailability.submittedAt).toLocaleTimeString('he-IL')}
            </div>
          )}
          </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
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

      {showSchedule ? (
        <div>
          {scheduleLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">טוען סידור...</p>
            </div>
          ) : (
            <ScheduleView
              schedule={currentSchedule || null}
              employees={employees}
              availabilities={[]}
              vacationDays={vacations}
              holidays={holidays}
              weekStart={currentWeekStart}
              readonly={true}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <AvailabilityGrid
            availability={availability}
            vacationDays={getVacationDates()}
            holidays={holidays}
            onAvailabilityChange={handleAvailabilityChange}
            onCommentChange={handleCommentChange}
            readonly={isDeadlinePassed}
            weekStart={currentWeekStart}
          />
        </div>

        <div>
          <VacationManager
            vacationDays={vacations}
            onAddVacation={() => {}} // Disabled for employees
            onRemoveVacation={() => {}} // Disabled for employees
            readonly={true} // Always readonly for employees
            weekStart={currentWeekStart}
          />

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm border p-3 lg:p-4 mt-4 lg:mt-6">
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
    </div>
  );
};

export default EmployeeDashboardAPI;
