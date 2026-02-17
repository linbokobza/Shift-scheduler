import { useState, useEffect } from 'react';
import { Users, Calendar, Zap, AlertTriangle, Send, CalendarDays } from 'lucide-react';
import { User, Availability, VacationDay, Schedule, Holiday, ValidationError, ScheduleGenerationResult, AvailabilityStatus } from '../../types';
import { formatDate, isSubmissionDeadlinePassed } from '../../utils/dateUtils';
import { generateSchedule } from '../../utils/scheduleUtils';
import { generateOptimizedSchedule } from '../../utils/optimizedScheduler';
import { getMockAvailability, getMockVacationDays, getMockHolidays, mockSchedules } from '../../data/mockData';
import WeekNavigator from '../WeekNavigator';
import ScheduleView from '../ScheduleView';
import SubmissionsModal from './SubmissionsModal';
import AvailabilityViewer from './AvailabilityViewer';
import ScheduleErrorsModal from './ScheduleErrorsModal';
import CalendarView from '../CalendarView';
import AvailabilitySummary from '../AvailabilitySummary';
import Sidebar from './Sidebar';
import { getSubmissionWeek } from '../../utils/dateUtils';
import { axiosInstance } from '../../api/axios.config';

type MenuOption = 'employees' | 'vacations' | 'holidays';

