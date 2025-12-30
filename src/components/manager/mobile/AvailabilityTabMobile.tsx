import React from 'react';
import AvailabilityViewer from '../AvailabilityViewer';
import { Availability, User, VacationDay, Holiday, AvailabilityStatus } from '../../../types';

interface AvailabilityTabMobileProps {
  employees: User[];
  availabilities: Availability[];
  vacationDays: VacationDay[];
  holidays: Holiday[];
  weekStart: Date;
  onAvailabilityChange: (employeeId: string, day: string, shiftId: string, status: AvailabilityStatus) => void;
  onCommentChange: (employeeId: string, day: string, shiftId: string, comment: string) => void;
}

export const AvailabilityTabMobile: React.FC<AvailabilityTabMobileProps> = ({
  employees,
  availabilities,
  vacationDays,
  holidays,
  weekStart,
  onAvailabilityChange,
  onCommentChange
}) => {
  return (
    <div className="p-4">
      <AvailabilityViewer
        employees={employees}
        availabilities={availabilities}
        vacationDays={vacationDays}
        holidays={holidays}
        weekStart={weekStart}
        onAvailabilityChange={onAvailabilityChange}
        onCommentChange={onCommentChange}
      />
    </div>
  );
};
