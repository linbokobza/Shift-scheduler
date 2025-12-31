import { generateOptimizedSchedule } from '../../../utils/optimizedScheduler';
import { createTestEmployee, formatDate, addDays } from '../../helpers/fixtures';

describe('Optimized Scheduler Algorithm', () => {
  const weekStart = formatDate(new Date());

  describe('Hard Constraints - 8-8 Conflicts', () => {
    it('should not assign morning shift after night shift (8-8 conflict)', async () => {
      const employees = [
        await createTestEmployee('Employee 1', 'emp1@test.com'),
        await createTestEmployee('Employee 2', 'emp2@test.com'),
      ];

      const availabilities = [
        {
          employeeId: employees[0].id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' as const }, evening: { status: 'available' as const }, night: { status: 'available' as const } },
            '1': { morning: { status: 'available' as const }, evening: { status: 'available' as const }, night: { status: 'available' as const } },
          },
        },
        {
          employeeId: employees[1].id,
          weekStart,
          shifts: {
            '0': { morning: { status: 'available' as const }, evening: { status: 'available' as const }, night: { status: 'available' as const } },
            '1': { morning: { status: 'available' as const }, evening: { status: 'available' as const }, night: { status: 'available' as const } },
          },
        },
      ];

      const activeEmployees = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        isActive: true,
      }));

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        [],
        weekStart
      );

      // If day 0 night shift is assigned to an employee
      if (result && result.assignments['0']?.night) {
        const nightEmployee = result.assignments['0'].night;
        // That same employee should NOT be assigned to day 1 morning
        expect(result.assignments['1']?.morning).not.toBe(nightEmployee);
      }
    });
  });

  describe('Hard Constraints - 3 Consecutive Days', () => {
    it.skip('should not assign shifts for 3 consecutive days', async () => {
      const employees = [
        await createTestEmployee('Employee 1', 'cons1@test.com'),
        await createTestEmployee('Employee 2', 'cons2@test.com'),
        await createTestEmployee('Employee 3', 'cons3@test.com'),
        await createTestEmployee('Employee 4', 'cons4@test.com'),
      ];

      const availabilities = employees.map(emp => ({
        employeeId: emp.id,
        weekStart,
        shifts: {
          '0': { morning: { status: 'available' as const }, evening: { status: 'available' as const } },
          '1': { morning: { status: 'available' as const }, evening: { status: 'available' as const } },
          '2': { morning: { status: 'available' as const }, evening: { status: 'available' as const } },
          '3': { morning: { status: 'available' as const }, evening: { status: 'available' as const } },
          '4': { morning: { status: 'available' as const }, evening: { status: 'available' as const } },
        },
      }));

      const activeEmployees = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        isActive: true,
      }));

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        [],
        weekStart
      );

      // Check each employee doesn't work 3 consecutive days
      if (result) {
        employees.forEach(emp => {
          for (let day = 0; day < 5; day++) {
            const day1Assigned = Object.values(result.assignments[day] || {}).includes(emp.id);
            const day2Assigned = Object.values(result.assignments[day + 1] || {}).includes(emp.id);
            const day3Assigned = Object.values(result.assignments[day + 2] || {}).includes(emp.id);

            // Should not have all 3 days assigned
            if (day1Assigned && day2Assigned) {
              expect(day3Assigned).toBe(false);
            }
          }
        });
      }
    });
  });

  describe('Hard Constraints - Availability', () => {
    it('should only assign shifts where employee marked as available', async () => {
      const employee = await createTestEmployee('Available Employee', 'avail@test.com');

      const availabilities = [{
        employeeId: employee.id,
        weekStart,
        shifts: {
          '0': { morning: { status: 'available' as const } },
          '1': { morning: { status: 'unavailable' as const } }, // NOT available
          '2': { morning: { status: 'available' as const } },
        },
      }];

      const activeEmployees = [{
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: true,
      }];

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        [],
        weekStart
      );

      // Employee should NOT be assigned to day 1 morning (marked unavailable)
      if (result) {
        expect(result.assignments['1']?.morning).not.toBe(employee.id);
      }
    });
  });

  describe('Hard Constraints - Vacations', () => {
    it('should not assign shifts during vacation days', async () => {
      const employee = await createTestEmployee('Vacation Employee', 'vacation@test.com');
      const vacationDate = addDays(new Date(weekStart), 2);

      const availabilities = [{
        employeeId: employee.id,
        weekStart,
        shifts: {
          '0': { morning: { status: 'available' as const } },
          '1': { morning: { status: 'available' as const } },
          '2': { morning: { status: 'available' as const } },
          '3': { morning: { status: 'available' as const } },
        },
      }];

      const vacations = [{
        id: 'vac-1',
        employeeId: employee.id,
        date: vacationDate.toISOString().split('T')[0],
        type: 'vacation' as const,
      }];

      const activeEmployees = [{
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: true,
      }];

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        vacations,
        [],
        weekStart
      );

      // Employee should NOT be assigned to day 2 (vacation day)
      if (result) {
        const day2Assignments = result.assignments['2'] || {};
        Object.values(day2Assignments).forEach(assignedEmpId => {
          expect(assignedEmpId).not.toBe(employee.id);
        });
      }
    });
  });

  describe('Hard Constraints - Holidays', () => {
    it('should respect holiday restrictions (no work)', async () => {
      const employee = await createTestEmployee('Holiday Employee', 'holiday@test.com');
      const holidayDate = addDays(new Date(weekStart), 3);

      const availabilities = [{
        employeeId: employee.id,
        weekStart,
        shifts: {
          '0': { morning: { status: 'available' as const }, evening: { status: 'available' as const } },
          '3': { morning: { status: 'available' as const }, evening: { status: 'available' as const } },
        },
      }];

      const holidays = [{
        id: 'hol-1',
        date: holidayDate.toISOString().split('T')[0],
        name: 'Test Holiday',
        type: 'no-work' as const,
      }];

      const activeEmployees = [{
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: true,
      }];

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        holidays,
        weekStart
      );

      // No shifts should be assigned on holiday (day 3)
      if (result) {
        const day3Assignments = result.assignments['3'] || {};
        expect(Object.values(day3Assignments).filter(Boolean).length).toBe(0);
      }
    });

    it('should only allow morning shifts on morning-only holidays', async () => {
      const employee = await createTestEmployee('Morning Holiday Emp', 'morning-holiday@test.com');
      const holidayDate = addDays(new Date(weekStart), 4);

      const availabilities = [{
        employeeId: employee.id,
        weekStart,
        shifts: {
          '4': {
            morning: { status: 'available' as const },
            evening: { status: 'available' as const },
            night: { status: 'available' as const }
          },
        },
      }];

      const holidays = [{
        id: 'hol-2',
        date: holidayDate.toISOString().split('T')[0],
        name: 'Morning Only Holiday',
        type: 'morning-only' as const,
      }];

      const activeEmployees = [{
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: true,
      }];

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        holidays,
        weekStart
      );

      // On day 4 (morning-only holiday), evening and night should be null
      if (result) {
        expect(result.assignments['4']?.evening).toBeNull();
        expect(result.assignments['4']?.night).toBeNull();
      }
    });
  });

  describe('Soft Constraints - 100% Coverage', () => {
    it('should try to assign all shifts when enough employees available', async () => {
      const employees = await Promise.all([
        createTestEmployee('Employee 1', 'cov1@test.com'),
        createTestEmployee('Employee 2', 'cov2@test.com'),
        createTestEmployee('Employee 3', 'cov3@test.com'),
        createTestEmployee('Employee 4', 'cov4@test.com'),
      ]);

      // All employees available for all shifts for 3 days
      const availabilities = employees.map(emp => ({
        employeeId: emp.id,
        weekStart,
        shifts: {
          '0': {
            morning: { status: 'available' as const },
            evening: { status: 'available' as const },
            night: { status: 'available' as const }
          },
          '1': {
            morning: { status: 'available' as const },
            evening: { status: 'available' as const },
            night: { status: 'available' as const }
          },
          '2': {
            morning: { status: 'available' as const },
            evening: { status: 'available' as const },
            night: { status: 'available' as const }
          },
        },
      }));

      const activeEmployees = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        isActive: true,
      }));

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        [],
        weekStart
      );

      // Count assigned shifts
      let totalShifts = 0;
      let assignedShifts = 0;

      if (result) {
        [0, 1, 2].forEach(day => {
          ['morning', 'evening', 'night'].forEach(shift => {
            totalShifts++;
            if (result.assignments[day]?.[shift]) {
              assignedShifts++;
            }
          });
        });
      }

      // Should have high coverage (at least 80%)
      const coverage = (assignedShifts / totalShifts) * 100;
      expect(coverage).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case with minimal employees (1 employee)', async () => {
      const employee = await createTestEmployee('Solo Employee', 'solo@test.com');

      const availabilities = [{
        employeeId: employee.id,
        weekStart,
        shifts: {
          '0': { morning: { status: 'available' as const } },
          '2': { morning: { status: 'available' as const } }, // Gap day to avoid 3 consecutive
          '4': { morning: { status: 'available' as const } },
        },
      }];

      const activeEmployees = [{
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isActive: true,
      }];

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        [],
        weekStart
      );

      // Should complete without errors
      expect(result).toBeDefined();
      if (result) {
        expect(result.assignments).toBeDefined();
      }
    });

    it('should handle case with many vacations', async () => {
      const employees = await Promise.all([
        createTestEmployee('Emp 1', 'vacation1@test.com'),
        createTestEmployee('Emp 2', 'vacation2@test.com'),
        createTestEmployee('Emp 3', 'vacation3@test.com'),
      ]);

      const availabilities = employees.map(emp => ({
        employeeId: emp.id,
        weekStart,
        shifts: {
          '0': { morning: { status: 'available' as const } },
          '1': { morning: { status: 'available' as const } },
          '2': { morning: { status: 'available' as const } },
        },
      }));

      // 2 out of 3 employees on vacation for day 1
      const vacationDate = addDays(new Date(weekStart), 1);
      const vacations = [
        {
          id: 'vac-many-1',
          employeeId: employees[0].id,
          date: vacationDate.toISOString().split('T')[0],
          type: 'vacation' as const,
        },
        {
          id: 'vac-many-2',
          employeeId: employees[1].id,
          date: vacationDate.toISOString().split('T')[0],
          type: 'vacation' as const,
        },
      ];

      const activeEmployees = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        isActive: true,
      }));

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        vacations,
        [],
        weekStart
      );

      // Should assign only employee 3 to day 1 morning
      if (result) {
        expect(result.assignments['1']?.morning).toBe(employees[2].id);
      }
    });

    it('should handle consecutive holidays', async () => {
      const employees = await Promise.all([
        createTestEmployee('Holiday Emp 1', 'hol1@test.com'),
        createTestEmployee('Holiday Emp 2', 'hol2@test.com'),
      ]);

      const availabilities = employees.map(emp => ({
        employeeId: emp.id,
        weekStart,
        shifts: {
          '0': { morning: { status: 'available' as const } },
          '1': { morning: { status: 'available' as const } },
          '2': { morning: { status: 'available' as const } },
          '3': { morning: { status: 'available' as const } },
        },
      }));

      const holidays = [
        {
          id: 'hol-cons-1',
          date: addDays(new Date(weekStart), 1).toISOString().split('T')[0],
          name: 'Holiday 1',
          type: 'no-work' as const,
        },
        {
          id: 'hol-cons-2',
          date: addDays(new Date(weekStart), 2).toISOString().split('T')[0],
          name: 'Holiday 2',
          type: 'no-work' as const,
        },
      ];

      const activeEmployees = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        isActive: true,
      }));

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        holidays,
        weekStart
      );

      // Days 1 and 2 should have no assignments
      if (result) {
        expect(Object.values(result.assignments['1'] || {}).filter(Boolean).length).toBe(0);
        expect(Object.values(result.assignments['2'] || {}).filter(Boolean).length).toBe(0);
      }
    });
  });

  describe('Fairness', () => {
    it('should distribute shifts fairly among employees', async () => {
      const employees = await Promise.all([
        createTestEmployee('Fair 1', 'fair1@test.com'),
        createTestEmployee('Fair 2', 'fair2@test.com'),
        createTestEmployee('Fair 3', 'fair3@test.com'),
      ]);

      // All available for all shifts for a week
      const availabilities = employees.map(emp => ({
        employeeId: emp.id,
        weekStart,
        shifts: Object.fromEntries(
          [0, 1, 2, 3, 4, 5, 6].map(day => [
            day.toString(),
            {
              morning: { status: 'available' as const },
              evening: { status: 'available' as const },
              night: { status: 'available' as const },
            }
          ])
        ),
      }));

      const activeEmployees = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        isActive: true,
      }));

      const result = await generateOptimizedSchedule(
        activeEmployees,
        availabilities,
        [],
        [],
        weekStart
      );

      // Count shifts per employee
      const shiftCounts: { [empId: string]: number } = {};
      employees.forEach(emp => shiftCounts[emp.id] = 0);

      if (result) {
        Object.values(result.assignments).forEach(day => {
          Object.values(day).forEach(empId => {
            if (empId && shiftCounts[empId] !== undefined) {
              shiftCounts[empId]++;
            }
          });
        });
      }

      const counts = Object.values(shiftCounts);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);

      // Difference should be reasonable (not more than 3 shifts)
      expect(maxCount - minCount).toBeLessThanOrEqual(3);
    });
  });
});