const ManagerDashboard = () => {
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
  const [employees, setEmployees] = useState<User[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [vacationDays, setVacationDays] = useState<VacationDay[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showErrorsModal, setShowErrorsModal] = useState(false);
  const [scheduleErrors, setScheduleErrors] = useState<ValidationError[]>([]);
  const [scheduleWarnings, setScheduleWarnings] = useState<ValidationError[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuOption>('employees');

  console.log('🟢 ManagerDashboard rendered - activeMenu:', activeMenu);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedEmployees = localStorage.getItem('employees');
    const savedAvailabilities = localStorage.getItem('availabilities');
    const savedVacations = localStorage.getItem('vacationDays');
    const savedHolidays = localStorage.getItem('holidays');
    const savedSchedules = localStorage.getItem('schedules');

    setEmployees(savedEmployees ? JSON.parse(savedEmployees) : []);
    setAvailabilities(savedAvailabilities ? JSON.parse(savedAvailabilities) : getMockAvailability());
    setVacationDays(savedVacations ? JSON.parse(savedVacations) : getMockVacationDays());
    setHolidays(savedHolidays ? JSON.parse(savedHolidays) : getMockHolidays());
    setSchedules(savedSchedules ? JSON.parse(savedSchedules) : mockSchedules);
  }, []);

  const weekStartString = formatDate(currentWeekStart);
  const currentSchedule = schedules.find(s => s.weekStart === weekStartString);
  const activeEmployees = employees.filter(emp => emp.role === 'employee' && emp.isActive);
  const isDeadlinePassed = isSubmissionDeadlinePassed(currentWeekStart);

  const handleToggleActive = (employeeId: string) => {
    setEmployees(prev => {
      const updated = prev.map(emp =>
        emp.id === employeeId ? { ...emp, isActive: !emp.isActive } : emp
      );
      // Save to localStorage
      localStorage.setItem('employees', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddEmployee = (name: string, email: string, password: string) => {
    const newEmployee: User = {
      id: Date.now().toString(),
      name,
      email,
      role: 'employee',
      isActive: true
    };

    setEmployees(prev => {
      const updated = [...prev, newEmployee];
      // Save to localStorage
      localStorage.setItem('employees', JSON.stringify(updated));
      return updated;
    });

    // Store password for demo purposes (in real app, this would be handled by backend)
    const passwords = JSON.parse(localStorage.getItem('employeePasswords') || '{}');
    passwords[email] = password;
    localStorage.setItem('employeePasswords', JSON.stringify(passwords));
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setEmployees(prev => {
      const updated = prev.filter(emp => emp.id !== employeeId);
      // Save to localStorage
      localStorage.setItem('employees', JSON.stringify(updated));
      return updated;
    });

    // Also remove employee's availability and vacation data
    setAvailabilities(prev => {
      const updated = prev.filter(a => a.employeeId !== employeeId);
      localStorage.setItem('availabilities', JSON.stringify(updated));
      return updated;
    });

    setVacationDays(prev => {
      const updated = prev.filter(v => v.employeeId !== employeeId);
      localStorage.setItem('vacationDays', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetPassword = (employeeId: string) => {
    // In a real app, this would call an API to reset the password
    // For demo purposes, we'll just log it
    console.log(`Password reset for employee ${employeeId} to: password`);
  };

  const handleAddVacation = (employeeId: string, startDate: Date, endDate: Date, type: 'vacation' | 'sick') => {
    const newVacations: VacationDay[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends (Friday evening/Saturday)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 5 && dayOfWeek !== 6) { // Not Friday or Saturday
        newVacations.push({
          id: `${employeeId}-${formatDate(currentDate)}-${Date.now()}`,
          employeeId,
          date: formatDate(currentDate),
          type,
          createdAt: new Date().toISOString()
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setVacationDays(prev => {
      const updated = [...prev, ...newVacations];
      localStorage.setItem('vacationDays', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveVacation = (vacationId: string) => {
    setVacationDays(prev => {
      const updated = prev.filter(v => v.id !== vacationId);
      localStorage.setItem('vacationDays', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddHoliday = (date: string, name: string, type: 'no-work' | 'morning-only') => {
    const newHoliday: Holiday = {
      id: Date.now().toString(),
      date,
      name,
      type,
      createdAt: new Date().toISOString()
    };

    setHolidays(prev => {
      const updated = [...prev, newHoliday];
      localStorage.setItem('holidays', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveHoliday = (holidayId: string) => {
    setHolidays(prev => {
      const updated = prev.filter(h => h.id !== holidayId);
      localStorage.setItem('holidays', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get existing schedule for locked assignments
    const existingSchedule = schedules.find(s => s.weekStart === weekStartString);

    // Try optimized algorithm first
    let result: ScheduleGenerationResult;
    try {
      console.log('Trying optimized algorithm...');
      result = generateOptimizedSchedule(
        availabilities,
        vacationDays,
        holidays,
        activeEmployees,
        weekStartString,
        existingSchedule
      );

      console.log('Optimized result:', result);

      // If optimization failed, fall back to original algorithm
      if (!result || !result.schedule) {
        console.log('Optimization returned no schedule, falling back to original algorithm');
        result = generateSchedule(
          availabilities,
          vacationDays,
          holidays,
          activeEmployees,
          weekStartString
        );
        console.log('Original algorithm result:', result);
      } else {
        console.log('Optimization succeeded!');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      // Fallback to original algorithm
      console.log('Falling back to original algorithm due to error');
      result = generateSchedule(
        availabilities,
        vacationDays,
        holidays,
        activeEmployees,
        weekStartString
      );
      console.log('Original algorithm result:', result);
    }

    setScheduleErrors(result.errors);
    setScheduleWarnings(result.warnings);

    if (result.schedule) {
      setSchedules(prev => {
        const filtered = prev.filter(s => s.weekStart !== weekStartString);
        const updated = [...filtered, result.schedule!];
        // Save to localStorage
        localStorage.setItem('schedules', JSON.stringify(updated));
        return updated;
      });
    }

    // Show errors/warnings modal if there are any
    if (result.errors.length > 0 || result.warnings.length > 0) {
      setShowErrorsModal(true);
    }

    setIsGenerating(false);
  };

  const handleRegenerateSchedule = async () => {
    // handleGenerateSchedule already replaces schedules for the same weekStart
    // so we don't need to manually delete the old one
    await handleGenerateSchedule();
  };

  const handleScheduleChange = (day: string, shiftId: string, employeeId: string | null) => {
    if (!currentSchedule) return;

    // Don't allow changes to Friday evening/night and Saturday
    const dayNum = parseInt(day);
    const isRestrictedTime = (dayNum === 5 && (shiftId === 'evening' || shiftId === 'night')) || dayNum === 6;
    if (isRestrictedTime) return;
    const updatedSchedule = {
      ...currentSchedule,
      assignments: {
        ...currentSchedule.assignments,
        [day]: {
          ...currentSchedule.assignments[day],
          [shiftId]: employeeId
        }
      }
    };

    setSchedules(prev => {
      const updated = prev.map(s =>
        s.id === currentSchedule.id ? updatedSchedule : s
      );
      // Save to localStorage
      localStorage.setItem('schedules', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLockToggle = (day: string, shiftId: string, locked: boolean) => {
    if (!currentSchedule) return;

    const updatedSchedule = {
      ...currentSchedule,
      lockedAssignments: {
        ...currentSchedule.lockedAssignments,
        [day]: {
          ...(currentSchedule.lockedAssignments?.[day] || {}),
          [shiftId]: locked
        }
      }
    };

    setSchedules(prev => {
      const updated = prev.map(s =>
        s.id === currentSchedule.id ? updatedSchedule : s
      );
      // Save to localStorage
      localStorage.setItem('schedules', JSON.stringify(updated));
      return updated;
    });
  };

  const handleFreezeToggle = (day: string, shiftId: string, frozen: boolean) => {
    if (!currentSchedule) return;

    console.log('🧊 handleFreezeToggle:', { day, shiftId, frozen, currentScheduleId: currentSchedule.id });

    const updatedSchedule = {
      ...currentSchedule,
      frozenAssignments: {
        ...currentSchedule.frozenAssignments,
        [day]: {
          ...(currentSchedule.frozenAssignments?.[day] || {}),
          [shiftId]: frozen
        }
      }
    };

    console.log('🧊 Updated schedule frozenAssignments:', updatedSchedule.frozenAssignments);

    setSchedules(prev => {
      const updated = prev.map(s =>
        s.id === currentSchedule.id ? updatedSchedule : s
      );
      // Save to localStorage
      localStorage.setItem('schedules', JSON.stringify(updated));
      console.log('🧊 Saved to localStorage:', updated.find(s => s.id === currentSchedule.id)?.frozenAssignments);
      return updated;
    });
  };

  const handlePublishSchedule = async () => {
    if (!currentSchedule) return;

    setIsPublishing(true);

    try {
      // Call the API to publish the schedule
      const response = await axiosInstance.patch(`/schedules/${currentSchedule.id}/publish`);

      if (response.status === 200) {
        // Update local state with the published schedule
        const updatedSchedule = {
          ...currentSchedule,
          isPublished: true,
          publishedAt: new Date().toISOString()
        };

        setSchedules(prev => {
          const updated = prev.map(s =>
            s.id === currentSchedule.id ? updatedSchedule : s
          );
          // Save to localStorage for offline support
          localStorage.setItem('schedules', JSON.stringify(updated));
          return updated;
        });

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

  const handleAvailabilityChange = (employeeId: string, day: string, shiftId: string, status: AvailabilityStatus) => {
    setAvailabilities(prev => {
      const updated = prev.map(availability => {
        if (availability.employeeId === employeeId && availability.weekStart === weekStartString) {
          return {
            ...availability,
            shifts: {
              ...availability.shifts,
              [day]: {
                ...availability.shifts[day],
                [shiftId]: {
                  ...availability.shifts[day]?.[shiftId],
                  status
                }
              }
            }
          };
        }
        return availability;
      });

      // Save to localStorage
      localStorage.setItem('availabilities', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCommentChange = (employeeId: string, day: string, shiftId: string, comment: string) => {
    setAvailabilities(prev => {
      const updated = prev.map(availability => {
        if (availability.employeeId === employeeId && availability.weekStart === weekStartString) {
          return {
            ...availability,
            shifts: {
              ...availability.shifts,
              [day]: {
                ...availability.shifts[day],
                [shiftId]: {
                  ...availability.shifts[day]?.[shiftId],
                  comment,
                  status: availability.shifts[day]?.[shiftId]?.status || 'available'
                }
              }
            }
          };
        }
        return availability;
      });

      // Save to localStorage
      localStorage.setItem('availabilities', JSON.stringify(updated));
      return updated;
    });
  };

  const getSubmissionStats = () => {
    const weekAvailabilities = availabilities.filter(a => a.weekStart === weekStartString);
    const submitted = weekAvailabilities.length;
    const total = activeEmployees.length;

    return { submitted, total };
  };

  const stats = getSubmissionStats();

  // Render sidebar menu views (employees, vacations, holidays)
  if (activeMenu === 'employees' || activeMenu === 'vacations' || activeMenu === 'holidays') {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          employees={employees}
          vacationDays={vacationDays}
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
        />
        <div className="flex-1 overflow-auto" />
      </div>
    );
  }

  // Default: Render schedule view
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
        employees={employees}
        vacationDays={vacationDays}
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
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header with Calendar Button */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">ניהול משמרות</h2>
                <p className="text-gray-600">
                  נהלו עובדים, צפו בזמינות וצרו סידורי עבודה
                </p>
              </div>
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CalendarDays className="w-5 h-5 ml-2" />
                לוח שנה
              </button>
            </div>
          </div>

          <WeekNavigator
            currentWeekStart={currentWeekStart}
            onWeekChange={setCurrentWeekStart}
          />

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="mr-3">
                  <div className="text-2xl font-bold text-gray-900">{activeEmployees.length}</div>
                  <div className="text-sm text-gray-600">עובדים פעילים</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <Calendar
                  className="w-8 h-8 text-green-600 cursor-pointer hover:text-green-700 transition-colors"
                  onClick={() => setShowSubmissionsModal(true)}
                />
                <div className="mr-3">
                  <div
                    className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-green-600 transition-colors"
                    onClick={() => setShowSubmissionsModal(true)}
                  >
                    {stats.submitted}/{stats.total}
                  </div>
                  <div
                    className="text-sm text-gray-600 cursor-pointer hover:text-green-600 transition-colors"
                    onClick={() => setShowSubmissionsModal(true)}
                  >
                    הגשות זמינות
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                {isDeadlinePassed ? (
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                ) : (
                  <Zap className="w-8 h-8 text-yellow-600" />
                )}
                <div className="mr-3">
                  <div className="text-sm font-medium text-gray-900">
                    {isDeadlinePassed ? 'המועד עבר' : 'פתוח להגשה'}
                  </div>
                  <div className="text-xs text-gray-600">מועד אחרון: שלישי 12:00</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="mb-6">
              {!currentSchedule ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-yellow-900 font-medium">לא נוצר סידור לשבוע זה</h4>
                      <p className="text-yellow-700 text-sm mt-1">
                        לחצו על "צור סידור" כדי ליצור סידור אוטומטי מבוסס על הזמינות שהוגשה
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateSchedule}
                      disabled={isGenerating || stats.submitted === 0}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                      ) : (
                        <Zap className="w-4 h-4 ml-1" />
                      )}
                      {isGenerating ? 'יוצר...' : 'צור סידור'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-green-900 font-medium">סידור קיים</h4>
                      <p className="text-green-700 text-sm mt-1">
                        ניתן לערוך את הסידור על ידי לחיצה על התאים. לחץ "פרסם סידור" כדי לפרסם לעובדים.
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handlePublishSchedule}
                        disabled={isPublishing}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center ml-2"
                      >
                        {isPublishing ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                        ) : (
                          <Send className="w-4 h-4 ml-1" />
                        )}
                        {isPublishing ? 'מפרסם...' : 'פרסם סידור'}
                      </button>
                      <button
                        onClick={handleRegenerateSchedule}
                        disabled={isGenerating}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 flex items-center"
                      >
                        {isGenerating ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                        ) : (
                          <Zap className="w-4 h-4 ml-1" />
                        )}
                        {isGenerating ? 'יוצר מחדש...' : 'צור מחדש'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <ScheduleView
              schedule={currentSchedule || null}
              employees={employees}
              holidays={holidays}
              weekStart={currentWeekStart}
              onAssignmentChange={handleScheduleChange}
              onLockToggle={handleLockToggle}
              onFreezeToggle={handleFreezeToggle}
              readonly={false}
              showLockControls={true}
            />

            {/* תצוגת זמינויות ומשמרות */}
            {currentSchedule && (
              <>
                <AvailabilitySummary
                  schedule={currentSchedule}
                  employees={employees}
                  availabilities={availabilities}
                />

                {/* תצוגה מפורטת של אילוצים */}
                <div className="mt-6">
                  <AvailabilityViewer
                    employees={employees}
                    availabilities={availabilities}
                    vacationDays={vacationDays}
                    holidays={holidays}
                    weekStart={currentWeekStart}
                    onAvailabilityChange={handleAvailabilityChange}
                    onCommentChange={handleCommentChange}
                  />
                </div>
              </>
            )}
          </div>

          <SubmissionsModal
            isOpen={showSubmissionsModal}
            onClose={() => setShowSubmissionsModal(false)}
            employees={employees}
            availabilities={availabilities}
            holidays={holidays}
            weekStart={currentWeekStart}
          />

          <ScheduleErrorsModal
            isOpen={showErrorsModal}
            onClose={() => setShowErrorsModal(false)}
            errors={scheduleErrors}
            warnings={scheduleWarnings}
          />

          {showCalendar && (
            <CalendarView
              employees={employees}
              vacationDays={vacationDays}
              holidays={holidays}
              onClose={() => setShowCalendar(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
