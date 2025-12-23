import React, { useState } from 'react';
import { Clock, Eye, Save, Calendar, AlertCircle, CheckCircle, CalendarDays, BarChart3, ShieldAlert } from 'lucide-react';
import { TabBar } from '../../ui/TabBar';
import { FloatingActionButton } from '../../ui/FloatingActionButton';
import { PullToRefresh } from '../../ui/PullToRefresh';
import WeekNavigator from '../../WeekNavigator';
import { ScheduleTabMobile } from './ScheduleTabMobile';
import { AvailabilityTabMobile } from './AvailabilityTabMobile';
import { SummaryTabMobile } from './SummaryTabMobile';
import { ConstraintsTabMobile } from './ConstraintsTabMobile';
import CalendarView from '../../CalendarView';
import { Availability, AvailabilityStatus, Schedule, User, VacationDay, Holiday } from '../../../types';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';

interface EmployeeDashboardMobileProps {
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

export const EmployeeDashboardMobile: React.FC<EmployeeDashboardMobileProps> = ({
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
  const [activeTab, setActiveTab] = useState<'availability' | 'schedule' | 'summary' | 'constraints'>('availability');
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshAvailability = async () => {
    await queryClient.refetchQueries({ queryKey: ['availabilities'] });
    await queryClient.refetchQueries({ queryKey: ['vacations'] });
  };

  const handleRefreshSchedule = async () => {
    await queryClient.refetchQueries({ queryKey: ['schedules'] });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white border-b z-20 shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">הגשת זמינות</h2>
            <button
              onClick={() => setShowCalendar(true)}
              className="flex items-center bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <CalendarDays className="w-4 h-4 ml-2" />
              לוח שנה
            </button>
          </div>

          {/* Week Navigator */}
          <WeekNavigator
            currentWeekStart={currentWeekStart}
            onWeekChange={onWeekChange}
            showSubmissionWeekButton={true}
            onGoToSubmissionWeek={goToSubmissionWeek}
            isCurrentWeekSubmissionWeek={isCurrentWeekSubmissionWeek}
          />

          {/* Deadline Status */}
          {activeTab === 'availability' && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-blue-600 ml-1" />
                <span className="text-gray-700">
                  מועד: {getDeadlineText()}
                </span>
              </div>

              {isDeadlinePassed ? (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-4 h-4 ml-1" />
                  <span className="text-xs font-medium">עבר</span>
                </div>
              ) : (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 ml-1" />
                  <span className="text-xs font-medium">פתוח</span>
                </div>
              )}
            </div>
          )}

          {/* Last saved indicator */}
          {activeTab === 'availability' && existingAvailability && (
            <div className="mt-2 text-xs text-gray-500">
              נשמר: {new Date(existingAvailability.submittedAt).toLocaleTimeString('he-IL')}
            </div>
          )}
        </div>
      </header>

      {/* Tab Content (scrollable) */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'availability' && (
          <PullToRefresh onRefresh={handleRefreshAvailability}>
            <AvailabilityTabMobile
              availability={availability}
              vacationDays={vacations}
              holidays={holidays}
              onAvailabilityChange={onAvailabilityChange}
              onCommentChange={onCommentChange}
              readonly={isDeadlinePassed}
              weekStart={currentWeekStart}
              validationErrors={validationErrors}
            />
          </PullToRefresh>
        )}

        {activeTab === 'schedule' && (
          <PullToRefresh onRefresh={handleRefreshSchedule}>
            <ScheduleTabMobile
              schedule={currentSchedule}
              employees={employees}
              weekStart={currentWeekStart}
              availabilities={[]}
              holidays={holidays}
            />
          </PullToRefresh>
        )}

        {activeTab === 'summary' && (
          <PullToRefresh onRefresh={handleRefreshAvailability}>
            <SummaryTabMobile
              availability={availability}
              weekStart={currentWeekStart}
            />
          </PullToRefresh>
        )}

        {activeTab === 'constraints' && (
          <ConstraintsTabMobile userName={user?.name || 'משתמש'} />
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <TabBar
        tabs={[
          { id: 'availability', label: 'הגשת זמינות', icon: <Clock className="w-5 h-5" /> },
          { id: 'schedule', label: 'סידור שלי', icon: <Eye className="w-5 h-5" /> },
          { id: 'summary', label: 'סיכום זמינות', icon: <BarChart3 className="w-5 h-5" /> },
          { id: 'constraints', label: 'אילוצים', icon: <ShieldAlert className="w-5 h-5" /> }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'availability' | 'schedule' | 'summary' | 'constraints')}
      />

      {/* Floating Action Button (Save) */}
      {activeTab === 'availability' && hasChanges && !isDeadlinePassed && (
        <FloatingActionButton
          icon={isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          onClick={handleSave}
          disabled={isSaving || validationErrors.length > 0}
          ariaLabel="שמירת זמינות"
        />
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
