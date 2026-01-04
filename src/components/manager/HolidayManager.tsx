import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Holiday } from '../../types';
import { formatDateStringHebrew } from '../../utils/dateUtils';

interface HolidayManagerProps {
  holidays: Holiday[];
  onAddHoliday: (date: string, name: string, type: 'no-work' | 'morning-only') => void;
  onRemoveHoliday: (id: string) => void;
}

const HolidayManager: React.FC<HolidayManagerProps> = ({
  holidays,
  onAddHoliday,
  onRemoveHoliday
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayType, setHolidayType] = useState<'no-work' | 'morning-only'>('no-work');
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDate && holidayName.trim()) {
      onAddHoliday(selectedDate, holidayName.trim(), holidayType);
      setSelectedDate('');
      setHolidayName('');
      setHolidayType('no-work');
    }
  };

  const getTypeText = (type: 'no-work' | 'morning-only') => {
    return type === 'no-work' ? 'אין עבודה כלל' : 'עבודה רק בבוקר';
  };

  const getTypeColor = (type: 'no-work' | 'morning-only') => {
    return type === 'no-work' 
      ? 'bg-red-100 text-red-800 border-red-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="bg-purple-50 border-b border-purple-200 p-4">
        <h3 className="text-lg font-semibold text-purple-900 flex items-center">
          <Star className="w-5 h-5 ml-2" />
          ניהול חגים
        </h3>
        <p className="text-sm text-purple-700 mt-1">
          הגדר חגים וסוגי עבודה בחגים
        </p>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="holiday-date" className="block text-sm font-medium text-gray-700 mb-2">
                תאריך החג
              </label>
              <input
                type="date"
                id="holiday-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="holiday-name" className="block text-sm font-medium text-gray-700 mb-2">
                שם החג
              </label>
              <input
                type="text"
                id="holiday-name"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="למשל: ראש השנה"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="holiday-type" className="block text-sm font-medium text-gray-700 mb-2">
              סוג החג
            </label>
            <select
              id="holiday-type"
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value as 'no-work' | 'morning-only')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left 0.75rem center',
                backgroundSize: '1rem',
                paddingLeft: '2.5rem'
              }}
            >
              <option value="no-work">חג - אין עבודה כלל</option>
              <option value="morning-only">חג - עבודה רק במשמרת בוקר</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all flex items-center justify-center"
          >
            <Plus className="w-4 h-4 ml-1" />
            הוסף חג
          </button>
        </form>

        <div className="space-y-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <span className="font-medium text-gray-900">חגים מוגדרים</span>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {showHistory && (
            <div className="space-y-2 mt-2">
              {holidays.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">אין חגים מוגדרים</p>
              ) : (
                holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className={`flex items-center justify-between rounded-lg p-3 border-2 ${getTypeColor(holiday.type)}`}
                  >
                    <div className="flex items-center">
                      <Star className="w-4 h-4 ml-2" />
                      <div>
                        <div className="text-sm font-medium">
                          {holiday.name} - {formatDateStringHebrew(holiday.date)}
                        </div>
                        <div className="text-xs opacity-75">
                          {getTypeText(holiday.type)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveHoliday(holiday.id)}
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

export default HolidayManager;