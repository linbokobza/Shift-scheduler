import React, { useState } from 'react';
import { Plus, Trash2, Calendar, User, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { VacationDay, User as UserType } from '../../types';
import { formatDateStringHebrew, parseLocalDate } from '../../utils/dateUtils';

interface VacationManagerProps {
  employees: UserType[];
  vacationDays: VacationDay[];
  onAddVacation: (employeeId: string, startDate: Date, endDate: Date, type: 'vacation' | 'sick') => void;
  onRemoveVacation: (vacationId: string) => void;
  weekStart: Date;
}

const VacationManager: React.FC<VacationManagerProps> = ({
  employees,
  vacationDays,
  onAddVacation,
  onRemoveVacation,
  weekStart
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState<'vacation' | 'sick'>('vacation');
  const [showHistory, setShowHistory] = useState(false);

  const activeEmployees = employees.filter(emp => emp.role === 'employee' && emp.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployee && startDate && endDate) {
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);

      if (start <= end) {
        onAddVacation(selectedEmployee, start, end, selectedType);
        setSelectedEmployee('');
        setStartDate('');
        setEndDate('');
      } else {
        alert('תאריך התחלה חייב להיות לפני או שווה לתאריך סיום');
      }
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || 'עובד לא נמצא';
  };

  // Get recent vacation days (last 30 days and next 60 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const sixtyDaysFromNow = new Date(today);
  sixtyDaysFromNow.setDate(today.getDate() + 60);

  const recentVacations = vacationDays
    .filter(vacation => {
      const vacationDate = parseLocalDate(vacation.date);
      return vacationDate >= thirtyDaysAgo && vacationDate <= sixtyDaysFromNow;
    })
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="bg-green-50 border-b border-green-200 p-3 lg:p-4">
        <h3 className="text-base lg:text-lg font-semibold text-green-900 flex items-center">
          <CalendarDays className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />
          ניהול חופשות ומחלות
        </h3>
        <p className="text-xs lg:text-sm text-green-700 mt-0.5 lg:mt-1">
          הוסף חופשות ומחלות לעובדים
        </p>
      </div>

      <div className="p-3 lg:p-4">
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-2">
              בחר עובד
            </label>
            <select
              id="employee-select"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="">-- בחר עובד --</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                תאריך התחלה
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                תאריך סיום
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="vacation-type" className="block text-sm font-medium text-gray-700 mb-2">
              סוג
            </label>
            <select
              id="vacation-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'vacation' | 'sick')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="vacation">חופשה</option>
              <option value="sick">מחלה</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all flex items-center justify-center"
          >
            <Plus className="w-4 h-4 ml-1" />
            הוסף חופשה/מחלה
          </button>
        </form>

        <div className="space-y-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <span className="font-medium text-gray-900">חופשות ומחלות אחרונות</span>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {showHistory && (
            <div className="space-y-2 mt-2">
              {recentVacations.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">אין חופשות או מחלות</p>
              ) : (
                recentVacations.map((vacation) => (
                  <div
                    key={vacation.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                      vacation.type === 'vacation'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <User className="w-4 h-4 ml-2" />
                      <div>
                        <div className="text-sm font-medium">
                          {getEmployeeName(vacation.employeeId)} - {formatDateStringHebrew(vacation.date)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                          vacation.type === 'vacation'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {vacation.type === 'vacation' ? 'חופשה' : 'מחלה'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveVacation(vacation.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VacationManager;