import React, { useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { VacationDay } from '../types';
import { formatDate, formatDateStringHebrew, parseLocalDate } from '../utils/dateUtils';

interface VacationManagerProps {
  vacationDays: VacationDay[];
  onAddVacation: (date: string, type: 'vacation' | 'sick') => void;
  onRemoveVacation: (id: string) => void;
  readonly?: boolean;
  weekStart: Date;
}

const VacationManager: React.FC<VacationManagerProps> = ({
  vacationDays,
  onAddVacation,
  onRemoveVacation,
  readonly = false,
  weekStart
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedType, setSelectedType] = useState<'vacation' | 'sick'>('vacation');

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekVacations = vacationDays.filter(vacation => {
    const vacationDate = parseLocalDate(vacation.date);
    return vacationDate >= weekStart && vacationDate <= weekEnd;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDateObj = new Date(selectedDate);
    const dayOfWeek = selectedDateObj.getDay();
    
    // Don't allow vacation on weekends (Friday=5, Saturday=6)
    if (selectedDate && dayOfWeek < 5) {
      onAddVacation(selectedDate, selectedType);
      setSelectedDate('');
    } else if (dayOfWeek >= 5) {
      alert('לא ניתן לבחור ימי חופשה בסוף השבוע');
    }
  };

  const getMinDate = () => {
    return formatDate(weekStart);
  };

  const getMaxDate = () => {
    return formatDate(weekEnd);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 lg:p-6">
      <div className="flex items-center mb-4">
        <Calendar className="w-5 h-5 text-blue-600 ml-2" />
        <h3 className="text-lg font-semibold text-gray-900">ימי חופשה ומחלה</h3>
      </div>

      {!readonly && (
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <div>
              <label htmlFor="vacation-date" className="block text-sm font-medium text-gray-700 mb-2">
                תאריך
              </label>
              <input
                type="date"
                id="vacation-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="vacation-type" className="block text-sm font-medium text-gray-700 mb-2">
                סוג
              </label>
              <select
                id="vacation-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'vacation' | 'sick')}
                className="w-full px-3 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="vacation">חופשה</option>
                <option value="sick">מחלה</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full sm:col-span-2 lg:col-span-1 bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4 ml-1" />
                הוספה
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {weekVacations.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">אין ימי חופשה או מחלה השבוע</p>
        ) : (
          weekVacations.map((vacation) => (
            <div
              key={vacation.id}
              className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
            >
              <div className="flex items-center">
                <div className="text-sm font-medium text-blue-900">
                  {formatDateStringHebrew(vacation.date)}
                </div>
                <div className="mr-3 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                  {vacation.type === 'vacation' ? 'חופשה' : 'מחלה'}
                </div>
              </div>
              
              {!readonly && (
                <button
                  onClick={() => onRemoveVacation(vacation.id)}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VacationManager;