import React from 'react';
import VacationManager from '../../VacationManager';
import { VacationDay } from '../../../types';

interface VacationsTabMobileProps {
  vacationDays: VacationDay[];
  onAddVacation: (employeeId: string, startDate: Date, endDate: Date, type: 'vacation' | 'sick') => void;
  onRemoveVacation: (vacationId: string) => void;
  currentWeekStart: Date;
}

export const VacationsTabMobile: React.FC<VacationsTabMobileProps> = ({
  vacationDays,
  onAddVacation,
  onRemoveVacation,
  currentWeekStart
}) => {
  return (
    <div className="p-4">
      <VacationManager
        vacationDays={vacationDays}
        onAddVacation={onAddVacation}
        onRemoveVacation={onRemoveVacation}
        readonly={false}
        weekStart={currentWeekStart}
      />
    </div>
  );
};
