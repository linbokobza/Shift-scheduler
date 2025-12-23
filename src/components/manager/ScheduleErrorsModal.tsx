import React from 'react';
import { X, AlertTriangle, AlertCircle, User } from 'lucide-react';
import { ValidationError } from '../../utils/scheduleValidation';

interface ScheduleErrorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const ScheduleErrorsModal: React.FC<ScheduleErrorsModalProps> = ({
  isOpen,
  onClose,
  errors,
  warnings
}) => {
  if (!isOpen) return null;

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className={`border-b p-4 ${hasErrors ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-semibold flex items-center ${hasErrors ? 'text-red-900' : 'text-yellow-900'}`}>
                {hasErrors ? (
                  <AlertCircle className="w-5 h-5 ml-2" />
                ) : (
                  <AlertTriangle className="w-5 h-5 ml-2" />
                )}
                {hasErrors ? 'שגיאות ביצירת סידור' : 'אזהרות ביצירת סידור'}
              </h3>
              <p className={`text-sm mt-1 ${hasErrors ? 'text-red-700' : 'text-yellow-700'}`}>
                {hasErrors 
                  ? 'נמצאו שגיאות שמונעות יצירת סידור'
                  : 'הסידור נוצר בהצלחה עם אזהרות'
                }
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
          {/* Errors */}
          {hasErrors && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-red-900 mb-3 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 ml-2" />
                שגיאות ({errors.length})
              </h4>
              <div className="space-y-3">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 ml-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-red-800">
                        {error.message}
                      </div>
                      {error.employeeName && (
                        <div className="text-xs text-red-600 mt-1 flex items-center">
                          <User className="w-3 h-3 ml-1" />
                          {error.employeeName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div>
              <h4 className="text-lg font-medium text-yellow-900 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 ml-2" />
                אזהרות ({warnings.length})
              </h4>
              <div className="space-y-3">
                {warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 ml-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-yellow-800">
                        {warning.message}
                      </div>
                      {warning.employeeName && (
                        <div className="text-xs text-yellow-600 mt-1 flex items-center">
                          <User className="w-3 h-3 ml-1" />
                          {warning.employeeName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasErrors && !hasWarnings && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>אין שגיאות או אזהרות</p>
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

export default ScheduleErrorsModal;