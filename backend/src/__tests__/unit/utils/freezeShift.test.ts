import { generateOptimizedSchedule } from '../../../utils/optimizedScheduler';
import { createTestEmployee } from '../../helpers/fixtures';

/**
 * Tests for the freeze shift bug fix:
 * When a shift is frozen, ALL associated workers (primary + extras array) must be preserved
 * after schedule regeneration.
 *
 * extraAssignments structure: { [day]: { [shiftId]: string[] } }
 */
describe('Freeze Shift - Extra Assignments Preservation', () => {
  const weekStart = '2026-07-14'; // Fixed date for deterministic tests

  // Helper to build a full-week availability for an employee
  const makeAvailability = (employeeId: string) => ({
    employeeId,
    weekStart,
    shifts: Object.fromEntries(
      [0, 1, 2, 3, 4, 5].map(day => [
        day.toString(),
        {
          morning: { status: 'available' as const },
          evening: { status: 'available' as const },
          night: { status: 'available' as const },
        },
      ])
    ),
  });

  describe('Case 1: Shift with primary worker only (no extra)', () => {
    it('should preserve frozen primary assignment and return no extra assignment', async () => {
      const primary = await createTestEmployee('Primary Only', 'primary-only@freeze.test');
      const other = await createTestEmployee('Other Worker', 'other-only@freeze.test');

      const activeEmployees = [primary, other].map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, isActive: true,
      }));

      const existingSchedule = {
        assignments: { '0': { morning: primary.id } },
        // No extraAssignments for this shift
        extraAssignments: undefined,
        frozenAssignments: { '0': { morning: true } },
      };

      const result = await generateOptimizedSchedule(
        activeEmployees,
        [makeAvailability(primary.id), makeAvailability(other.id)],
        [],
        [],
        weekStart,
        existingSchedule
      );

      expect(result).not.toBeNull();
      // Primary assignment must be preserved
      expect(result!.assignments['0']?.morning).toBe(primary.id);
      // frozenExtraAssignments must be absent or undefined for this shift
      expect(result!.frozenExtraAssignments?.['0']?.morning).toBeUndefined();
    });
  });

  describe('Case 2: Shift with primary worker + one extra worker', () => {
    it('should preserve both primary and extra (array with 1 element) when shift is frozen', async () => {
      const primary = await createTestEmployee('Primary With Extra', 'primary-extra@freeze.test');
      const extra = await createTestEmployee('Extra Worker', 'extra-worker@freeze.test');
      const other = await createTestEmployee('Other Worker', 'other-extra@freeze.test');

      const activeEmployees = [primary, extra, other].map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, isActive: true,
      }));

      const existingSchedule = {
        assignments: { '1': { evening: primary.id } },
        extraAssignments: { '1': { evening: [extra.id] } },
        frozenAssignments: { '1': { evening: true } },
      };

      const result = await generateOptimizedSchedule(
        activeEmployees,
        [makeAvailability(primary.id), makeAvailability(extra.id), makeAvailability(other.id)],
        [],
        [],
        weekStart,
        existingSchedule
      );

      expect(result).not.toBeNull();
      // Primary must be preserved
      expect(result!.assignments['1']?.evening).toBe(primary.id);
      // Extra array must be preserved in frozenExtraAssignments
      expect(result!.frozenExtraAssignments).toBeDefined();
      expect(result!.frozenExtraAssignments!['1']?.evening).toEqual([extra.id]);
    });

    it('should preserve empty extra array when frozen shift has no extra workers', async () => {
      const primary = await createTestEmployee('Primary No Extra', 'primary-noextra@freeze.test');
      const other = await createTestEmployee('Other No Extra', 'other-noextra@freeze.test');

      const activeEmployees = [primary, other].map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, isActive: true,
      }));

      const existingSchedule = {
        assignments: { '2': { night: primary.id } },
        extraAssignments: { '2': { night: [] } }, // explicitly empty array
        frozenAssignments: { '2': { night: true } },
      };

      const result = await generateOptimizedSchedule(
        activeEmployees,
        [makeAvailability(primary.id), makeAvailability(other.id)],
        [],
        [],
        weekStart,
        existingSchedule
      );

      expect(result).not.toBeNull();
      // Primary must be preserved
      expect(result!.assignments['2']?.night).toBe(primary.id);
      // Empty array should be preserved
      expect(result!.frozenExtraAssignments!['2']?.night).toEqual([]);
    });
  });

  describe('Case 3: Shift with primary + multiple extra workers (≥2)', () => {
    it('should preserve all extra workers (2 extras) when shift is frozen', async () => {
      const primary = await createTestEmployee('Primary Multi', 'primary-multi@freeze.test');
      const extra1 = await createTestEmployee('Extra One', 'extra-one@freeze.test');
      const extra2 = await createTestEmployee('Extra Two', 'extra-two@freeze.test');
      const other = await createTestEmployee('Other Multi', 'other-multi@freeze.test');

      const activeEmployees = [primary, extra1, extra2, other].map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, isActive: true,
      }));

      const existingSchedule = {
        assignments: { '3': { morning: primary.id } },
        extraAssignments: { '3': { morning: [extra1.id, extra2.id] } }, // 2 extra workers
        frozenAssignments: { '3': { morning: true } },
      };

      const result = await generateOptimizedSchedule(
        activeEmployees,
        [
          makeAvailability(primary.id),
          makeAvailability(extra1.id),
          makeAvailability(extra2.id),
          makeAvailability(other.id),
        ],
        [],
        [],
        weekStart,
        existingSchedule
      );

      expect(result).not.toBeNull();
      // Primary must be preserved
      expect(result!.assignments['3']?.morning).toBe(primary.id);
      // Both extra workers must be preserved
      expect(result!.frozenExtraAssignments).toBeDefined();
      expect(result!.frozenExtraAssignments!['3']?.morning).toEqual([extra1.id, extra2.id]);
      expect(result!.frozenExtraAssignments!['3']?.morning).toHaveLength(2);
    });

    it('should preserve all extra workers (3 extras) when shift is frozen', async () => {
      const primary = await createTestEmployee('Primary Three', 'primary-three@freeze.test');
      const extra1 = await createTestEmployee('Extra A', 'extra-a3@freeze.test');
      const extra2 = await createTestEmployee('Extra B', 'extra-b3@freeze.test');
      const extra3 = await createTestEmployee('Extra C', 'extra-c3@freeze.test');

      const activeEmployees = [primary, extra1, extra2, extra3].map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, isActive: true,
      }));

      const existingSchedule = {
        assignments: { '4': { evening: primary.id } },
        extraAssignments: { '4': { evening: [extra1.id, extra2.id, extra3.id] } },
        frozenAssignments: { '4': { evening: true } },
      };

      const result = await generateOptimizedSchedule(
        activeEmployees,
        [
          makeAvailability(primary.id),
          makeAvailability(extra1.id),
          makeAvailability(extra2.id),
          makeAvailability(extra3.id),
        ],
        [],
        [],
        weekStart,
        existingSchedule
      );

      expect(result).not.toBeNull();
      expect(result!.assignments['4']?.evening).toBe(primary.id);
      expect(result!.frozenExtraAssignments!['4']?.evening).toEqual([extra1.id, extra2.id, extra3.id]);
      expect(result!.frozenExtraAssignments!['4']?.evening).toHaveLength(3);
    });
  });

  describe('Case 3b: Multiple frozen shifts, each with extra workers', () => {
    it('should preserve extra assignments for all frozen shifts independently', async () => {
      const primary1 = await createTestEmployee('Primary A', 'primary-a@freeze.test');
      const extra1 = await createTestEmployee('Extra A', 'extra-a@freeze.test');
      const primary2 = await createTestEmployee('Primary B', 'primary-b@freeze.test');
      const extra2a = await createTestEmployee('Extra B1', 'extra-b1@freeze.test');
      const extra2b = await createTestEmployee('Extra B2', 'extra-b2@freeze.test');

      const activeEmployees = [primary1, extra1, primary2, extra2a, extra2b].map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, isActive: true,
      }));

      const existingSchedule = {
        assignments: {
          '0': { morning: primary1.id },
          '3': { evening: primary2.id },
        },
        extraAssignments: {
          '0': { morning: [extra1.id] },           // 1 extra
          '3': { evening: [extra2a.id, extra2b.id] }, // 2 extras
        },
        frozenAssignments: {
          '0': { morning: true },
          '3': { evening: true },
        },
      };

      const result = await generateOptimizedSchedule(
        activeEmployees,
        [
          makeAvailability(primary1.id),
          makeAvailability(extra1.id),
          makeAvailability(primary2.id),
          makeAvailability(extra2a.id),
          makeAvailability(extra2b.id),
        ],
        [],
        [],
        weekStart,
        existingSchedule
      );

      expect(result).not.toBeNull();

      // First frozen shift: primary + 1 extra
      expect(result!.assignments['0']?.morning).toBe(primary1.id);
      expect(result!.frozenExtraAssignments?.['0']?.morning).toEqual([extra1.id]);

      // Second frozen shift: primary + 2 extras
      expect(result!.assignments['3']?.evening).toBe(primary2.id);
      expect(result!.frozenExtraAssignments?.['3']?.evening).toEqual([extra2a.id, extra2b.id]);
    });

    it('should preserve extras for frozen shifts and ignore extras for non-frozen shifts', async () => {
      const primary1 = await createTestEmployee('Primary Frozen', 'primary-frozen@freeze.test');
      const extra1 = await createTestEmployee('Extra Frozen', 'extra-frozen@freeze.test');
      const primary2 = await createTestEmployee('Primary Free', 'primary-free@freeze.test');
      const extra2 = await createTestEmployee('Extra Free', 'extra-free@freeze.test');

      const activeEmployees = [primary1, extra1, primary2, extra2].map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, isActive: true,
      }));

      const existingSchedule = {
        assignments: {
          '0': { morning: primary1.id },  // frozen
          '1': { morning: primary2.id },  // NOT frozen
        },
        extraAssignments: {
          '0': { morning: [extra1.id] },  // extra for frozen shift
          '1': { morning: [extra2.id] },  // extra for non-frozen shift (should NOT be preserved)
        },
        frozenAssignments: {
          '0': { morning: true },         // only this one is frozen
        },
      };

      const result = await generateOptimizedSchedule(
        activeEmployees,
        [
          makeAvailability(primary1.id),
          makeAvailability(extra1.id),
          makeAvailability(primary2.id),
          makeAvailability(extra2.id),
        ],
        [],
        [],
        weekStart,
        existingSchedule
      );

      expect(result).not.toBeNull();

      // Frozen shift: primary and extra must be preserved
      expect(result!.assignments['0']?.morning).toBe(primary1.id);
      expect(result!.frozenExtraAssignments?.['0']?.morning).toEqual([extra1.id]);

      // Non-frozen shift: extra is NOT preserved in frozenExtraAssignments
      expect(result!.frozenExtraAssignments?.['1']).toBeUndefined();
    });
  });

  describe('Unfreeze consistency', () => {
    it('should not include extra in frozenExtraAssignments when shift is not frozen', async () => {
      const primary = await createTestEmployee('Unfrozen Primary', 'unfrozen-p@freeze.test');
      const extra = await createTestEmployee('Unfrozen Extra', 'unfrozen-e@freeze.test');

      const activeEmployees = [primary, extra].map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, isActive: true,
      }));

      // No frozen assignments at all
      const existingSchedule = {
        assignments: { '0': { morning: primary.id } },
        extraAssignments: { '0': { morning: [extra.id] } },
        frozenAssignments: {},
      };

      const result = await generateOptimizedSchedule(
        activeEmployees,
        [makeAvailability(primary.id), makeAvailability(extra.id)],
        [],
        [],
        weekStart,
        existingSchedule
      );

      expect(result).not.toBeNull();
      // No frozen extra assignments should be returned
      const frozenExtra = result!.frozenExtraAssignments;
      expect(
        frozenExtra === undefined || Object.keys(frozenExtra).length === 0
      ).toBe(true);
    });
  });
});
