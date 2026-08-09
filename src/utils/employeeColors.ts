// Color palette for employees (with border)
export const EMPLOYEE_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-red-100 text-red-800 border-red-200',
];

// Same palette without the border classes
export const EMPLOYEE_COLORS_NO_BORDER = EMPLOYEE_COLORS.map(c =>
  c.split(' ').filter(cls => !cls.startsWith('border-')).join(' ')
);

/**
 * Colors are keyed off each employee's permanent `colorIndex` (assigned once,
 * server-side, at account creation and never changed). This keeps an
 * employee's color fixed forever, regardless of other employees being
 * added, removed, or toggled active/inactive.
 */
export const getEmployeeColorClasses = (colorIndex: number | undefined): string => {
  if (colorIndex === undefined || colorIndex === null) return 'bg-gray-100 text-gray-800 border-gray-200';
  return EMPLOYEE_COLORS[colorIndex % EMPLOYEE_COLORS.length];
};

export const getEmployeeColorClassesNoBorder = (colorIndex: number | undefined): string => {
  if (colorIndex === undefined || colorIndex === null) return 'bg-gray-100 text-gray-800';
  return EMPLOYEE_COLORS_NO_BORDER[colorIndex % EMPLOYEE_COLORS_NO_BORDER.length];
};
