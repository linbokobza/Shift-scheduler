import React, { useState } from 'react';
import { Calendar, Clock, Users, Plane, PartyPopper, CalendarDays } from 'lucide-react';
import { TabBar } from '../../ui/TabBar';
import { PullToRefresh } from '../../ui/PullToRefresh';
import WeekNavigator from '../../WeekNavigator';
import { ScheduleTabMobile } from './ScheduleTabMobile';
import { AvailabilityTabMobile } from './AvailabilityTabMobile';
import { EmployeesTabMobile } from './EmployeesTabMobile';
import { VacationsTabMobile } from './VacationsTabMobile';
import { HolidaysTabMobile } from './HolidaysTabMobile';
import CalendarView from '../../CalendarView';
import { Availability, Schedule, User, VacationDay, Holiday, AvailabilityStatus } from '../../../types';
import { useQueryClient } from '@tanstack/react-query';

interface ManagerDashboardMobileProps {
  // Data
  employees: User[];
  availabilities: Availability[];
  currentSchedule: Schedule | null;
  vacations: VacationDay[];
  holidays: Holiday[];
  currentWeekStart: Date;
  activeEmployees: User[];
  currentWeekAvailabilities: Availability[];

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
  onBulkAssignmentChange?: (changes: Array<{ day: string; shiftId: string; employeeId: string | null }>) => void;
  onAvailabilityChange: (employeeId: string, day: string, shiftId: string, status: AvailabilityStatus) => void;
  onCommentChange: (employeeId: string, day: string, shiftId: string, comment: string) => void;

  // Loading states
  isGenerating?: boolean;
  isPublishing?: boolean;
}

export const ManagerDashboardMobile: React.FC<ManagerDashboardMobileProps> = ({
  employees,
  availabilities,
  currentSchedule,
  vacations,
  holidays,
  currentWeekStart,
  activeEmployees,
  currentWeekAvailabilities,
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
  isGenerating = false,
  isPublishing = false
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'availability' | 'employees' | 'vacations' | 'holidays'>('schedule');
  const [showCalendar, setShowCalendar] = useState(false);
  const queryClient = useQueryClient();

  const handleRefreshSchedule = async () => {
    await queryClient.refetchQueries({ queryKey: ['schedules'] });
  };

  const handleRefreshAvailabilities = async () => {
    await queryClient.refetchQueries({ queryKey: ['availabilities'] });
  };

  const handleRefreshEmployees = async () => {
    await queryClient.refetchQueries({ queryKey: ['employees'] });
  };

  const handleRefreshVacations = async () => {
    await queryClient.refetchQueries({ queryKey: ['vacations'] });
  };

  const handleRefreshHolidays = async () => {
    await queryClient.refetchQueries({ queryKey: ['holidays'] });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white border-b z-20 shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">לוח מנהל</h1>
            <button
              onClick={() => setShowCalendar(true)}
              className="flex items-center bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <CalendarDays className="w-4 h-4 ml-2" />
              לוח שנה
            </button>
          </div>

          {/* Compact Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-xs text-gray-600">עובדים</div>
              <div className="text-lg font-bold text-blue-600">{activeEmployees.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-xs text-gray-600">הגשות</div>
              <div className="text-lg font-bold text-green-600">{currentWeekAvailabilities.length}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <div className="text-xs text-gray-600">סידור</div>
              <div className="text-lg font-bold text-purple-600">
                {currentSchedule ? 'קיים' : 'אין'}
              </div>
            </div>
          </div>

          {/* Week Navigator - only for schedule and availability tabs */}
          {(activeTab === 'schedule' || activeTab === 'availability') && (
            <WeekNavigator
              currentWeekStart={currentWeekStart}
              onWeekChange={onWeekChange}
            />
          )}
        </div>
      </header>

      {/* Tab Content (scrollable) */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'schedule' && (
          <PullToRefresh onRefresh={handleRefreshSchedule}>
            <ScheduleTabMobile
              schedule={currentSchedule}
              employees={employees}
              availabilities={availabilities}
              weekStart={currentWeekStart}
              holidays={holidays}
              onGenerateSchedule={onGenerateSchedule}
              onPublishSchedule={onPublishSchedule}
              onBulkAssignmentChange={onBulkAssignmentChange}
              isGenerating={isGenerating}
              isPublishing={isPublishing}
            />
          </PullToRefresh>
        )}

        {activeTab === 'availability' && (
          <PullToRefresh onRefresh={handleRefreshAvailabilities}>
            <AvailabilityTabMobile
              employees={employees}
              availabilities={availabilities}
              vacationDays={vacations}
              holidays={holidays}
              weekStart={currentWeekStart}
              onAvailabilityChange={onAvailabilityChange}
              onCommentChange={onCommentChange}
            />
          </PullToRefresh>
        )}

        {activeTab === 'employees' && (
          <PullToRefresh onRefresh={handleRefreshEmployees}>
            <EmployeesTabMobile
              employees={employees}
              onToggleActive={onToggleActive}
              onAddEmployee={onAddEmployee}
              onRemoveEmployee={onRemoveEmployee}
              onResetPassword={onResetPassword}
            />
          </PullToRefresh>
        )}

        {activeTab === 'vacations' && (
          <PullToRefresh onRefresh={handleRefreshVacations}>
            <VacationsTabMobile
              vacationDays={vacations}
              onAddVacation={onAddVacation}
              onRemoveVacation={onRemoveVacation}
              currentWeekStart={currentWeekStart}
            />
          </PullToRefresh>
        )}

        {activeTab === 'holidays' && (
          <PullToRefresh onRefresh={handleRefreshHolidays}>
            <HolidaysTabMobile
              holidays={holidays}
              onAddHoliday={onAddHoliday}
              onRemoveHoliday={onRemoveHoliday}
            />
          </PullToRefresh>
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <TabBar
        tabs={[
          { id: 'schedule', label: 'סידור משמרות', icon: <Calendar className="w-5 h-5" /> },
          { id: 'availability', label: 'זמינויות', icon: <Clock className="w-5 h-5" /> },
          { id: 'employees', label: 'עובדים', icon: <Users className="w-5 h-5" /> },
          { id: 'vacations', label: 'חופשות', icon: <Plane className="w-5 h-5" /> },
          { id: 'holidays', label: 'חגים', icon: <PartyPopper className="w-5 h-5" /> }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'schedule' | 'availability' | 'employees' | 'vacations' | 'holidays')}
      />

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
