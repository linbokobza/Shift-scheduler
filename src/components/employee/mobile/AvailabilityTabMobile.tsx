import React, { useState, useEffect } from 'react';
import { AlertCircle, LayoutGrid, Table2 } from 'lucide-react';
import AvailabilityGrid from '../../AvailabilityGrid';
import { Availability, AvailabilityStatus, Holiday, VacationDay } from '../../../types';

type ViewMode = 'cards' | 'table';

interface AvailabilityTabMobileProps {
  availability: Availability['shifts'];
  vacationDays: VacationDay[];
  holidays: Holiday[];
  onAvailabilityChange: (day: string, shiftId: string, status: AvailabilityStatus) => void;
  onCommentChange: (day: string, shiftId: string, comment: string) => void;
  readonly: boolean;
  weekStart: Date;
  validationErrors: string[];
}

const STORAGE_KEY = 'employee-availability-view-mode';

export const AvailabilityTabMobile: React.FC<AvailabilityTabMobileProps> = ({
  availability,
  vacationDays,
  holidays,
  onAvailabilityChange,
  onCommentChange,
  readonly,
  weekStart,
  validationErrors
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'cards' || saved === 'table') ? saved : 'cards';
  });
  const vacationDates = vacationDays.map(v => v.date);

  // Save view mode preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  return (
    <div className="p-4">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 ml-2" />
            <h4 className="text-red-900 font-medium">שגיאות בהגשה</h4>
          </div>
          <ul className="text-red-700 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('cards')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
            viewMode === 'cards'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm font-medium">כרטיסים</span>
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
            viewMode === 'table'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Table2 className="w-4 h-4" />
          <span className="text-sm font-medium">טבלה</span>
        </button>
      </div>

      {/* Availability Grid */}
      <AvailabilityGrid
        availability={availability}
        vacationDays={vacationDates}
        holidays={holidays}
        onAvailabilityChange={onAvailabilityChange}
        onCommentChange={onCommentChange}
        readonly={readonly}
        weekStart={weekStart}
      />

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mt-4">
        <h4 className="font-medium text-gray-900 mb-3">מקרא</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded ml-2"></div>
            <span className="text-sm text-gray-700">זמין</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded ml-2"></div>
            <span className="text-sm text-gray-700">לא זמין</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded ml-2"></div>
            <span className="text-sm text-gray-700">חופשה/מחלה</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-indigo-200 border border-indigo-300 rounded ml-2"></div>
            <span className="text-sm text-gray-700">חג</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded ml-2"></div>
            <span className="text-sm text-gray-700">סוף שבוע</span>
          </div>
        </div>
      </div>

      {/* Info message if readonly */}
      {readonly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
          <p className="text-yellow-800 text-sm">
            המועד להגשת זמינות לשבוע זה עבר. אינך יכול לערוך את הזמינות.
          </p>
        </div>
      )}
    </div>
  );
};
