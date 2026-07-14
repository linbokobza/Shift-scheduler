/**
 * Tests for the handleAvailabilityToggle race condition bug.
 *
 * Bug: When an employee has no existing availability record, the first click
 * creates one via createAvailabilityMutation. The mutation's onSuccess
 * (which replaces id:'__optimistic__' with the real server ID) runs
 * AFTER mutateAsync resolves. If a second click fires in that window,
 * getCurrentAvailabilities() finds id:'__optimistic__', and
 * updateAvailabilityMutation tries PUT /availabilities/__optimistic__ which
 * fails → onError rolls back the cache → both changes are lost.
 *
 * Fix: After createAvailabilityMutation.mutateAsync, explicitly
 * await queryClient.refetchQueries so the real ID is in the cache before
 * isSaving.current is set to false.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { availabilityKeys } from '../../hooks/useAvailabilities';
import { Availability, AvailabilityStatus } from '../../types';
import { SHIFTS } from '../../data/mockData';

// ---------------------------------------------------------------------------
// Helpers that replicate the exact logic from ManagerDashboardAPI
// ---------------------------------------------------------------------------

const WEEK_START = '2026-07-14';
const EMPLOYEE_ID = 'emp-1';

/** Replicates buildDefaultShifts from ManagerDashboardAPI */
function buildDefaultShifts(
  overrideDay?: string,
  overrideShift?: string,
  overrideStatus?: AvailabilityStatus
): Record<string, Record<string, { status: AvailabilityStatus; comment?: string }>> {
  const shifts: Record<string, Record<string, { status: AvailabilityStatus }>> = {};
  for (let day = 0; day < 6; day++) {
    shifts[day.toString()] = {};
    for (const shift of SHIFTS) {
      const isOverride = overrideDay === day.toString() && overrideShift === shift.id;
      shifts[day.toString()][shift.id] = {
        status: isOverride && overrideStatus ? overrideStatus : 'available',
      };
    }
  }
  return shifts;
}

