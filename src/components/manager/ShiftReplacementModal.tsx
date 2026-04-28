import React, { useState, useEffect } from 'react';
import { X, Check, User as UserIcon, Phone, Snowflake } from 'lucide-react';
import { User } from '../../types';

interface ShiftReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeId: string | null, extraEmployeeId?: string | null) => void;
  currentEmployeeId: string | null;
  currentExtraEmployeeId?: string | null;
  allEmployees: User[];
  availableEmployeeIds: string[];
  submittedEmployeeIds: string[];
  shiftInfo: {
    dayName: string;
    shiftName: string;
    shiftTime: string;
    day: string;
    shiftId: string;
  };
  employeeComments?: { [employeeId: string]: string };
  isFrozen?: boolean;
  onFreezeToggle?: (frozen: boolean) => void;
}

// Special ID for 119 emergency service
const EMERGENCY_119_ID = '119-emergency-service';

type AvailabilityStatus = 'available' | 'unavailable' | 'not-submitted';

const ShiftReplacementModal: React.FC<ShiftReplacementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentEmployeeId,
  currentExtraEmployeeId = null,
  allEmployees,
  availableEmployeeIds,
  submittedEmployeeIds,
  shiftInfo,
  employeeComments = {},
  isFrozen = false,
  onFreezeToggle
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(currentEmployeeId);
  const [selectedExtraEmployeeId, setSelectedExtraEmployeeId] = useState<string | null>(currentExtraEmployeeId);
  const [isFrozenLocal, setIsFrozenLocal] = useState<boolean>(isFrozen);

  // Reset selection and freeze state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🧊 Modal opened - isFrozen prop:', isFrozen, 'currentEmployeeId:', currentEmployeeId);
      setSelectedEmployeeId(currentEmployeeId);
      setSelectedExtraEmployeeId(currentExtraEmployeeId);
      setIsFrozenLocal(isFrozen);
    }
  }, [isOpen, currentEmployeeId, currentExtraEmployeeId, isFrozen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const modalContent = document.getElementById('shift-replacement-modal-content');
      if (modalContent && !modalContent.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getAvailabilityStatus = (employeeId: string): AvailabilityStatus => {
    if (availableEmployeeIds.includes(employeeId)) return 'available';
    if (submittedEmployeeIds.includes(employeeId)) return 'unavailable';
    return 'not-submitted';
  };

  const getAvailabilityIndicator = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return {
          color: 'bg-green-500',
          text: 'זמין',
          textColor: 'text-green-700'
        };
      case 'unavailable':
        return {
          color: 'bg-red-500',
          text: 'לא זמין',
          textColor: 'text-red-700'
        };
      case 'not-submitted':
        return {
          color: 'bg-gray-400',
          text: 'לא הגיש',
          textColor: 'text-gray-700'
        };
    }
  };

  // Sort employees: available first, then unavailable, then not-submitted
  const sortedEmployees = [...allEmployees].sort((a, b) => {
    const statusA = getAvailabilityStatus(a.id);
    const statusB = getAvailabilityStatus(b.id);

    const priority = { 'available': 0, 'unavailable': 1, 'not-submitted': 2 };
    return priority[statusA] - priority[statusB];
  });

  const handleSave = () => {
    onSave(selectedEmployeeId, selectedExtraEmployeeId);
    if (onFreezeToggle) {
      onFreezeToggle(isFrozenLocal);
    }
  };

  // עובדים זמינים להוספה כעובד נוסף (רק זמינים, לא העובד הראשי)
  const availableForExtra = allEmployees.filter(
    emp => availableEmployeeIds.includes(emp.id) && emp.id !== selectedEmployeeId
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        id="shift-replacement-modal-content"
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
      >
        {/* Header */}
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-blue-900">
                החלפת עובד - {shiftInfo.dayName}
              </h3>
              <p className="text-xs text-blue-700">
                {shiftInfo.shiftName} ({shiftInfo.shiftTime})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Freeze Checkbox Section - works for both assigned and empty shifts */}
        <div className="px-4 pt-2 pb-3 border-b border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
            <input
              type="checkbox"
              checked={isFrozenLocal}
              onChange={(e) => setIsFrozenLocal(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {currentEmployeeId ? 'להקפיא משמרת' : 'להקפיא כ"לא משובץ"'}
            </span>
            <Snowflake className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 mr-auto">
              {currentEmployeeId
                ? '(העובד ישאר במשמרת זו ולא ישובץ במשמרות אחרות השבוע)'
                : '(המשמרת תישאר ריקה גם אחרי אופטימיזציה)'}
            </span>
          </label>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {/* Employee Selection List - Compact Grid */}
          <div className="grid grid-cols-2 gap-2">
            {sortedEmployees.map((employee) => {
              const status = getAvailabilityStatus(employee.id);
              const indicator = getAvailabilityIndicator(status);
              const isSelected = selectedEmployeeId === employee.id;

              return (
                <button
                  key={employee.id}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className={`p-2 rounded-lg transition-all text-right ${
                    isSelected
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : 'border border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium text-sm text-gray-900 truncate">{employee.name}</div>
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${indicator.color} flex-shrink-0 mt-1`} />
                          {employeeComments[employee.id] && (
                            <span className="text-xs text-gray-600 italic break-words" dir="rtl" style={{wordBreak: 'break-word'}}>
                              💬 {employeeComments[employee.id]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}

            {/* 119 Emergency Option */}
            <button
              onClick={() => setSelectedEmployeeId(EMERGENCY_119_ID)}
              className={`p-2 rounded-lg transition-all text-right ${
                selectedEmployeeId === EMERGENCY_119_ID
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border border-red-300 bg-red-50 hover:bg-red-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="font-medium text-sm text-red-900">119</div>
                </div>
                {selectedEmployeeId === EMERGENCY_119_ID && <Check className="w-4 h-4 text-blue-600" />}
              </div>
            </button>

            {/* Unassigned Option */}
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className={`p-2 rounded-lg transition-all text-right ${
                selectedEmployeeId === null
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="font-medium text-sm text-gray-700">לא משובץ</div>
                </div>
                {selectedEmployeeId === null && <Check className="w-4 h-4 text-blue-600" />}
              </div>
            </button>
          </div>
        </div>

        {/* Extra Employee Section */}
        <div className="border-t px-4 py-3">
          <div className="text-xs font-semibold text-gray-600 mb-2">עובד נוסף למשמרת</div>
          {availableForExtra.length === 0 ? (
            <p className="text-xs text-gray-400">אין עובדים זמינים נוספים</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableForExtra.map(emp => {
                const isSelected = selectedExtraEmployeeId === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedExtraEmployeeId(isSelected ? null : emp.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${
                      isSelected
                        ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {emp.name[0]}
                    </span>
                    {emp.name}
                    {isSelected && <Check className="w-3 h-3 text-green-600" />}
                  </button>
                );
              })}
              {selectedExtraEmployeeId && (
                <button
                  onClick={() => setSelectedExtraEmployeeId(null)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-red-300 text-red-600 hover:bg-red-50 transition-all"
                >
                  הסר
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-2 flex justify-center gap-2">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-6 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftReplacementModal;
