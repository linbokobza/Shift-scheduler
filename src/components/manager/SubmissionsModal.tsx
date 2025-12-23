import React from 'react';
import { X, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { User as UserType, Availability, Holiday } from '../../types';
import { formatDate, formatDateHebrew } from '../../utils/dateUtils';

interface SubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: UserType[];
  availabilities: Availability[];
  holidays: Holiday[];
  weekStart: Date;
}

const SubmissionsModal: React.FC<SubmissionsModalProps> = ({
  isOpen,
  onClose,
  employees,
  availabilities,
  holidays,
  weekStart
}) => {
  if (!isOpen) return null;

  const weekStartString = formatDate(weekStart);
  const activeEmployees = employees.filter(emp => emp.role === 'employee' && emp.isActive);
  
  const getSubmissionStatus = (employeeId: string) => {
    return availabilities.find(a => a.employeeId === employeeId && a.weekStart === weekStartString);
  };

  const submittedEmployees = activeEmployees.filter(emp => getSubmissionStatus(emp.id));
  const notSubmittedEmployees = activeEmployees.filter(emp => !getSubmissionStatus(emp.id));

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                <Clock className="w-5 h-5 ml-2" />
                הגשות זמינות
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                שבוע {formatDateHebrew(weekStart)} - {formatDateHebrew(weekEnd)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-900">{submittedEmployees.length}</div>
              <div className="text-sm text-green-700">הגישו</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-900">{notSubmittedEmployees.length}</div>
              <div className="text-sm text-red-700">לא הגישו</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-900">{activeEmployees.length}</div>
              <div className="text-sm text-blue-700">סה"כ עובדים</div>
            </div>
          </div>

          {/* Submitted employees */}
          {submittedEmployees.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                עובדים שהגישו ({submittedEmployees.length})
              </h4>
              <div className="space-y-2">
                {submittedEmployees.map((employee) => {
                  const submission = getSubmissionStatus(employee.id);
                  return (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="mr-3">
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 ml-1" />
                        <span className="text-sm">הגיש</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Not submitted employees */}
          {notSubmittedEmployees.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <XCircle className="w-5 h-5 text-red-600 ml-2" />
                עובדים שלא הגישו ({notSubmittedEmployees.length})
              </h4>
              <div className="space-y-2">
                {notSubmittedEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="mr-3">
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-red-600">
                      <XCircle className="w-4 h-4 ml-1" />
                      <span className="text-sm">לא הגיש</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeEmployees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>אין עובדים פעילים במערכת</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionsModal;