import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { User } from '../types';

// צבעים של עובדים - תואמים ל-ScheduleView
const EMPLOYEE_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-red-100 text-red-800 border-red-200',
];

interface ShiftDropdownProps {
  availableEmployees: User[];
  allEmployees: User[]; // כל העובדים הפעילים
  currentEmployeeId: string | null;
  onSelect: (employeeId: string | null) => void;
  onClose: () => void;
  cellRef: React.RefObject<HTMLDivElement>;
  employeeComments?: { [employeeId: string]: string };
}

const ShiftDropdown: React.FC<ShiftDropdownProps> = ({
  availableEmployees,
  allEmployees,
  currentEmployeeId,
  onSelect,
  onClose,
  cellRef,
  employeeComments = {},
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // סגירה בלחיצה מחוץ לרשימה
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        cellRef.current &&
        !cellRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, cellRef]);

  // קבלת צבע עובד
  const getEmployeeColor = (employeeId: string): string => {
    const activeEmployees = allEmployees.filter(emp => emp.role === 'employee' && emp.isActive);
    const employeeIndex = activeEmployees.findIndex(emp => emp.id === employeeId);
    if (employeeIndex === -1) return 'bg-gray-100 text-gray-800 border-gray-200';
    return EMPLOYEE_COLORS[employeeIndex % EMPLOYEE_COLORS.length];
  };

  // טיפול בבחירת עובד
  const handleSelect = (employeeId: string | null) => {
    onSelect(employeeId);
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border-2 border-blue-400 z-50 max-h-64 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {availableEmployees.length === 0 ? (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">
          אין עובדים זמינים למשמרת זו
        </div>
      ) : (
        <div className="py-1">
          {availableEmployees.map((employee) => (
            <button
              key={employee.id}
              onClick={() => handleSelect(employee.id)}
              className={`w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-between transition-colors ${
                currentEmployeeId === employee.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex flex-col items-start flex-1">
                <div className="flex items-center">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getEmployeeColor(
                      employee.id
                    )}`}
                  >
                    {employee.name}
                  </div>
                </div>
                {employeeComments[employee.id] && (
                  <div className="text-xs text-gray-600 mt-1 italic px-3" dir="rtl">
                    💬 {employeeComments[employee.id]}
                  </div>
                )}
              </div>
              {currentEmployeeId === employee.id && (
                <Check className="w-4 h-4 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      )}

      <hr className="border-gray-200" />

      <button
        onClick={() => handleSelect(null)}
        className={`w-full text-right px-4 py-2 hover:bg-gray-50 flex items-center justify-between transition-colors ${
          currentEmployeeId === null ? 'bg-blue-50' : ''
        }`}
      >
        <span className="text-gray-500 text-sm">לא משובץ</span>
        {currentEmployeeId === null && <Check className="w-4 h-4 text-blue-600" />}
      </button>
    </div>
  );
};

export default ShiftDropdown;
