import React from 'react';
import AvailabilityViewer from '../AvailabilityViewer';
import { Availability, User, VacationDay, Holiday } from '../../../types';

interface AvailabilityTabMobileProps {
  employees: User[];
  availabilities: Availability[];
  vacationDays: VacationDay[];
  holidays: Holiday[];
  weekStart: Date;
}

export const AvailabilityTabMobile: React.FC<AvailabilityTabMobileProps> = ({
  employees,
  availabilities,
  vacationDays,
  holidays,
  weekStart
}) => {
  return (
    <div className="p-4">
      <AvailabilityViewer
        employees={employees}
        availabilities={availabilities}
        vacationDays={vacationDays}
        holidays={holidays}
        weekStart={weekStart}
        onAvailabilityChange={() => {}}
        onCommentChange={() => {}}
      />
    </div>
  );
};
