import React from 'react';
import { User, ToggleLeft, ToggleRight, Plus, Trash2, UserPlus, Key } from 'lucide-react';
import { User as UserType } from '../../types';
import PasswordManager from '../PasswordManager';

interface EmployeeListProps {
  employees: UserType[];
  onToggleActive: (employeeId: string) => void;
  onAddEmployee: (name: string, email: string) => void;
  onRemoveEmployee: (employeeId: string) => void;
  onResetPassword: (employeeId: string) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  onToggleActive,
  onAddEmployee,
  onRemoveEmployee,
  onResetPassword
}) => {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newEmployeeName, setNewEmployeeName] = React.useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = React.useState('');
  const [newEmployeePassword, setNewEmployeePassword] = React.useState('');
  const [resetPasswordEmployee, setResetPasswordEmployee] = React.useState<string | null>(null);

  const employeeUsers = employees.filter(emp => emp.role === 'employee');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmployeeName.trim() && newEmployeeEmail.trim() && newEmployeePassword.trim()) {
      onAddEmployee(newEmployeeName.trim(), newEmployeeEmail.trim(), newEmployeePassword.trim());
      setNewEmployeeName('');
      setNewEmployeeEmail('');
      setNewEmployeePassword('');
      setShowAddForm(false);
    }
  };

  const handleRemoveEmployee = (employeeId: string, employeeName: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך להסיר את ${employeeName}?`)) {
      onRemoveEmployee(employeeId);
    }
  };

  const handleResetPassword = (employeeId: string, employeeName: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך לאפס את הסיסמה של ${employeeName}?`)) {
      onResetPassword(employeeId);
      alert(`הסיסמה של ${employeeName} אופסה ל: password`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="bg-blue-50 border-b border-blue-200 p-3 lg:p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 lg:gap-0">
          <div>
            <h3 className="text-base lg:text-lg font-semibold text-blue-900 flex items-center">
              <User className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />
              ניהול עובדים
            </h3>
            <p className="text-xs lg:text-sm text-blue-700 mt-0.5 lg:mt-1">
              סמנו עובדים פעילים לשיבוץ במשמרות
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full lg:w-auto flex items-center justify-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs lg:text-sm"
          >
            <Plus className="w-4 h-4 ml-1" />
            הוסף עובד
          </button>
        </div>
      </div>

      <div className="p-3 lg:p-4">
        {showAddForm && (
          <form onSubmit={handleAddEmployee} className="bg-gray-50 rounded-lg p-4 mb-4 border">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <UserPlus className="w-4 h-4 ml-1" />
              הוספת עובד חדש
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="employee-name" className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא
                </label>
                <input
                  type="text"
                  id="employee-name"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="שם העובד"
                  required
                />
              </div>
              <div>
                <label htmlFor="employee-email" className="block text-sm font-medium text-gray-700 mb-1">
                  אימייל
                </label>
                <input
                  type="email"
                  id="employee-email"
                  value={newEmployeeEmail}
                  onChange={(e) => setNewEmployeeEmail(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="employee-password" className="block text-sm font-medium text-gray-700 mb-1">
                  סיסמה
                </label>
                <input
                  type="password"
                  id="employee-password"
                  value={newEmployeePassword}
                  onChange={(e) => setNewEmployeePassword(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="סיסמה לעובד"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">מינימום 6 תווים</p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewEmployeeName('');
                  setNewEmployeeEmail('');
                  setNewEmployeePassword('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors ml-2"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                הוסף עובד
              </button>
            </div>
          </form>
        )}

        <p className="text-xs lg:text-sm text-blue-700 mt-1">
          {employeeUsers.length} עובדים במערכת
        </p>
      </div>

      <div className="p-3 lg:p-4">
        <div className="space-y-2 lg:space-y-3">
          {employeeUsers.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs lg:text-sm flex-shrink-0">
                  {employee.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="mr-2 lg:mr-3 min-w-0">
                  <div className="font-medium text-gray-900 text-sm lg:text-base truncate">{employee.name}</div>
                  <div className="text-xs lg:text-sm text-gray-500 truncate">{employee.email}</div>
                </div>
              </div>

              <div className="flex items-center space-x-1 lg:space-x-2 flex-shrink-0">
              <button
                onClick={() => onToggleActive(employee.id)}
                className={`flex items-center text-xs lg:text-sm font-medium transition-colors ${
                  employee.isActive
                    ? 'text-green-600 hover:text-green-700'
                    : 'text-gray-400 hover:text-gray-500'
                }`}
              >
                {employee.isActive ? (
                  <>
                    <ToggleRight className="w-4 h-4 lg:w-5 lg:h-5 ml-1" />
                    <span className="hidden lg:inline">פעיל</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 lg:w-5 lg:h-5 ml-1" />
                    <span className="hidden lg:inline">לא פעיל</span>
                  </>
                )}
              </button>

                <button
                  onClick={() => handleResetPassword(employee.id, employee.name)}
                  className="text-blue-500 hover:text-blue-700 p-1 rounded transition-colors lg:opacity-0 lg:group-hover:opacity-100 ml-1 lg:ml-2"
                  title="איפוס סיסמה"
                >
                  <Key className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                </button>

                <button
                  onClick={() => handleRemoveEmployee(employee.id, employee.name)}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition-colors lg:opacity-0 lg:group-hover:opacity-100 ml-1 lg:ml-2"
                  title="הסר עובד"
                >
                  <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {employeeUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>אין עובדים במערכת</p>
              <p className="text-sm">לחץ על "הוסף עובד" כדי להתחיל</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;