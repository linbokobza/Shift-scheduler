import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, Save, Calendar, Eye, ArrowLeft, CalendarDays } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Availability, VacationDay, AvailabilityStatus, Schedule, User, Holiday } from '../../types';
import { getWeekStart, formatDate, isSubmissionDeadlinePassed, getSubmissionWeek, getNextWeek } from '../../utils/dateUtils';
import { validateAvailabilitySubmission } from '../../utils/scheduleValidation';
import { getMockAvailability, getMockVacationDays, getMockHolidays } from '../../data/mockData';
import WeekNavigator from '../WeekNavigator';
import AvailabilityGrid from '../AvailabilityGrid';
import VacationManager from '../VacationManager';
import ScheduleView from '../ScheduleView';
import CalendarView from '../CalendarView';

const EmployeeDashboard = () => {
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
  const [vacationDays, setVacationDays] = useState<VacationDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  // Re-validate when availability changes
  useEffect(() => {
    const errors = validateAvailabilitySubmission(availability, getVacationDates(), user?.name || '');
    setValidationErrors(errors.map(e => e.message));
  }, [availability, vacationDays, user?.name]);

  const weekStartString = formatDate(currentWeekStart);
  const isDeadlinePassed = isSubmissionDeadlinePassed(currentWeekStart);
  const currentSchedule = schedules.find(s => s.weekStart === weekStartString);
  const isSchedulePublished = currentSchedule?.isPublished || false;

  useEffect(() => {
    // Load existing availability
    const existingAvailability = getMockAvailability().find(
      a => a.employeeId === user?.id && a.weekStart === weekStartString
    );
    
    if (existingAvailability) {
      setAvailability(existingAvailability.shifts);
      setLastSaved(new Date());
    } else {
      // Initialize with empty availability - employee must explicitly mark shifts
      setAvailability({});
      setLastSaved(null);
    }

    // Load vacation days
    const employeeVacations = getMockVacationDays().filter(v => v.employeeId === user?.id);
    setVacationDays(employeeVacations);
    
    // Load holidays
    setHolidays(getMockHolidays());
    
    // Load schedules
    const savedSchedules = localStorage.getItem('schedules');
    setSchedules(savedSchedules ? JSON.parse(savedSchedules) : []);
    
    // Load employees (same as manager sees)
    const savedEmployees = localStorage.getItem('employees');
    setEmployees(savedEmployees ? JSON.parse(savedEmployees) : []);
    
    setHasChanges(false);
  }, [user?.id, weekStartString]);

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
    // Validation is now done in useEffect, so we can proceed if no errors
    if (validationErrors.length > 0) return;
    
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Save to localStorage for persistence
    const savedAvailabilities = JSON.parse(localStorage.getItem('availabilities') || '[]');
    const updatedAvailabilities = savedAvailabilities.filter(
      (a: Availability) => !(a.employeeId === user?.id && a.weekStart === weekStartString)
    );
    
    updatedAvailabilities.push({
      employeeId: user?.id,
      weekStart: weekStartString,
      shifts: availability
    });
    
    localStorage.setItem('availabilities', JSON.stringify(updatedAvailabilities));
    
    // Save vacation days to localStorage
    const savedVacations = JSON.parse(localStorage.getItem('vacationDays') || '[]');
    const updatedVacations = savedVacations.filter(
      (v: VacationDay) => v.employeeId !== user?.id
    );
    updatedVacations.push(...vacationDays);
    localStorage.setItem('vacationDays', JSON.stringify(updatedVacations));
    
    setHasChanges(false);
    setLastSaved(new Date());
    setIsSaving(false);
  };

  const handleAddVacation = (date: string, type: 'vacation' | 'sick') => {
    const selectedDateObj = new Date(date);
    const dayOfWeek = selectedDateObj.getDay();
    
    // Don't allow vacation on weekends
    if (dayOfWeek >= 5) {
      return;
    }
    
    const newVacation: VacationDay = {
      id: Date.now().toString(),
      employeeId: user?.id || '',
      date,
      type,
      createdAt: new Date().toISOString()
    };
    
    setVacationDays(prev => [...prev, newVacation]);
    setHasChanges(true);
  };

  const handleRemoveVacation = (id: string) => {
    setVacationDays(prev => prev.filter(v => v.id !== id));
    setHasChanges(true);
  };

  const getVacationDates = () => {
    return vacationDays.map(v => v.date);
  };

  const getDeadlineText = () => {
    // Calculate deadline for the week that is   weeks before the target week
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

  return (
    <div className="max-w-7xl mx-auto p-3 lg:p-6">
      {/* Header with Calendar Button */}
      <div className="mb-4 lg:mb-6 bg-white rounded-lg shadow-sm border p-3 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-lg lg:text-2xl font-bold text-gray-900 mb-1 lg:mb-2">הגשת זמינות למשמרות</h2>
            <p className="text-sm lg:text-base text-gray-600">
              בחרו את הזמינות שלכם לכל משמרת בשבוע. ניתן להוסיף הערות לכל משמרת.
            </p>
          </div>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center bg-purple-600 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm lg:text-base whitespace-nowrap"
          >
            <CalendarDays className="w-4 h-4 lg:w-5 lg:h-5 ml-1 lg:ml-2" />
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
        <div className="p-3 lg:p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowSchedule(false)}
              className={`flex items-center justify-center px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg transition-all text-sm lg:text-base ${
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
              className={`flex items-center justify-center px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg transition-all text-sm lg:text-base ${
                showSchedule
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={!currentSchedule || !isSchedulePublished}
            >
              <Eye className="w-4 h-4 ml-1" />
              <span className="truncate">צפייה בסידור</span>
              {(!currentSchedule || !isSchedulePublished) && <span className="text-xs mr-1 hidden sm:inline">(לא זמין)</span>}
            </button>
          </div>

          {currentSchedule && isSchedulePublished && (
            <div className="flex items-center justify-center sm:justify-start text-green-600">
              <Calendar className="w-4 h-4 ml-1" />
              <span className="text-xs lg:text-sm">סידור פורסם</span>
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
          vacationDays={vacationDays}
          holidays={holidays}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Status Bar */}
      {!showSchedule && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
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
              </div>
            )}
          </div>

          {lastSaved && (
            <div className="mt-2 text-xs text-gray-500">
              נשמר לאחרונה: {lastSaved.toLocaleTimeString('he-IL')}
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
          <ScheduleView
            schedule={currentSchedule || null}
            employees={employees}
            holidays={holidays}
            weekStart={currentWeekStart}
            readonly={true}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            vacationDays={vacationDays}
            onAddVacation={() => {}} // Disabled for employees
            onRemoveVacation={() => {}} // Disabled for employees
            readonly={true} // Always readonly for employees
            weekStart={currentWeekStart}
          />
          
          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mt-6">
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

export default EmployeeDashboard;