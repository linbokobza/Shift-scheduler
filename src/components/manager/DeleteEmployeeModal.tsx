import React from 'react';
import { X, AlertTriangle, UserX, Calendar } from 'lucide-react';

interface FutureSchedule {
  scheduleId: string;
  weekStart: string;
  isPublished: boolean;
  assignmentCount: number;
}

interface DeleteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (removeFromSchedules: boolean) => void;
  employeeName: string;
  futureSchedules?: FutureSchedule[];
  isLoading?: boolean;
}

const DeleteEmployeeModal: React.FC<DeleteEmployeeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  employeeName,
  futureSchedules,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const hasScheduleConflicts = futureSchedules && futureSchedules.length > 0;
  const totalAssignments = futureSchedules?.reduce(
    (sum, schedule) => sum + schedule.assignmentCount,
    0
  ) || 0;

  const handleConfirmDelete = (removeFromSchedules: boolean) => {
    onConfirm(removeFromSchedules);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="border-b p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-red-900 flex items-center">
              <UserX className="w-5 h-5 ml-2" />
              מחיקת עובד
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-800 mb-4">
            האם אתה בטוח שברצונך למחוק את <strong>{employeeName}</strong>?
          </p>

          {hasScheduleConflicts && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 ml-2 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    העובד משובץ בסידורים עתידיים
                  </h4>
                  <div className="text-sm text-yellow-800 space-y-2">
                    <p>
                      העובד משובץ ב-{futureSchedules.length} סידורים עתידיים
                      ({totalAssignments} משמרות בסך הכל)
                    </p>
                    <div className="space-y-1 mt-2">
                      {futureSchedules.map((schedule) => (
                        <div key={schedule.scheduleId} className="flex items-center text-xs">
                          <Calendar className="w-3 h-3 ml-1" />
                          <span>שבוע {schedule.weekStart}</span>
                          <span className="mx-1">-</span>
                          <span>{schedule.assignmentCount} משמרות</span>
                          {schedule.isPublished && (
                            <span className="mr-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              פורסם
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">מה ימחק:</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>פרטי העובד (שם, אימייל, וכו')</li>
            </ul>
            <h4 className="font-medium text-gray-900 mb-2 mt-3">מה יישמר:</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>היסטוריית זמינויות</li>
              <li>היסטוריית חופשות</li>
              <li>רשומות ביקורת (Audit Logs)</li>
            </ul>
          </div>

          <p className="text-red-600 text-sm font-medium">
            אזהרה: פעולה זו אינה ניתנת לביטול!
          </p>
        </div>

        <div className="bg-gray-50 border-t p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isLoading}
          >
            ביטול
          </button>
          {hasScheduleConflicts ? (
            <>
              <button
                onClick={() => handleConfirmDelete(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'מוחק...' : 'מחק בלי להסיר משמרות'}
              </button>
              <button
                onClick={() => handleConfirmDelete(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'מוחק...' : 'מחק והסר משמרות'}
              </button>
            </>
          ) : (
            <button
              onClick={() => handleConfirmDelete(false)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'מוחק...' : 'מחק עובד'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteEmployeeModal;
