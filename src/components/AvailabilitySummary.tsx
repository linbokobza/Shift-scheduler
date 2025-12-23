import React from 'react';
import { User, Availability, Schedule } from '../types';
import { Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { SHIFTS, DAYS } from '../data/mockData';

interface AvailabilitySummaryProps {
  schedule: Schedule;
  employees: User[];
  availabilities: Availability[];
}

const AvailabilitySummary: React.FC<AvailabilitySummaryProps> = ({
  schedule,
  employees,
  availabilities
}) => {
  // חישוב סטטיסטיקות לכל עובד
  const getEmployeeStats = (employeeId: string) => {
    // מחפש את הזמינות של העובד לשבוע הנוכחי
    const availability = availabilities.find(a => a.employeeId === employeeId && a.weekStart === schedule.weekStart);

    // ספירת משמרות שהוגשו כזמינות
    let submittedShifts = 0;
    let availableShifts = 0;

    if (availability) {
      Object.keys(availability.shifts).forEach(day => {
        const dayNum = parseInt(day);
        Object.keys(availability.shifts[day]).forEach(shiftId => {
          // Skip Friday evening/night and all of Saturday
          const isFridayEveningOrNight = dayNum === 5 && (shiftId === 'evening' || shiftId === 'night');
          const isSaturday = dayNum === 6;

          if (!isFridayEveningOrNight && !isSaturday) {
            submittedShifts++;
            if (availability.shifts[day][shiftId].status === 'available') {
              availableShifts++;
            }
          }
        });
      });
    }

    // ספירת משמרות שהוצבו בפועל
    let assignedShifts = 0;
    let morningShifts = 0;
    let eveningShifts = 0;
    let nightShifts = 0;

    Object.keys(schedule.assignments).forEach(day => {
      Object.keys(schedule.assignments[day]).forEach(shiftId => {
        if (schedule.assignments[day][shiftId] === employeeId) {
          assignedShifts++;
          if (shiftId === 'morning') morningShifts++;
          else if (shiftId === 'evening') eveningShifts++;
          else if (shiftId === 'night') nightShifts++;
        }
      });
    });

    return {
      submittedShifts,
      availableShifts,
      assignedShifts,
      morningShifts,
      eveningShifts,
      nightShifts
    };
  };

  const activeEmployees = employees.filter(emp => emp.role === 'employee' && emp.isActive);

  return (
    <div className="bg-white rounded-lg shadow-sm border mt-6">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 p-4">
        <h3 className="text-lg font-semibold text-indigo-900 flex items-center">
          <Calendar className="w-5 h-5 ml-2" />
          סיכום זמינויות ומשמרות
        </h3>
        <p className="text-sm text-indigo-700 mt-1">
          השוואה בין הזמינויות שהוגשו למשמרות שהוצבו
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 lg:mx-0 scrollbar-thin">
        <div className="min-w-[800px]">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-right text-xs lg:text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                עובד
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                הגיש זמינות
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                משמרות זמינות
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                משמרות שהוצבו
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                בוקר
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                ערב
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                לילה
              </th>
              <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-medium text-gray-700 border-b whitespace-nowrap">
                סטטוס
              </th>
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map((emp, index) => {
              const stats = getEmployeeStats(emp.id);
              const hasSubmitted = stats.submittedShifts > 0;
              const hasEnoughShifts = stats.assignedShifts >= 3;
              const hasMorning = stats.morningShifts > 0;

              return (
                <tr key={emp.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 border-b">
                    <div className="font-medium text-gray-900">{emp.name}</div>
                    <div className="text-xs text-gray-500">{emp.email}</div>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 border-b text-center">
                    {hasSubmitted ? (
                      <div className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
                        <CheckCircle className="w-3 h-3" />
                        כן
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs">
                        <AlertCircle className="w-3 h-3" />
                        לא
                      </div>
                    )}
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 border-b text-center">
                    <span className={`font-semibold ${stats.availableShifts < 3 ? 'text-red-600' : 'text-gray-900'}`}>
                      {stats.availableShifts}
                    </span>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 border-b text-center">
                    <span className={`font-bold text-lg ${!hasEnoughShifts ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.assignedShifts}
                    </span>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 border-b text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      stats.morningShifts > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {stats.morningShifts}
                    </div>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 border-b text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      stats.eveningShifts > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {stats.eveningShifts}
                    </div>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 border-b text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      stats.nightShifts > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {stats.nightShifts}
                    </div>
                  </td>
                  <td className="px-2 lg:px-4 py-2 lg:py-3 border-b text-center">
                    {!hasSubmitted ? (
                      <span className="text-xs text-red-600 font-medium">לא הגיש</span>
                    ) : stats.availableShifts < 3 ? (
                      <span className="text-xs text-orange-600 font-medium">הגיש מעט</span>
                    ) : !hasEnoughShifts ? (
                      <span className="text-xs text-red-600 font-medium">פחות מ-3</span>
                    ) : !hasMorning ? (
                      <span className="text-xs text-orange-600 font-medium">ללא בוקר</span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        תקין
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* סיכום כללי */}
      <div className="bg-gray-50 border-t p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs text-gray-600 mb-1">סך הכל עובדים</div>
            <div className="text-xl lg:text-2xl font-bold text-gray-900">{activeEmployees.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs text-gray-600 mb-1">הגישו זמינות</div>
            <div className="text-xl lg:text-2xl font-bold text-green-600">
              {activeEmployees.filter(emp => getEmployeeStats(emp.id).submittedShifts > 0).length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs text-gray-600 mb-1">עם 3+ משמרות</div>
            <div className="text-xl lg:text-2xl font-bold text-blue-600">
              {activeEmployees.filter(emp => getEmployeeStats(emp.id).assignedShifts >= 3).length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs text-gray-600 mb-1">עם משמרת בוקר</div>
            <div className="text-xl lg:text-2xl font-bold text-indigo-600">
              {activeEmployees.filter(emp => getEmployeeStats(emp.id).morningShifts > 0).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySummary;
