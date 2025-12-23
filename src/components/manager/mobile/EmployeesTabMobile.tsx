import React from 'react';
import EmployeeList from '../EmployeeList';
import { User } from '../../../types';

interface EmployeesTabMobileProps {
  employees: User[];
  onToggleActive: (employeeId: string) => void;
  onAddEmployee: (name: string, email: string, password: string) => void;
  onRemoveEmployee: (employeeId: string) => void;
  onResetPassword: (employeeId: string) => void;
}

export const EmployeesTabMobile: React.FC<EmployeesTabMobileProps> = ({
  employees,
  onToggleActive,
  onAddEmployee,
  onRemoveEmployee,
  onResetPassword
}) => {
  return (
    <div className="p-4">
      <EmployeeList
        employees={employees}
        onToggleActive={onToggleActive}
        onAddEmployee={onAddEmployee}
        onRemoveEmployee={onRemoveEmployee}
        onResetPassword={onResetPassword}
      />
    </div>
  );
};
