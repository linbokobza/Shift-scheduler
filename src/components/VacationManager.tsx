import React, { useState } from 'react';
import { Plus, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showHistory, setShowHistory] = useState(false);

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

  const getTypeColor = (type: 'vacation' | 'sick') => {
    return type === 'vacation'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getTypeText = (type: 'vacation' | 'sick') => {
    return type === 'vacation' ? 'חופשה' : 'מחלה';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="bg-green-50 border-b border-green-200 p-4">
        <h3 className="text-lg font-semibold text-green-900 flex items-center">
          <Calendar className="w-5 h-5 ml-2" />
          ימי חופשה ומחלה
        </h3>
        <p className="text-sm text-green-700 mt-1">
          הגדר ימי חופשה ומחלה
        </p>
      </div>

      {!readonly && (
        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vacation-date" className="block text-sm font-medium text-gray-700 mb-2">
                  תאריך
                </label>
                <input
                  type="date"
                  id="vacation-date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

   <div>
  <label htmlFor="vacation-type" className="block text-sm font-medium text-gray-700 mb-2">
    סוג
  </label>
  <div className="relative">
    <select
      id="vacation-type"
      value={selectedType}
      onChange={(e) => setSelectedType(e.target.value as 'vacation' | 'sick')}
      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white appearance-none cursor-pointer text-gray-900 font-medium transition-all hover:border-gray-400 focus:outline-none"
    >
      <option value="vacation">🏖️ חופשה</option>
      <option value="sick">🤒 מחלה</option>
    </select>
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <svg 
        className="w-5 h-5 text-gray-400" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M19 9l-7 7-7-7" 
        />
      </svg>
    </div>
  </div>
    </div>

</div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all flex items-center justify-center"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוספה
            </button>
          </form>

          <div className="space-y-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <span className="font-medium text-gray-900">ימי חופשה ומחלה מוגדרים</span>
              {showHistory ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {showHistory && (
              <div className="space-y-2 mt-2">
                {vacationDays.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">אין ימי חופשה או מחלה</p>
                ) : (
                  vacationDays.map((vacation) => (
                    <div
                      key={vacation.id}
                      className={`flex items-center justify-between rounded-lg p-3 border-2 ${getTypeColor(vacation.type)}`}
                    >
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 ml-2" />
                        <div>
                          <div className="text-sm font-medium">
                            {formatDateStringHebrew(vacation.date)}
                          </div>
                          <div className="text-xs opacity-75">
                            {getTypeText(vacation.type)}
                          </div>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VacationManager;
