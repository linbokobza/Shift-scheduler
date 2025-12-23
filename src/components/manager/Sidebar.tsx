import React from 'react';
import { Users, Calendar, PartyPopper, X } from 'lucide-react';
import { User, VacationDay, Holiday } from '../../types';
import EmployeeList from './EmployeeList';
import VacationManager from './VacationManager';
import HolidayManager from './HolidayManager';

type MenuOption = 'employees' | 'vacations' | 'holidays';

interface SidebarProps {
  activeMenu: MenuOption;
  onMenuChange: (menu: MenuOption) => void;
  employees: User[];
  vacationDays: VacationDay[];
  holidays: Holiday[];
  onToggleActive: (employeeId: string) => void;
  onAddEmployee: (name: string, email: string, password: string) => void;
  onRemoveEmployee: (employeeId: string) => void;
  onResetPassword: (employeeId: string) => void;
  onAddVacation: (employeeId: string, startDate: Date, endDate: Date, type: 'vacation' | 'sick') => void;
  onRemoveVacation: (vacationId: string) => void;
  onAddHoliday: (date: string, name: string, type: 'no-work' | 'morning-only') => void;
  onRemoveHoliday: (holidayId: string) => void;
  currentWeekStart: Date;
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onMenuChange,
  employees,
  vacationDays,
  holidays,
  onToggleActive,
  onAddEmployee,
  onRemoveEmployee,
  onResetPassword,
  onAddVacation,
  onRemoveVacation,
  onAddHoliday,
  onRemoveHoliday,
  currentWeekStart,
  isMobileMenuOpen = false,
  onMobileMenuClose
}) => {
  const menuItems = [
    { id: 'employees' as MenuOption, label: 'ניהול עובדים', icon: Users },
    { id: 'vacations' as MenuOption, label: 'ניהול חופשות ומחלות', icon: Calendar },
    { id: 'holidays' as MenuOption, label: 'ניהול חגים', icon: PartyPopper },
  ];

  const sidebarContent = (
    <div className="bg-white flex flex-col h-full overflow-hidden">
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900">ניהול מערכת</h2>
        <p className="text-xs lg:text-sm text-gray-600 mt-1">בחר קטגוריה לניהול</p>
      </div>

      <nav className="p-3 lg:p-4 space-y-1.5 lg:space-y-2 border-b border-gray-200">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onMenuChange(item.id);
                if (onMobileMenuClose) onMobileMenuClose();
              }}
              className={`w-full flex items-center px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-all duration-200 text-sm lg:text-base ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-200 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-2 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ml-2 lg:ml-3 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto p-3 lg:p-4">
        {activeMenu === 'employees' && (
          <EmployeeList
            employees={employees}
            onToggleActive={onToggleActive}
            onAddEmployee={onAddEmployee}
            onRemoveEmployee={onRemoveEmployee}
            onResetPassword={onResetPassword}
          />
        )}

        {activeMenu === 'vacations' && (
          <VacationManager
            employees={employees}
            vacationDays={vacationDays}
            onAddVacation={onAddVacation}
            onRemoveVacation={onRemoveVacation}
            weekStart={currentWeekStart}
          />
        )}

        {activeMenu === 'holidays' && (
          <HolidayManager
            holidays={holidays}
            onAddHoliday={onAddHoliday}
            onRemoveHoliday={onRemoveHoliday}
          />
        )}
      </div>

      <div className="p-3 lg:p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          מערכת ניהול משמרות
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && onMobileMenuClose && (
        <div
          className="mobile-menu-backdrop lg:hidden"
          onClick={onMobileMenuClose}
        />
      )}

      {/* Mobile Overlay Sidebar */}
      <div
        className={`
          fixed inset-y-0 right-0 w-full max-w-sm z-50 lg:hidden sidebar-overlay shadow-2xl
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Close Button */}
        <button
          onClick={onMobileMenuClose}
          className="absolute top-3 left-3 z-10 p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-sm transition-colors"
          title="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        {sidebarContent}
      </div>

      {/* Desktop Inline Sidebar */}
      <div className="hidden lg:block lg:w-96 border-l border-gray-200 shadow-sm">
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
