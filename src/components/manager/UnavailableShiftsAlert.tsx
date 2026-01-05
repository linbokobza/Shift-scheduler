import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ShiftAvailabilityAnalysis } from '../../utils/availabilityUtils';

interface UnavailableShiftsAlertProps {
  analysis: ShiftAvailabilityAnalysis;
  weekStart: Date;
}

const UnavailableShiftsAlert: React.FC<UnavailableShiftsAlertProps> = ({ analysis }) => {
  // אם אין בעיות, לא להציג כלום
  if (!analysis.hasIssues) {
    return null;
  }

  const getReasonText = (reason: string): string => {
    return 'כל העובדים לא זמינים (סימנו כלא זמין או בחופשה/מחלה)';
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4" role="alert" aria-live="polite">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 ml-3 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-red-900 font-semibold mb-2">
            אזהרה: משמרות ללא עובדים זמינים
          </h3>
          <p className="text-red-700 text-sm mb-3">
            המשמרות הבאות אין להן עובדים זמינים:
          </p>
          <ul className="space-y-2">
            {analysis.unavailableShifts.map((shift, index) => (
              <li key={index} className="text-sm text-red-800 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full ml-2 flex-shrink-0" />
                <span className="font-medium">{shift.dayName}, {shift.shiftName}</span>
                <span className="mr-2 text-red-600">- {getReasonText(shift.reason)}</span>
                <span className="text-red-500 text-xs mr-auto">
                  ({shift.unavailableCount}/{shift.totalActive})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UnavailableShiftsAlert;