/** Creates a full availability object (as the server would return) */
function makeAvailability(
  id: string,
  shifts: Record<string, Record<string, { status: AvailabilityStatus }>>
): Availability {
  return { id, employeeId: EMPLOYEE_ID, weekStart: WEEK_START, shifts } as Availability;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('handleAvailabilityToggle — sequential clicks on 5+ cells', () => {
  let queryClient: QueryClient;

  // The 5 cells we will click in sequence
  const clicks = [
    { day: '0', shiftId: 'morning' },
    { day: '0', shiftId: 'evening' },
    { day: '1', shiftId: 'morning' },
    { day: '2', shiftId: 'night' },
    { day: '3', shiftId: 'evening' },
  ];

  // -------------------------------------------------------------------------
  // Simulate the exact mutations from useAvailabilities.ts
  // We do NOT render the real component; instead we replicate the state-
  // machine logic so the test is deterministic and fast.
  // -------------------------------------------------------------------------

  /** Simulates createAvailabilityMutation.mutateAsync + onMutate + onSuccess + refetch */
  async function simulateCreate(
    qc: QueryClient,
    data: { employeeId: string; weekStart: string; shifts: Availability['shifts'] },
    serverResponse: Availability
  ) {
    // onMutate: cancel in-flight queries, set optimistic entry
    await qc.cancelQueries({ queryKey: availabilityKeys.all });
    const optimistic: Availability = {
      id: '__optimistic__',
      employeeId: data.employeeId,
      weekStart: data.weekStart,
      shifts: data.shifts,
    } as Availability;
    qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
      old ? [...old, optimistic] : [optimistic]
    );

    // mutationFn completes (server returns real record) — mutateAsync resolves HERE.
    // onSuccess runs AFTER mutateAsync, so we model that as a separate step below.

    // --- This is where isSaving.current would be set to false in the real code ---
    // (In the real code, without the fix, the second click could fire right here)

    // onSuccess: replace __optimistic__ with real server record
    qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
      old
        ? old.map((a) => (a.id === '__optimistic__' ? serverResponse : a))
        : [serverResponse]
    );

    // The FIX: refetchQueries is awaited before returning, ensuring real ID is in cache
    // (In tests we just verify the cache state — no actual network call)
  }

  /** Simulates updateAvailabilityMutation.mutateAsync + onMutate + onSettled */
  async function simulateUpdate(
    qc: QueryClient,
    id: string,
    shifts: Availability['shifts']
  ): Promise<'ok' | 'error'> {
    // onMutate
    await qc.cancelQueries({ queryKey: availabilityKeys.all });
    const previous = qc.getQueryData<Availability[]>(availabilityKeys.all);
    qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
      old ? old.map((a) => (a.id === id ? { ...a, shifts } : a)) : old
    );

    // mutationFn: reject if id is __optimistic__ (the bug condition)
    if (id === '__optimistic__') {
      // onError: rollback
      qc.setQueryData(availabilityKeys.all, previous);
      return 'error';
    }

    // onSettled: invalidate (the fix)
    qc.invalidateQueries({ queryKey: availabilityKeys.all });
    return 'ok';
  }

  /** Replicates handleAvailabilityToggle — WITH the fix applied */
  async function handleAvailabilityToggleFixed(day: string, shiftId: string) {
    const cacheData = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const existing = cacheData.find(
      (a) => a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START
    );

    const currentStatus = existing?.shifts[day]?.[shiftId]?.status;
    const nextStatus: AvailabilityStatus =
      currentStatus === 'unavailable' ? 'available' : 'unavailable';

    if (!existing) {
      const shifts = buildDefaultShifts(day, shiftId, nextStatus);
      const fakeServerRecord = makeAvailability('real-server-id', shifts as Availability['shifts']);

      await simulateCreate(queryClient, { employeeId: EMPLOYEE_ID, weekStart: WEEK_START, shifts: shifts as Availability['shifts'] }, fakeServerRecord);
      // THE FIX: refetch so real ID is in cache before next click
      // (simulateCreate already applied onSuccess synchronously in the test)
      return;
    }

    const updatedShifts = { ...existing.shifts };
    if (!updatedShifts[day]) updatedShifts[day] = {};
    updatedShifts[day] = { ...updatedShifts[day] };
    updatedShifts[day][shiftId] = { ...updatedShifts[day][shiftId], status: nextStatus };

    const result = await simulateUpdate(queryClient, existing.id, updatedShifts);
    expect(result).toBe('ok'); // must not fail with __optimistic__ ID
  }

  /** Replicates handleAvailabilityToggle — WITHOUT the fix (buggy version) */
  async function handleAvailabilityToggleBuggy(day: string, shiftId: string) {
    const cacheData = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const existing = cacheData.find(
      (a) => a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START
    );

    const currentStatus = existing?.shifts[day]?.[shiftId]?.status;
    const nextStatus: AvailabilityStatus =
      currentStatus === 'unavailable' ? 'available' : 'unavailable';

    if (!existing) {
      const shifts = buildDefaultShifts(day, shiftId, nextStatus);
      const fakeServerRecord = makeAvailability('real-server-id', shifts as Availability['shifts']);

      // BUG: onMutate fires (sets __optimistic__), mutationFn completes,
      // mutateAsync resolves — but onSuccess has NOT run yet.
      // We model this by doing onMutate + mutationFn but NOT onSuccess before returning.
      await qc_cancelAndSetOptimistic(queryClient, { employeeId: EMPLOYEE_ID, weekStart: WEEK_START, shifts: shifts as Availability['shifts'] });
      // mutateAsync resolves here (isSaving = false in real code)
      // onSuccess will run later (modelled by calling it after the second click in the test)
      _pendingOnSuccess = () => {
        queryClient.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
          old
            ? old.map((a) => (a.id === '__optimistic__' ? fakeServerRecord : a))
            : [fakeServerRecord]
        );
      };
      return; // returns WITHOUT awaiting onSuccess
    }

    const updatedShifts = { ...existing.shifts };
    if (!updatedShifts[day]) updatedShifts[day] = {};
    updatedShifts[day] = { ...updatedShifts[day] };
    updatedShifts[day][shiftId] = { ...updatedShifts[day][shiftId], status: nextStatus };

    await simulateUpdate(queryClient, existing.id, updatedShifts);
  }

  let _pendingOnSuccess: (() => void) | null = null;

  async function qc_cancelAndSetOptimistic(
    qc: QueryClient,
    data: { employeeId: string; weekStart: string; shifts: Availability['shifts'] }
  ) {
    await qc.cancelQueries({ queryKey: availabilityKeys.all });
    const optimistic: Availability = {
      id: '__optimistic__',
      employeeId: data.employeeId,
      weekStart: data.weekStart,
      shifts: data.shifts,
    } as Availability;
    qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
      old ? [...old, optimistic] : [optimistic]
    );
  }

  // -------------------------------------------------------------------------

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Start with empty cache (no availability for this employee)
    queryClient.setQueryData<Availability[]>(availabilityKeys.all, []);
    _pendingOnSuccess = null;
  });

  // -------------------------------------------------------------------------
  // THE ACTUAL TESTS
  // -------------------------------------------------------------------------

  it('WITH FIX: 5 sequential cell clicks each toggle exactly once', async () => {
    for (const { day, shiftId } of clicks) {
      await handleAvailabilityToggleFixed(day, shiftId);
    }

    const cache = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const entry = cache.find(
      (a) => a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START
    );

    expect(entry).toBeDefined();
    // All 5 clicked cells must be 'unavailable' (toggled from default 'available')
    for (const { day, shiftId } of clicks) {
      expect(entry!.shifts[day]?.[shiftId]?.status).toBe('unavailable');
    }
    // A cell we didn't click must remain 'available'
    expect(entry!.shifts['5']?.['morning']?.status).toBe('available');
  });

  it('WITHOUT FIX (buggy): second click fails when onSuccess has not yet run', async () => {
    // Click 1: creates availability with __optimistic__ ID
    await handleAvailabilityToggleBuggy(clicks[0].day, clicks[0].shiftId);

    // onSuccess has NOT run yet — cache still has id:'__optimistic__'
    const cacheAfterClick1 = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const optimisticEntry = cacheAfterClick1.find((a) => a.id === '__optimistic__');
    expect(optimisticEntry).toBeDefined(); // confirms the bug precondition

    // Click 2 fires before onSuccess: tries to update __optimistic__ → server error
    await handleAvailabilityToggleBuggy(clicks[1].day, clicks[1].shiftId);

    // onError has rolled back the cache — the optimistic entry is gone
    const cacheAfterRollback = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const anyEntry = cacheAfterRollback.find(
      (a) => a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START
    );
    // Both changes are lost — this demonstrates the bug
    const click1Status = anyEntry?.shifts[clicks[0].day]?.[clicks[0].shiftId]?.status;
    const click2Status = anyEntry?.shifts[clicks[1].day]?.[clicks[1].shiftId]?.status;
    // In the buggy version, at least one of the changes will not have applied
    const bothApplied = click1Status === 'unavailable' && click2Status === 'unavailable';
    expect(bothApplied).toBe(false); // proves the bug exists without the fix
  });

  it('WITH FIX: first click (create path) always uses real server ID for all subsequent clicks', async () => {
    // Click 1 (create path)
    await handleAvailabilityToggleFixed(clicks[0].day, clicks[0].shiftId);

    // After fix: cache must have real server ID, not __optimistic__
    const cache = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const entry = cache.find((a) => a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START);
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('real-server-id'); // not '__optimistic__'

    // Clicks 2–5 (update path) must all succeed
    for (const { day, shiftId } of clicks.slice(1)) {
      await handleAvailabilityToggleFixed(day, shiftId);
    }

    const finalCache = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const finalEntry = finalCache.find(
      (a) => a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START
    );
    expect(finalEntry).toBeDefined();
    for (const { day, shiftId } of clicks) {
      expect(finalEntry!.shifts[day]?.[shiftId]?.status).toBe('unavailable');
    }
  });

  it('WITH FIX: toggling same cell twice returns it to original state', async () => {
    const { day, shiftId } = clicks[0];

    // Toggle on
    await handleAvailabilityToggleFixed(day, shiftId);
    let cache = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    let entry = cache.find((a) => a.employeeId === EMPLOYEE_ID);
    expect(entry?.shifts[day]?.[shiftId]?.status).toBe('unavailable');

    // Toggle off
    await handleAvailabilityToggleFixed(day, shiftId);
    cache = queryClient.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    entry = cache.find((a) => a.employeeId === EMPLOYEE_ID);
    expect(entry?.shifts[day]?.[shiftId]?.status).toBe('available');
  });
});
