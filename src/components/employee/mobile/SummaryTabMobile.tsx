import React from 'react';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Availability, AvailabilityStatus } from '../../../types';
import { SHIFTS, DAYS } from '../../../data/mockData';

interface SummaryTabMobileProps {
  availability: Availability['shifts'];
  weekStart: Date;
}

export const SummaryTabMobile: React.FC<SummaryTabMobileProps> = ({
  availability,
  weekStart
}) => {
  // Calculate statistics
  const calculateStats = () => {
    let totalAvailable = 0;
    let totalUnavailable = 0;
    let totalUnselected = 0;

    // Count all shifts (7 days × 3 shifts = 21 total)
    // But exclude Friday evening/night and Saturday (4 shifts)
    // So 21 - 4 = 17 possible shifts

    for (let day = 0; day < 7; day++) {
      for (const shift of SHIFTS) {
        // Skip Friday evening/night and Saturday
        const isWeekend = (day === 5 && (shift.id === 'evening' || shift.id === 'night')) || day === 6;
        if (isWeekend) continue;

        const status = availability[day.toString()]?.[shift.id]?.status;

        if (status === 'available') {
          totalAvailable++;
        } else if (status === 'unavailable') {
          totalUnavailable++;
        } else {
          totalUnselected++;
        }
      }
    }

    return {
      available: totalAvailable,
      unavailable: totalUnavailable,
      unselected: totalUnselected,
      total: 17 // Total possible shifts (excluding weekend restrictions)
    };
  };

  const stats = calculateStats();
  const completionPercentage = Math.round(
    ((stats.available + stats.unavailable) / stats.total) * 100
  );

  // Get daily breakdown
  const getDailyBreakdown = () => {
    return DAYS.map((dayName, index) => {
      let available = 0;
      let unavailable = 0;
      let unselected = 0;

      for (const shift of SHIFTS) {
        const isWeekend = (index === 5 && (shift.id === 'evening' || shift.id === 'night')) || index === 6;
        if (isWeekend) continue;

        const status = availability[index.toString()]?.[shift.id]?.status;

        if (status === 'available') available++;
        else if (status === 'unavailable') unavailable++;
        else unselected++;
      }

      return {
        day: dayName,
        available,
        unavailable,
        unselected,
        dayIndex: index
      };
    });
  };

  const dailyBreakdown = getDailyBreakdown();

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">סיכום זמינות</h2>
        <p className="text-sm text-gray-600">
          סטטיסטיקות והתקדמות הגשת הזמינות שלך
        </p>
      </div>

      {/* Completion Progress */}
      <Card padding="md" className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">התקדמות הגשה</span>
          <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {stats.available + stats.unavailable} מתוך {stats.total} משמרות מוגדרות
        </p>
      </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card padding="sm" className="text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          <div className="text-xs text-gray-600">זמין</div>
        </Card>

        <Card padding="sm" className="text-center">
          <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600">{stats.unavailable}</div>
          <div className="text-xs text-gray-600">לא זמין</div>
        </Card>

        <Card padding="sm" className="text-center">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-400">{stats.unselected}</div>
          <div className="text-xs text-gray-600">לא נבחר</div>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">פירוט לפי ימים</h3>
        <div className="space-y-2">
          {dailyBreakdown.map((day) => {
            const isWeekend = day.dayIndex === 6;
            const totalShifts = isWeekend ? 0 : (day.dayIndex === 5 ? 1 : 3);

            if (isWeekend) {
              return (
                <Card key={day.dayIndex} padding="sm" className="bg-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-500">{day.day}</span>
                    <span className="text-xs text-gray-500">סוף שבוע</span>
                  </div>
                </Card>
              );
            }

            return (
              <Card key={day.dayIndex} padding="sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{day.day}</span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-600">✓ {day.available}</span>
                    <span className="text-red-600">✗ {day.unavailable}</span>
                    {day.unselected > 0 && (
                      <span className="text-gray-400">? {day.unselected}</span>
                    )}
                  </div>
                </div>
                {/* Progress bar for this day */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-full rounded-full ${
                      day.available + day.unavailable === totalShifts
                        ? 'bg-green-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{
                      width: `${((day.available + day.unavailable) / totalShifts) * 100}%`
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
