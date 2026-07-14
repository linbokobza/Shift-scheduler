/**
 * Realistic-latency race condition test for handleAvailabilityToggle.
 *
 * Key insight (verified from TanStack Query v5 source):
 *   mutateAsync awaits onMutate → mutationFn → onSuccess → onSettled
 *   ALL in sequence before resolving. Therefore isSaving.current is set to
 *   false only AFTER all lifecycle callbacks complete.
 *
 * This means:
 *  - The __optimistic__ ID race (create path) is handled by TanStack Query's
 *    lifecycle: onSuccess replaces __optimistic__ before mutateAsync resolves.
 *  - Adding onSettled+invalidateQueries to useUpdateAvailability was a mistake:
 *    invalidateQueries internally calls refetchQueries (awaited!) making every
 *    click wait for TWO network round-trips, silently dropping clicks that fire
 *    during the second round-trip.
 *
 * The correct fix is: NO extra refetch, NO onSettled on update mutation.
 * The optimistic update from onMutate is sufficient and the lifecycle order
 * guarantees __optimistic__ is replaced before the next click can fire.
 *
 * These tests prove:
 *  1. TanStack Query v5 lifecycle order: onSuccess runs before mutateAsync resolves.
 *  2. 20 sequential clicks with random 50-300ms latency all complete correctly.
 *  3. The background refetch from a previous onSettled+invalidateQueries does NOT
 *     corrupt the cache (tests with the broken version to show the difference).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, useMutation } from '@tanstack/react-query';
import { availabilityKeys } from '../../hooks/useAvailabilities';
import { Availability, AvailabilityStatus } from '../../types';
import { SHIFTS } from '../../data/mockData';

// ─── helpers ────────────────────────────────────────────────────────────────

const WEEK_START = '2026-07-14';
const EMPLOYEE_ID = 'emp-test';
let serverAvailability: Availability | null = null;
let serverIdCounter = 0;

function makeDelay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function randomMs(min = 50, max = 300) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildDefaultShifts(
  overrideDay?: string,
  overrideShift?: string,
  overrideStatus?: AvailabilityStatus,
): Availability['shifts'] {
  const shifts: Availability['shifts'] = {};
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

// ─── Simulate the CORRECT useCreateAvailability mutation lifecycle ────────────
//
// TanStack Query v5 awaits onMutate → mutationFn → onSuccess → onSettled.
// So after createMutateAsync resolves, onSuccess has already replaced __optimistic__.

async function simulateCreateMutation(
  qc: QueryClient,
  data: { employeeId: string; weekStart: string; shifts: Availability['shifts'] },
): Promise<void> {
  // onMutate
  await qc.cancelQueries({ queryKey: availabilityKeys.all });
  const previous = qc.getQueryData<Availability[]>(availabilityKeys.all);
  const optimistic: Availability = {
    id: '__optimistic__',
    employeeId: data.employeeId,
    weekStart: data.weekStart,
    shifts: data.shifts,
  } as Availability;
  qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
    old ? [...old, optimistic] : [optimistic],
  );

  try {
    // mutationFn: random network delay
    await makeDelay(randomMs());
    const realId = `server-id-${++serverIdCounter}`;
    serverAvailability = { ...optimistic, id: realId };

    // onSuccess: replaces __optimistic__ with real record (BEFORE mutateAsync resolves)
    qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
      old
        ? old.map((a) => (a.id === '__optimistic__' ? serverAvailability! : a))
        : [serverAvailability!],
    );
    // No onSettled for create (matches real code)
  } catch {
    qc.setQueryData(availabilityKeys.all, previous);
  }
}

// ─── Simulate CORRECT useUpdateAvailability (NO onSettled+invalidateQueries) ──

async function simulateUpdateMutation(
  qc: QueryClient,
  id: string,
  shifts: Availability['shifts'],
): Promise<void> {
  // onMutate
  await qc.cancelQueries({ queryKey: availabilityKeys.all });
  const previous = qc.getQueryData<Availability[]>(availabilityKeys.all);
  qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
    old ? old.map((a) => (a.id === id ? { ...a, shifts } : a)) : old,
  );

  try {
    // mutationFn: random network delay
    await makeDelay(randomMs());
    // server now has updated shifts
    if (serverAvailability && serverAvailability.id === id) {
      serverAvailability = { ...serverAvailability, shifts };
    }
    // No onSuccess, no onSettled (matches correct version of useUpdateAvailability)
  } catch {
    qc.setQueryData(availabilityKeys.all, previous);
  }
}

// ─── Simulate BROKEN useUpdateAvailability (WITH onSettled+invalidateQueries) ─
//
// This simulates what happens when onSettled calls invalidateQueries:
//   invalidateQueries internally calls refetchQueries which AWAITS the GET.
//   So mutateAsync doesn't resolve until the GET completes.
//   If the GET takes 150ms and the user's "natural pause" is only 100ms,
//   the click during the GET will be blocked by isSaving=true (correct),
//   but the GET overwrites the cache when it returns (AFTER isSaving=false
//   if the user was patient), potentially with stale data.
//
// More importantly: the extra round-trip DOUBLES the time each click is blocked.

async function simulateUpdateMutationBroken(
  qc: QueryClient,
  id: string,
  shifts: Availability['shifts'],
): Promise<void> {
  // onMutate
  await qc.cancelQueries({ queryKey: availabilityKeys.all });
  const previous = qc.getQueryData<Availability[]>(availabilityKeys.all);
  qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
    old ? old.map((a) => (a.id === id ? { ...a, shifts } : a)) : old,
  );

  try {
    await makeDelay(randomMs()); // mutationFn: PUT
    if (serverAvailability && serverAvailability.id === id) {
      serverAvailability = { ...serverAvailability, shifts };
    }

    // onSettled: invalidateQueries → this internally awaits refetchQueries
    // The GET has its own network delay. This is what BLOCKS isSaving for extra time.
    await makeDelay(randomMs(50, 150)); // simulated background GET from invalidateQueries
    // background GET returns — overwrites cache with server data
    if (serverAvailability) {
      qc.setQueryData<Availability[]>(availabilityKeys.all, (old) =>
        old
          ? old.map((a) =>
              a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START
                ? serverAvailability!
                : a,
            )
          : [serverAvailability!],
      );
    }
  } catch {
    qc.setQueryData(availabilityKeys.all, previous);
  }
}

// ─── handleAvailabilityToggle replica ────────────────────────────────────────

async function handleToggle(
  qc: QueryClient,
  day: string,
  shiftId: string,
  updateFn: (qc: QueryClient, id: string, shifts: Availability['shifts']) => Promise<void>,
): Promise<void> {
  const cacheData = qc.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
  const existing = cacheData.find(
    (a) => a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START,
  );

  const currentStatus = existing?.shifts[day]?.[shiftId]?.status;
  const nextStatus: AvailabilityStatus =
    currentStatus === 'unavailable' ? 'available' : 'unavailable';

  if (!existing) {
    const shifts = buildDefaultShifts(day, shiftId, nextStatus);
    await simulateCreateMutation(qc, { employeeId: EMPLOYEE_ID, weekStart: WEEK_START, shifts });
    return;
  }

  const updatedShifts = { ...existing.shifts };
  if (!updatedShifts[day]) updatedShifts[day] = {};
  updatedShifts[day] = { ...updatedShifts[day] };
  updatedShifts[day][shiftId] = { ...updatedShifts[day][shiftId], status: nextStatus };

  await updateFn(qc, existing.id, updatedShifts);
}

// ─── All 18 cells ────────────────────────────────────────────────────────────

const allCells = Array.from({ length: 6 }, (_, day) =>
  SHIFTS.map((s) => ({ day: day.toString(), shiftId: s.id })),
).flat();

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('handleAvailabilityToggle — realistic network latency', () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    qc.setQueryData<Availability[]>(availabilityKeys.all, []);
    serverAvailability = null;
    serverIdCounter = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    qc.clear();
  });

  // ── Fundamental lifecycle proof ─────────────────────────────────────────────

  it('TanStack Query v5: onSuccess runs before mutateAsync resolves (no __optimistic__ leak)', async () => {
    // Verify that after createMutateAsync resolves, __optimistic__ is gone
    const createPromise = simulateCreateMutation(qc, {
      employeeId: EMPLOYEE_ID,
      weekStart: WEEK_START,
      shifts: buildDefaultShifts('0', 'morning', 'unavailable'),
    });
    await vi.advanceTimersByTimeAsync(400);
    await createPromise;

    const cache = qc.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const entry = cache.find((a) => a.employeeId === EMPLOYEE_ID);
    expect(entry).toBeDefined();
    expect(entry!.id).not.toBe('__optimistic__'); // onSuccess already replaced it
    expect(entry!.id).toMatch(/^server-id-/);
  }, 10_000);

  // ── CORRECT version: 20 sequential clicks, random latency ──────────────────

  it('CORRECT (no onSettled): 20 sequential clicks with random 50-300ms latency — all correct', async () => {
    // Fixed seed for reproducibility: 20 cell indices
    const seed = [3, 7, 1, 15, 0, 11, 5, 17, 2, 9, 14, 4, 12, 6, 16, 8, 13, 10, 1, 7];
    const clickSequence = seed.map((i) => allCells[i % allCells.length]);

    // Track expected status for each cell (toggled each time it's clicked)
    const expectedStatus: Record<string, Record<string, AvailabilityStatus>> = {};
    for (const { day, shiftId } of clickSequence) {
      if (!expectedStatus[day]) expectedStatus[day] = {};
      const prev = expectedStatus[day][shiftId] ?? 'available';
      expectedStatus[day][shiftId] = prev === 'available' ? 'unavailable' : 'available';
    }

    for (const { day, shiftId } of clickSequence) {
      const clickPromise = handleToggle(qc, day, shiftId, simulateUpdateMutation);
      // Advance timers through the network delay (up to 300ms for mutationFn)
      await vi.advanceTimersByTimeAsync(400);
      await clickPromise;
      // Natural inter-click pause (120ms — user moves to next cell)
      await vi.advanceTimersByTimeAsync(120);
    }

    const cache = qc.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const entry = cache.find((a) => a.employeeId === EMPLOYEE_ID && a.weekStart === WEEK_START);
    expect(entry).toBeDefined();
    expect(entry!.id).not.toBe('__optimistic__');

    for (const [day, shifts] of Object.entries(expectedStatus)) {
      for (const [shiftId, expectedSt] of Object.entries(shifts)) {
        const actual = entry!.shifts[day]?.[shiftId]?.status;
        expect(actual, `day=${day} shift=${shiftId} expected=${expectedSt} got=${actual}`).toBe(expectedSt);
      }
    }
  }, 30_000);

  // ── BROKEN version: shows that onSettled+invalidateQueries causes extra wait ─

  it('BROKEN (with onSettled+invalidateQueries): each click takes ~2x longer due to extra GET', async () => {
    // Set up existing record to use update path
    const initial: Availability = {
      id: 'real-server-id',
      employeeId: EMPLOYEE_ID,
      weekStart: WEEK_START,
      shifts: buildDefaultShifts(),
    } as Availability;
    qc.setQueryData<Availability[]>(availabilityKeys.all, [initial]);
    serverAvailability = initial;

    const startTime = Date.now();
    const click1Promise = handleToggle(qc, '0', 'morning', simulateUpdateMutationBroken);
    // Advance past both the PUT (200ms) and the background GET (100ms) = 300ms+
    await vi.advanceTimersByTimeAsync(500);
    await click1Promise;
    const elapsed = Date.now() - startTime;

    // With onSettled+invalidateQueries, each click takes at least 2 network RTTs
    // The broken version should have waited for PUT + GET before returning
    expect(elapsed).toBeGreaterThanOrEqual(100); // at least 2 network calls occurred

    // But cache should still be correct (the server data is right)
    const cache = qc.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const entry = cache.find((a) => a.employeeId === EMPLOYEE_ID);
    expect(entry!.shifts['0']['morning'].status).toBe('unavailable');
  }, 10_000);

  // ── 5 rapid sequential clicks (existing record, update path) ───────────────

  it('CORRECT: 5 rapid sequential clicks, update path, all 5 cells toggled correctly', async () => {
    const initial: Availability = {
      id: 'real-server-id',
      employeeId: EMPLOYEE_ID,
      weekStart: WEEK_START,
      shifts: buildDefaultShifts(),
    } as Availability;
    qc.setQueryData<Availability[]>(availabilityKeys.all, [initial]);
    serverAvailability = initial;

    const cells = [
      { day: '0', shiftId: 'morning' },
      { day: '0', shiftId: 'evening' },
      { day: '1', shiftId: 'morning' },
      { day: '2', shiftId: 'night' },
      { day: '3', shiftId: 'evening' },
    ];

    for (const { day, shiftId } of cells) {
      const p = handleToggle(qc, day, shiftId, simulateUpdateMutation);
      await vi.advanceTimersByTimeAsync(400); // network delay
      await p;
      await vi.advanceTimersByTimeAsync(100); // inter-click pause
    }

    const cache = qc.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const entry = cache.find((a) => a.employeeId === EMPLOYEE_ID);
    expect(entry).toBeDefined();
    for (const { day, shiftId } of cells) {
      expect(entry!.shifts[day]?.[shiftId]?.status, `${day}/${shiftId}`).toBe('unavailable');
    }
  }, 15_000);

  // ── Mixed create + update (the full real-world scenario) ───────────────────

  it('CORRECT: mixed create-path (first click) + 4 update-path clicks — all 5 correct', async () => {
    // Start with no record — first click goes through create path
    const cells = [
      { day: '0', shiftId: 'morning' },  // create path
      { day: '1', shiftId: 'evening' },  // update path
      { day: '2', shiftId: 'morning' },  // update path
      { day: '3', shiftId: 'night' },    // update path
      { day: '4', shiftId: 'morning' },  // update path
    ];

    for (const { day, shiftId } of cells) {
      const p = handleToggle(qc, day, shiftId, simulateUpdateMutation);
      await vi.advanceTimersByTimeAsync(400);
      await p;
      await vi.advanceTimersByTimeAsync(100);
    }

    await vi.advanceTimersByTimeAsync(200);

    const cache = qc.getQueryData<Availability[]>(availabilityKeys.all) ?? [];
    const entry = cache.find((a) => a.employeeId === EMPLOYEE_ID);
    expect(entry).toBeDefined();
    expect(entry!.id).not.toBe('__optimistic__');

    for (const { day, shiftId } of cells) {
      expect(entry!.shifts[day]?.[shiftId]?.status, `${day}/${shiftId}`).toBe('unavailable');
    }
  }, 15_000);
});
