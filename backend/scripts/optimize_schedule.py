#!/usr/bin/env python3
"""
Shift Scheduling Optimization using Google OR-Tools CP-SAT Solver

This script receives scheduling input as JSON and returns optimized shift assignments.
It uses constraint programming to ensure all hard constraints are met and optimizes
for soft constraints in priority order.
"""

import json
import sys
import random
import time
from typing import Dict, List, Set, Tuple, Optional
from ortools.sat.python import cp_model


class ShiftSchedulingModel:
    """Builds and solves the shift scheduling problem using CP-SAT"""

    def __init__(self, data: dict):
        self.data = data
        self.model = cp_model.CpModel()

        # Parse input
        self.employees = {emp['id']: emp for emp in data['employees']}
        self.employee_ids = list(self.employees.keys())
        self.num_days = 6
        self.shifts = ['morning', 'evening', 'night']

        # Build availability map
        self.availability_map = {}
        for avail in data.get('availabilities', []):
            self.availability_map[avail['employeeId']] = avail

        # Build vacation set
        self.vacation_set = {}
        raw_vacations = data.get('vacations', [])
        print(f"📊 Total vacation records received: {len(raw_vacations)}", file=sys.stderr)

        for vacation in raw_vacations:
            emp_id = vacation['employeeId']
            vac_date = vacation['date']
            vac_type = vacation.get('type', 'vacation')
            print(f"  🏖️  Raw vacation: emp_id={emp_id}, date={vac_date}, type={vac_type}", file=sys.stderr)

            if emp_id not in self.vacation_set:
                self.vacation_set[emp_id] = set()
            self.vacation_set[emp_id].add(vac_date)

        # DEBUG: Show vacations received
        if self.vacation_set:
            print(f"✅ Vacation set built:", file=sys.stderr)
            for emp_id, dates in self.vacation_set.items():
                emp_name = self.employees.get(emp_id, {}).get('name', 'Unknown')
                print(f"   {emp_name} ({emp_id}): {sorted(dates)}", file=sys.stderr)
        else:
            print(f"❌ NO VACATIONS LOADED!", file=sys.stderr)

        # Build holiday map
        self.holiday_map = {}
        for holiday in data.get('holidays', []):
            self.holiday_map[holiday['date']] = holiday

        # Build frozen assignments map
        # frozenAssignments: { day: { shiftId: employeeId | null } }
        # null means "frozen as empty" - no one should be assigned
        self.frozen_assignments = data.get('frozenAssignments', {})
        if self.frozen_assignments:
            print(f"🔒 Frozen assignments loaded:", file=sys.stderr)
            for day_str, shifts in self.frozen_assignments.items():
                for shift_id, emp_id in shifts.items():
                    if emp_id:
                        emp_name = self.employees.get(emp_id, {}).get('name', emp_id)
                        print(f"   Day {day_str} {shift_id}: {emp_name}", file=sys.stderr)
                    else:
                        print(f"   Day {day_str} {shift_id}: FROZEN EMPTY", file=sys.stderr)

        # Build valid shifts list (considering holidays and Friday restrictions)
        self.valid_shifts = []

        # Debug: Show all holidays received
        if self.holiday_map:
            print(f"📅 Loaded {len(self.holiday_map)} holidays:", file=sys.stderr)
            for h_date, h_data in self.holiday_map.items():
                print(f"   {h_date}: {h_data.get('name', 'Unknown')} - Type: {h_data.get('type', 'Unknown')}", file=sys.stderr)
        else:
            print(f"⚠️  No holidays loaded!", file=sys.stderr)

        for day in range(self.num_days):
            date = self._get_date_for_day(day)
            holiday = self.holiday_map.get(date)

            if holiday:
                print(f"🎉 Day {day} ({date}) has holiday: {holiday.get('name', 'Unknown')} (type: {holiday.get('type', 'Unknown')})", file=sys.stderr)

            for shift in self.shifts:
                skip_reason = None

                # Friday - only morning
                if day == 5 and shift != 'morning':
                    skip_reason = "Friday (only morning allowed)"

                # Holiday - check type
                elif holiday:
                    if holiday['type'] == 'no-work':
                        skip_reason = f"no-work holiday ({holiday.get('name', 'Unknown')})"
                    elif holiday['type'] == 'morning-only' and shift != 'morning':
                        skip_reason = f"morning-only holiday ({holiday.get('name', 'Unknown')})"

                if skip_reason:
                    print(f"   ⏭️  Skipping day {day} ({date}) {shift}: {skip_reason}", file=sys.stderr)
                else:
                    self.valid_shifts.append((day, shift))

        print(f"✅ Created {len(self.valid_shifts)} valid shifts", file=sys.stderr)

        # Debug: Show availability statistics
        print(f"\n👥 Employee Availability Summary:", file=sys.stderr)
        for emp_id in self.employee_ids:
            emp_name = self.employees[emp_id]['name']
            available_count = sum(
                1 for day, shift in self.valid_shifts
                if self._is_employee_available(emp_id, day, shift)
            )
            print(f"   {emp_name}: {available_count}/{len(self.valid_shifts)} shifts available", file=sys.stderr)

        # Variables: x[emp][day][shift] = 1 if employee emp works shift on day
        self.x = {}
        for emp_id in self.employee_ids:
            for day, shift in self.valid_shifts:
                self.x[(emp_id, day, shift)] = self.model.NewBoolVar(f'x_{emp_id}_d{day}_{shift}')

        # Auxiliary variables for optimization
        self.shift_unfilled = {}  # 1 if shift is not filled
        self.employee_shift_counts = {}  # Total shifts per employee
        self.employee_morning_counts = {}  # Morning shifts per employee
        self.eight_eight_violations = {}  # 8-8 patterns per employee
        self.eight_eight_eight_violations = {}  # 8-8-8 patterns per employee

    def _get_date_for_day(self, day: int) -> str:
        """Calculate date string for a given day offset"""
        # This is a simplified version - matches TypeScript getDateForDay logic
        from datetime import datetime, timedelta
        week_start = self.data['weekStart']
        start_date = datetime.strptime(week_start, '%Y-%m-%d')
        target_date = start_date + timedelta(days=day)
        return target_date.strftime('%Y-%m-%d')

    def _is_employee_available(self, emp_id: str, day: int, shift: str) -> bool:
        """Check if employee is available for a shift"""
        # Check vacation
        date = self._get_date_for_day(day)
        if emp_id in self.vacation_set and date in self.vacation_set[emp_id]:
            # DEBUG: Log when employee is on vacation
            emp_name = self.employees.get(emp_id, {}).get('name', 'Unknown')
            print(f"🏖️  {emp_name} is on vacation on {date}, NOT available for {shift}", file=sys.stderr)
            return False

        # Check availability
        if emp_id not in self.availability_map:
            return True  # Default: available

        avail = self.availability_map[emp_id]
        day_avail = avail.get('shifts', {}).get(str(day), {})
        shift_avail = day_avail.get(shift, {})

        if not shift_avail:
            return True  # Default: available

        return shift_avail.get('status') == 'available'
 
    def _is_shift_frozen(self, day: int, shift: str) -> Tuple[bool, Optional[str]]:
        """Check if a shift is frozen. Returns (is_frozen, employee_id or None for frozen empty)"""
        day_str = str(day)
        if day_str in self.frozen_assignments:
            if shift in self.frozen_assignments[day_str]:
                emp_id = self.frozen_assignments[day_str][shift]
                return (True, emp_id)  # emp_id can be None for "frozen empty"
        return (False, None)

    def add_hard_constraints(self):
        """Add all hard constraints that must be satisfied"""

        # CONSTRAINT: Only assign available employees
        for emp_id in self.employee_ids:
            for day, shift in self.valid_shifts:
                if not self._is_employee_available(emp_id, day, shift):
                    self.model.Add(self.x[(emp_id, day, shift)] == 0)

        # CONSTRAINT: Handle frozen assignments and shift filling
        frozen_count = 0
        for day, shift in self.valid_shifts:
            is_frozen, frozen_emp_id = self._is_shift_frozen(day, shift)

            if is_frozen:
                frozen_count += 1
                if frozen_emp_id is None:
                    # FROZEN EMPTY - no one should be assigned to this shift
                    self.model.Add(
                        sum(self.x[(emp_id, day, shift)] for emp_id in self.employee_ids) == 0
                    )
                    print(f"🔒 Day {day} {shift}: Frozen as EMPTY", file=sys.stderr)
                else:
                    # Check if this is the special "119" emergency service
                    if '119' in str(frozen_emp_id):
                        # 119 is not a real employee - treat as "no regular employee assigned"
                        # No one should be assigned (119 handles this shift externally)
                        self.model.Add(
                            sum(self.x[(emp_id, day, shift)] for emp_id in self.employee_ids) == 0
                        )
                        print(f"🚨 Day {day} {shift}: Frozen to 119 (emergency service)", file=sys.stderr)
                    elif frozen_emp_id in self.employee_ids:
                        emp_name = self.employees.get(frozen_emp_id, {}).get('name', frozen_emp_id)
                        if self._is_employee_available(frozen_emp_id, day, shift):
                            # FROZEN WITH EMPLOYEE - this specific employee must be assigned
                            self.model.Add(self.x[(frozen_emp_id, day, shift)] == 1)
                            # And no one else can be assigned
                            for other_emp in self.employee_ids:
                                if other_emp != frozen_emp_id:
                                    self.model.Add(self.x[(other_emp, day, shift)] == 0)
                            print(f"🔒 Day {day} {shift}: Frozen to {emp_name}", file=sys.stderr)
                        else:
                            # Frozen employee is no longer available - unfreeze and treat as normal shift
                            print(f"⚠️  Day {day} {shift}: Frozen employee {emp_name} is NOT available - unfreezing", file=sys.stderr)
                            available_employees = [
                                e for e in self.employee_ids
                                if self._is_employee_available(e, day, shift)
                            ]
                            if available_employees:
                                self.model.Add(
                                    sum(self.x[(e, day, shift)] for e in self.employee_ids) == 1
                                )
                            else:
                                self.model.Add(
                                    sum(self.x[(e, day, shift)] for e in self.employee_ids) == 0
                                )
                    else:
                        print(f"⚠️  Day {day} {shift}: Frozen employee {frozen_emp_id} not found!", file=sys.stderr)
            else:
                # Not frozen - normal constraint
                available_employees = [
                    emp_id for emp_id in self.employee_ids
                    if self._is_employee_available(emp_id, day, shift)
                ]

                if available_employees:
                    # EXACTLY 1 employee per shift (HARD CONSTRAINT - must be filled!)
                    self.model.Add(
                        sum(self.x[(emp_id, day, shift)] for emp_id in self.employee_ids) == 1
                    )
                else:
                    # No one available - ensure shift is not assigned
                    self.model.Add(
                        sum(self.x[(emp_id, day, shift)] for emp_id in self.employee_ids) == 0
                    )

        if frozen_count > 0:
            print(f"✓ Applied {frozen_count} frozen shift constraints", file=sys.stderr)

        # CONSTRAINT: Each employee works at most 1 shift per day
        for emp_id in self.employee_ids:
            for day in range(self.num_days):
                shifts_on_day = [(d, s) for d, s in self.valid_shifts if d == day]
                if shifts_on_day:
                    self.model.Add(
                        sum(self.x[(emp_id, d, s)] for d, s in shifts_on_day) <= 1
                    )

        # CONSTRAINT: No morning after night (same employee)
        for emp_id in self.employee_ids:
            for day in range(self.num_days - 1):
                # If worked night on 'day', cannot work morning on 'day+1'
                night_var = self.x.get((emp_id, day, 'night'))
                morning_next_var = self.x.get((emp_id, day + 1, 'morning'))

                if night_var is not None and morning_next_var is not None:
                    # night_today + morning_tomorrow <= 1
                    self.model.Add(night_var + morning_next_var <= 1)

        print(f"✓ Added hard constraints", file=sys.stderr)

    def create_auxiliary_variables(self):
        """Create auxiliary variables for optimization objectives"""

        # 1. Shift unfilled indicators
        for day, shift in self.valid_shifts:
            available_employees = [
                emp_id for emp_id in self.employee_ids
                if self._is_employee_available(emp_id, day, shift)
            ]

            if available_employees:
                unfilled = self.model.NewBoolVar(f'unfilled_d{day}_{shift}')
                self.shift_unfilled[(day, shift)] = unfilled

                # unfilled = 1 iff sum of assignments = 0
                total_assigned = sum(self.x[(emp_id, day, shift)] for emp_id in self.employee_ids)
                self.model.Add(total_assigned == 0).OnlyEnforceIf(unfilled)
                self.model.Add(total_assigned >= 1).OnlyEnforceIf(unfilled.Not())

        # 2. Employee shift counts
        for emp_id in self.employee_ids:
            total_shifts = self.model.NewIntVar(0, len(self.valid_shifts), f'total_shifts_{emp_id}')
            self.employee_shift_counts[emp_id] = total_shifts
            self.model.Add(
                total_shifts == sum(self.x[(emp_id, day, shift)]
                                     for day, shift in self.valid_shifts)
            )

            # Count shifts by type for each employee (for fair distribution of shift types)
            # IMPORTANT: Morning count only includes Sunday-Thursday (days 0-4), NOT Friday (day 5)
            # This ensures the "at least 1 morning shift" constraint applies to weekdays only
            morning_shifts = [(d, s) for d, s in self.valid_shifts if s == 'morning' and d < 5]
            morning_count = self.model.NewIntVar(0, len(morning_shifts), f'morning_count_{emp_id}')
            self.employee_morning_counts[emp_id] = morning_count
            self.model.Add(
                morning_count == sum(self.x[(emp_id, d, s)] for d, s in morning_shifts)
            )

            # Evening count
            evening_shifts = [(d, s) for d, s in self.valid_shifts if s == 'evening']
            evening_count = self.model.NewIntVar(0, len(evening_shifts), f'evening_count_{emp_id}')
            if not hasattr(self, 'employee_evening_counts'):
                self.employee_evening_counts = {}
            self.employee_evening_counts[emp_id] = evening_count
            self.model.Add(
                evening_count == sum(self.x[(emp_id, d, s)] for d, s in evening_shifts)
            )

            # Night count
            night_shifts = [(d, s) for d, s in self.valid_shifts if s == 'night']
            night_count = self.model.NewIntVar(0, len(night_shifts), f'night_count_{emp_id}')
            if not hasattr(self, 'employee_night_counts'):
                self.employee_night_counts = {}
            self.employee_night_counts[emp_id] = night_count
            self.model.Add(
                night_count == sum(self.x[(emp_id, d, s)] for d, s in night_shifts)
            )

        # 3. 8-8 violations (evening→morning or night→evening)
        # These are SOFT CONSTRAINTS - we track them and penalize in objective function
        # This allows variety in shift types while still trying to minimize 8-8 patterns
        for emp_id in self.employee_ids:
            violations_88 = []

            for day in range(self.num_days - 1):
                # Evening today → morning tomorrow (8 hours rest - not ideal but allowed)
                evening_today = self.x.get((emp_id, day, 'evening'))
                morning_tomorrow = self.x.get((emp_id, day + 1, 'morning'))

                if evening_today is not None and morning_tomorrow is not None:
                    # Track for reporting and soft penalty
                    violation = self.model.NewBoolVar(f'violation_88_em_{emp_id}_d{day}')
                    self.model.AddBoolAnd([evening_today, morning_tomorrow]).OnlyEnforceIf(violation)
                    self.model.AddBoolOr([evening_today.Not(), morning_tomorrow.Not()]).OnlyEnforceIf(violation.Not())
                    violations_88.append(violation)

                # Night today → evening tomorrow (8 hours rest - not ideal but allowed)
                night_today = self.x.get((emp_id, day, 'night'))
                evening_tomorrow = self.x.get((emp_id, day + 1, 'evening'))

                if night_today is not None and evening_tomorrow is not None:
                    # Track for reporting and soft penalty
                    violation = self.model.NewBoolVar(f'violation_88_ne_{emp_id}_d{day}')
                    self.model.AddBoolAnd([night_today, evening_tomorrow]).OnlyEnforceIf(violation)
                    self.model.AddBoolOr([night_today.Not(), evening_tomorrow.Not()]).OnlyEnforceIf(violation.Not())
                    violations_88.append(violation)

            if violations_88:
                total_88 = self.model.NewIntVar(0, len(violations_88), f'total_88_{emp_id}')
                self.eight_eight_violations[emp_id] = total_88
                self.model.Add(total_88 == sum(violations_88))
            else:
                total_88 = self.model.NewIntVar(0, 0, f'total_88_{emp_id}')
                self.eight_eight_violations[emp_id] = total_88

        print(f"✓ Created 8-8 pattern tracking (SOFT constraint - penalized but allowed)", file=sys.stderr)

        # 4. 8-8-8 violations (3 consecutive shifts with 8-hour gaps)
        # ALL patterns that create problematic sequences must be detected!
        for emp_id in self.employee_ids:
            violations_888 = []

            for day in range(self.num_days - 2):
                # Pattern 1: night(day0) → evening(day1) → morning(day2)
                # This is the classic 8-8-8 across 3 days
                night_d0 = self.x.get((emp_id, day, 'night'))
                evening_d1 = self.x.get((emp_id, day + 1, 'evening'))
                morning_d2 = self.x.get((emp_id, day + 2, 'morning'))

                if night_d0 is not None and evening_d1 is not None and morning_d2 is not None:
                    violation = self.model.NewBoolVar(f'violation_888_nem_{emp_id}_d{day}')
                    self.model.AddBoolAnd([night_d0, evening_d1, morning_d2]).OnlyEnforceIf(violation)
                    self.model.AddBoolOr([night_d0.Not(), evening_d1.Not(), morning_d2.Not()]).OnlyEnforceIf(violation.Not())
                    violations_888.append(violation)

            # Pattern 2: morning(day0) → evening(day0) → night(day0) - same day all 3 shifts
            # This shouldn't happen due to "1 shift per day" constraint, but just in case

            # Pattern 3: Check consecutive day patterns with evening→morning (8-hour gap)
            for day in range(self.num_days - 1):
                # evening(day) → morning(day+1) is an 8-8 pattern
                # If preceded by morning(day), it's morning→evening→morning (8-8 chain)
                morning_d0 = self.x.get((emp_id, day, 'morning'))
                evening_d0 = self.x.get((emp_id, day, 'evening'))
                morning_d1 = self.x.get((emp_id, day + 1, 'morning'))

                if morning_d0 is not None and evening_d0 is not None and morning_d1 is not None:
                    # This would require 2 shifts on same day, which is forbidden
                    pass

                # night(day) → evening(day+1) is an 8-8 pattern
                # If followed by morning(day+2), it's the pattern we already check above

            if violations_888:
                total_888 = self.model.NewIntVar(0, len(violations_888), f'total_888_{emp_id}')
                self.eight_eight_eight_violations[emp_id] = total_888
                self.model.Add(total_888 == sum(violations_888))
            else:
                total_888 = self.model.NewIntVar(0, 0, f'total_888_{emp_id}')
                self.eight_eight_eight_violations[emp_id] = total_888

        # 5. Employee variety - each employee should have variety in shift types
        # This measures the gap between the most and least frequent shift type for EACH employee
        # Goal: prevent scenarios where one employee gets only mornings, another only evenings, etc.
        self.employee_variety_gaps = {}
        for emp_id in self.employee_ids:
            morning_count = self.employee_morning_counts[emp_id]
            evening_count = self.employee_evening_counts[emp_id]
            night_count = self.employee_night_counts[emp_id]

            # Max and min shift type count for this employee
            emp_max_type = self.model.NewIntVar(0, len(self.valid_shifts), f'emp_max_type_{emp_id}')
            emp_min_type = self.model.NewIntVar(0, len(self.valid_shifts), f'emp_min_type_{emp_id}')

            self.model.AddMaxEquality(emp_max_type, [morning_count, evening_count, night_count])
            self.model.AddMinEquality(emp_min_type, [morning_count, evening_count, night_count])

            # Gap = difference between most and least frequent shift type for this employee
            variety_gap = self.model.NewIntVar(0, len(self.valid_shifts), f'variety_gap_{emp_id}')
            self.model.Add(variety_gap == emp_max_type - emp_min_type)
            self.employee_variety_gaps[emp_id] = variety_gap

        print(f"✓ Created employee variety gap variables", file=sys.stderr)
        print(f"✓ Created auxiliary variables", file=sys.stderr)

    def solve_with_priorities(self) -> Tuple[bool, dict]:
        """
        Solve using lexicographic optimization (priority order)

        HARD CONSTRAINTS (MUST be satisfied):
        - Maximum 1 shift per employee per day
        - No morning after night shift
        - **ZERO 8-8-8 patterns allowed** (3 consecutive shifts with 8h gaps - FORBIDDEN!)
        - Employees on vacation/sick leave cannot be scheduled

        OPTIMIZATION PRIORITIES (highest to lowest):
        1. Minimize unfilled shifts (if someone available) - Weight: 1,000,000 (FIXED)
        2. Penalize >1 eight-eight per employee - Weight: 100,000 (RELAXED - allows more 8-8)
        3a. ⭐ EQUAL TOTAL SHIFTS ⭐ - Weight: 100,000 (FIXED - HEAVILY EMPHASIZED!)
            Minimize gap between employee with most/least TOTAL shifts
        3b. Ensure at least 1 morning per employee (if available) - Weight: 75,000 (FIXED)
        4a. Shift type balance between employees - Weight: 20,000 (RELAXED - 8-8 preferred over forced balance)
        4b. Minimize 8-8 patterns - Weight: 15,000 (RELAXED - 8-8 is acceptable)
        4c. Per-employee variety - Weight: 10,000 (RELAXED - not critical)
        5. Ensure minimum 3 shifts per employee (soft target) - Weight: ~100
        6. Random tie-breaking for variety (1000-3000 per assignment) - Creates different schedules

        SEARCH STRATEGY:
        - Uses 8 parallel workers for extensive exploration
        - Maximum 60 seconds search time
        - Explores many solutions to find the absolute best (not just first good one)

        Note: Fairness focuses on equal TOTAL shift count. Shift type balance (morning/evening/night)
        is a lower priority - allowing 8-8 patterns is preferred over forcing equal type distribution.
        """

        solver = cp_model.CpSolver() 

        # AGGRESSIVE SEARCH: Allow much more time to explore many solutions
        solver.parameters.max_time_in_seconds = 60.0  # Increased from 30s to 60s
        solver.parameters.log_search_progress = False

        # Enable extensive search to find the BEST solution
        solver.parameters.num_search_workers = 8  # Use multiple workers to explore in parallel
        solver.parameters.enumerate_all_solutions = False  # We want optimal, not all solutions

        # Add comprehensive randomization to get different schedules each time
        random_seed = int(time.time() * 1000) % 2147483647  # Use current time as seed
        solver.parameters.random_seed = random_seed

        # Enable aggressive randomization in search strategy
        solver.parameters.linearization_level = 0  # Disable linearization for more search
        solver.parameters.search_branching = cp_model.PORTFOLIO_SEARCH  # Try many strategies
        solver.parameters.cp_model_presolve = True
        solver.parameters.symmetry_level = 2  # Increased from 1 to 2 for more symmetry breaking

        # IMPORTANT: We want the OPTIMAL solution, not near-optimal
        # Remove the gap limits so solver keeps searching for the absolute best
        # solver.parameters.relative_gap_limit = 0.02  # REMOVED - we want true optimal
        # solver.parameters.absolute_gap_limit = 1000   # REMOVED - we want true optimal

        # Instead, improve search quality
        solver.parameters.cp_model_probing_level = 2  # More aggressive probing

        print(f"✓ Using random seed: {random_seed}", file=sys.stderr)

        # Objective 1: Minimize unfilled shifts (HIGHEST PRIORITY)
        total_unfilled = sum(self.shift_unfilled.values())

        # Objective 2: Minimize 8-8-8 violations
        total_888 = sum(self.eight_eight_eight_violations.values())

        # HARD CONSTRAINT: NO 8-8-8 patterns allowed AT ALL (STRICT!)
        # This is now a HARD constraint - if we can't achieve it, schedule fails
        # 8-8-8 means 3 consecutive shifts with 8-hour gaps (e.g., night→evening→morning)
        for emp_id in self.employee_ids:
            violation_count_888 = self.eight_eight_eight_violations[emp_id]
            self.model.Add(violation_count_888 == 0)  # HARD LIMIT: ZERO 8-8-8 patterns allowed!

        # SOFT CONSTRAINT: Minimize 8-8 patterns (but allow them when necessary for variety)
        # 8-8 means 2 consecutive shifts with only 8-hour gaps:
        # - evening(day) → morning(day+1): only 8 hours rest
        # - night(day) → evening(day+1): only 8 hours rest
        # With few employees (e.g., 3), forcing ZERO 8-8 patterns makes it impossible
        # to give each employee variety in shift types. So we allow 8-8 but penalize it.

        # LIMIT: Maximum 1 eight-eight pattern per employee (SOFT but heavily penalized if exceeded)
        # Count employees with more than 1 eight-eight pattern - this gets HUGE penalty
        employees_with_excess_88 = []
        for emp_id in self.employee_ids:
            excess_88 = self.model.NewBoolVar(f'excess_88_{emp_id}')
            emp_88_count = self.eight_eight_violations[emp_id]
            # excess_88 = 1 if employee has MORE than 1 eight-eight pattern
            self.model.Add(emp_88_count >= 2).OnlyEnforceIf(excess_88)
            self.model.Add(emp_88_count <= 1).OnlyEnforceIf(excess_88.Not())
            employees_with_excess_88.append(excess_88)
        total_excess_88 = sum(employees_with_excess_88)

        # For reporting: count total 8-8 violations
        total_88_count = sum(self.eight_eight_violations.values())

        # SOFT CONSTRAINT: Every employee SHOULD have at least 1 morning shift (if available)
        # IMPORTANT: Only count Sunday-Thursday (days 0-4) mornings, NOT Friday
        employees_without_morning = []
        for emp_id in self.employee_ids:
            # Check if employee submitted ANY morning as available on WEEKDAYS (Sun-Thu, days 0-4)
            has_morning_availability = any(
                self._is_employee_available(emp_id, day, 'morning')
                for day in range(5)  # Changed from self.num_days to 5 (only Sun-Thu)
                if (day, 'morning') in self.valid_shifts
            )

            if has_morning_availability:
                morning_count = self.employee_morning_counts[emp_id]
                # SOFT CONSTRAINT: Track employees without morning shifts for optimization penalty
                no_morning = self.model.NewBoolVar(f'no_morning_{emp_id}')
                self.model.Add(morning_count == 0).OnlyEnforceIf(no_morning)
                self.model.Add(morning_count >= 1).OnlyEnforceIf(no_morning.Not())
                employees_without_morning.append(no_morning)
        total_no_morning = sum(employees_without_morning) if employees_without_morning else 0
        print(f"✓ Morning shift: SOFT constraint (penalized in objective function)", file=sys.stderr)

        # Objective 5: Fairness - minimize gap between max and min shifts (TOTAL count)
        max_shifts = self.model.NewIntVar(0, len(self.valid_shifts), 'max_shifts')
        min_shifts = self.model.NewIntVar(0, len(self.valid_shifts), 'min_shifts')
        self.model.AddMaxEquality(max_shifts, list(self.employee_shift_counts.values()))
        self.model.AddMinEquality(min_shifts, list(self.employee_shift_counts.values()))
        fairness_gap = max_shifts - min_shifts

        # Objective 5b: Fairness by SHIFT TYPE - ensure variety for each employee
        # Minimize gap in morning shifts between employees
        morning_shift_counts = list(self.employee_morning_counts.values())
        if morning_shift_counts:
            max_morning = self.model.NewIntVar(0, len(self.valid_shifts), 'max_morning')
            min_morning = self.model.NewIntVar(0, len(self.valid_shifts), 'min_morning')
            self.model.AddMaxEquality(max_morning, morning_shift_counts)
            self.model.AddMinEquality(min_morning, morning_shift_counts)
            morning_fairness_gap = max_morning - min_morning
        else:
            morning_fairness_gap = 0

        # Minimize gap in evening shifts between employees
        evening_shift_counts = list(self.employee_evening_counts.values())
        if evening_shift_counts:
            max_evening = self.model.NewIntVar(0, len(self.valid_shifts), 'max_evening')
            min_evening = self.model.NewIntVar(0, len(self.valid_shifts), 'min_evening')
            self.model.AddMaxEquality(max_evening, evening_shift_counts)
            self.model.AddMinEquality(min_evening, evening_shift_counts)
            evening_fairness_gap = max_evening - min_evening
        else:
            evening_fairness_gap = 0

        # Minimize gap in night shifts between employees
        night_shift_counts = list(self.employee_night_counts.values())
        if night_shift_counts:
            max_night = self.model.NewIntVar(0, len(self.valid_shifts), 'max_night')
            min_night = self.model.NewIntVar(0, len(self.valid_shifts), 'min_night')
            self.model.AddMaxEquality(max_night, night_shift_counts)
            self.model.AddMinEquality(min_night, night_shift_counts)
            night_fairness_gap = max_night - min_night
        else:
            night_fairness_gap = 0

        # Total shift type fairness (sum of all three gaps)
        shift_type_fairness = morning_fairness_gap + evening_fairness_gap + night_fairness_gap

        # Objective 6: Employee variety penalty - sum of all employee variety gaps
        # This ensures each employee gets a MIX of shift types, not just one type
        total_variety_penalty = sum(self.employee_variety_gaps.values())

        # Objective 7: Employees with less than 3 shifts (soft constraint)
        employees_under_3 = []
        for emp_id in self.employee_ids:
            under_3 = self.model.NewBoolVar(f'under_3_{emp_id}')
            shift_count = self.employee_shift_counts[emp_id]
            self.model.Add(shift_count < 3).OnlyEnforceIf(under_3)
            self.model.Add(shift_count >= 3).OnlyEnforceIf(under_3.Not())
            employees_under_3.append(under_3)
        total_under_3 = sum(employees_under_3)

        # Randomize priority weights to generate different schedules each time
        # Keep critical constraints fixed, randomize lower priorities
        # This creates variety while maintaining schedule quality

        # Fixed priorities (must always be strict)
        weight_unfilled = 1000000      # Priority 1: NEVER compromise on filling shifts
        weight_excess_88 = 100000      # Priority 1b: Penalty for >1 eight-eight per employee (relaxed to allow more 8-8)
        weight_88 = 15000              # Priority 2: Avoid 8-8 patterns (relaxed - 8-8 is acceptable)

        # FAIRNESS: Equal TOTAL shifts is top priority, shift type balance is relaxed
        # Allowing more 8-8 patterns is preferable to forcing equal morning/evening/night distribution
        weight_fairness = 100000       # Priority 3a: EQUAL total shift count between employees (UNCHANGED)
        weight_shift_type_fairness = 20000  # Priority 3b: Shift type balance (RELAXED - 8-8 is preferred over forced balance)
        weight_variety = 10000         # Priority 3c: Per-employee mix (RELAXED - not critical)

        # Randomized lower priorities (±15% variation creates different "flavors")
        # These weights can vary without compromising critical constraints
        # Note: 8-8 patterns now HARD constraint (removed from objective)
        weight_morning = 75000                             # Priority 4: Morning shifts (FIXED - higher than fairness!)
        weight_min3 = random.randint(85, 115)              # Priority 5: Min 3 shifts (~100)

        # Add STRONG random tie-breaking to generate DIFFERENT schedules with same perfect score
        # These weights (1000-3000) are now strong enough to affect WHICH specific shifts
        # each employee gets, while still being weaker than fairness/8-8 constraints
        # This creates variety in the ASSIGNMENT ORDER while maintaining perfect scores
        random_weights = {}
        for emp_id in self.employee_ids:
            for day, shift in self.valid_shifts:
                if (emp_id, day, shift) in self.x:
                    random_weights[(emp_id, day, shift)] = random.randint(1000, 3000)

        tie_breaker = sum(
            self.x[(emp_id, day, shift)] * random_weights[(emp_id, day, shift)]
            for emp_id, day, shift in random_weights.keys()
        )

        # Weighted objective function (lexicographic priorities via large weight gaps)
        # Note: 8-8-8 patterns now HARD constraint (ZERO allowed!)
        # Note: 8-8 patterns - max 1 per employee allowed, more than 1 gets HUGE penalty
        # Critical constraints have fixed weights, lower priorities are randomized
        objective = (
            total_unfilled * weight_unfilled +           # Priority 1: No unfilled shifts (FIXED)
            total_excess_88 * weight_excess_88 +         # Priority 1b: HUGE penalty for >1 eight-eight per employee!
            total_88_count * weight_88 +                 # Priority 2: Minimize 8-8 patterns (allow up to 1 per employee)
            total_variety_penalty * weight_variety +     # Priority 3c: Each employee gets MIX of shift types!
            fairness_gap * weight_fairness +             # Priority 3a: EQUAL total shifts (FIXED - VERY HIGH!)
            shift_type_fairness * weight_shift_type_fairness +  # Priority 3b: VARIETY in shift types between employees
            total_no_morning * weight_morning +          # Priority 4: Everyone gets morning (FIXED - HIGH!)
            total_under_3 * weight_min3 +                # Priority 5: Min 3 shifts (RANDOMIZED)
            tie_breaker                                  # Priority 6: Random tie-breaking (larger weights)
        )

        print(f"✓ Priority weights - Excess88:100000 Fairness:100000 Morning:75000 ShiftTypeFairness:20000 8-8:15000 Variety:10000 Min3:{weight_min3}", file=sys.stderr)
        print(f"✓ 8-8-8 patterns: HARD CONSTRAINT (ZERO allowed!)", file=sys.stderr)
        print(f"✓ 8-8 patterns: Max 1 per employee allowed, >1 gets HUGE penalty (500,000)", file=sys.stderr)
        print(f"✓ Morning shift: SOFT constraint (penalized in objective function)", file=sys.stderr)

        self.model.Minimize(objective)

        print(f"✓ Solving with CP-SAT...", file=sys.stderr)
        status = solver.Solve(self.model)

        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"✓ Solution found! Status: {'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'}", file=sys.stderr)
            print(f"  Objective value: {solver.ObjectiveValue()}", file=sys.stderr)
            print(f"  Unfilled shifts: {solver.Value(total_unfilled)}", file=sys.stderr)
            print(f"  8-8-8 violations: {solver.Value(total_888)}", file=sys.stderr)
            print(f"  8-8 patterns (max 1 per employee): {solver.Value(total_88_count)}", file=sys.stderr)
            print(f"  Employees with >1 eight-eight: {solver.Value(total_excess_88)}", file=sys.stderr)
            print(f"  No morning: {solver.Value(total_no_morning) if employees_without_morning else 0}", file=sys.stderr)
            print(f"  Fairness gap (total shifts): {solver.Value(fairness_gap)}", file=sys.stderr)
            print(f"  Employee variety penalty (per-employee mix): {solver.Value(total_variety_penalty)}", file=sys.stderr)
            print(f"  Shift type fairness (morning/evening/night gaps): {solver.Value(shift_type_fairness)}", file=sys.stderr)
            if morning_shift_counts:
                print(f"    - Morning gap: {solver.Value(morning_fairness_gap)}", file=sys.stderr)
            if evening_shift_counts:
                print(f"    - Evening gap: {solver.Value(evening_fairness_gap)}", file=sys.stderr)
            if night_shift_counts:
                print(f"    - Night gap: {solver.Value(night_fairness_gap)}", file=sys.stderr)

            # Extract solution
            assignments = {}
            unfilled_shift_list = []

            for day in range(self.num_days):
                assignments[day] = {}
                for shift in self.shifts:
                    assignments[day][shift] = None

                    for emp_id in self.employee_ids:
                        if (emp_id, day, shift) in self.x:
                            if solver.Value(self.x[(emp_id, day, shift)]) == 1:
                                assignments[day][shift] = emp_id
                                break

                    # Check if this shift was left unfilled
                    if assignments[day][shift] is None and (day, shift) in self.valid_shifts:
                        date = self._get_date_for_day(day)
                        unfilled_shift_list.append(f"Day {day} ({date}) {shift}")

            # Report any unfilled shifts
            if unfilled_shift_list:
                print(f"\n⚠️  WARNING: {len(unfilled_shift_list)} shifts were left UNFILLED:", file=sys.stderr)
                for unfilled in unfilled_shift_list:
                    print(f"   - {unfilled}", file=sys.stderr)
            else:
                print(f"\n✅ All shifts successfully filled!", file=sys.stderr)

            # Calculate statistics
            stats = {
                'objective_value': solver.ObjectiveValue(),
                'unfilled_shifts': solver.Value(total_unfilled),
                'eight_eight_eight_violations': solver.Value(total_888),
                'eight_eight_patterns': solver.Value(total_88_count),  # Total 8-8 patterns
                'employees_with_excess_88': solver.Value(total_excess_88),  # Employees with >1 eight-eight
                'employees_without_morning': solver.Value(total_no_morning) if employees_without_morning else 0,
                'fairness_gap': solver.Value(fairness_gap),
                'variety_penalty': solver.Value(total_variety_penalty),  # Per-employee shift type variety
                'shift_type_fairness': solver.Value(shift_type_fairness),
                'employees_under_3_shifts': solver.Value(total_under_3),
                'solve_time_seconds': solver.WallTime(),
                'employee_shift_counts': {
                    emp_id: solver.Value(self.employee_shift_counts[emp_id])
                    for emp_id in self.employee_ids
                }
            }

            return True, {'assignments': assignments, 'stats': stats}

        elif status == cp_model.INFEASIBLE:
            print(f"✗ Problem is INFEASIBLE - no solution exists", file=sys.stderr)
            return False, {'error': 'INFEASIBLE', 'message': 'No solution exists with given constraints'}

        else:
            print(f"✗ Solver failed with status: {status}", file=sys.stderr)
            return False, {'error': 'UNKNOWN', 'message': f'Solver status: {status}'}


def main():
    """Main entry point - reads JSON from stdin, solves, outputs JSON to stdout"""
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)

        # Validate input
        required_fields = ['employees', 'weekStart']
        for field in required_fields:
            if field not in input_data:
                raise ValueError(f"Missing required field: {field}")

        print(f"✓ Received input: {len(input_data['employees'])} employees, week {input_data['weekStart']}", file=sys.stderr)

        # Build and solve model
        model = ShiftSchedulingModel(input_data)
        model.add_hard_constraints()
        model.create_auxiliary_variables()

        success, result = model.solve_with_priorities()

        # Output result
        output = {
            'success': success,
            'result': result
        }

        print(json.dumps(output, indent=2))
        sys.exit(0 if success else 1)

    except Exception as e:
        print(f"✗ Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)

        output = {
            'success': False,
            'result': {
                'error': 'EXCEPTION',
                'message': str(e)
            }
        }
        print(json.dumps(output, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()


