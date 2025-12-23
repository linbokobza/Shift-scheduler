import React from 'react';
import HolidayManager from '../HolidayManager';
import { Holiday } from '../../../types';

interface HolidaysTabMobileProps {
  holidays: Holiday[];
  onAddHoliday: (date: string, name: string, type: 'no-work' | 'morning-only') => void;
  onRemoveHoliday: (holidayId: string) => void;
}

export const HolidaysTabMobile: React.FC<HolidaysTabMobileProps> = ({
  holidays,
  onAddHoliday,
  onRemoveHoliday
}) => {
  return (
    <div className="p-4">
      <HolidayManager
        holidays={holidays}
        onAddHoliday={onAddHoliday}
        onRemoveHoliday={onRemoveHoliday}
      />
    </div>
  );
};
