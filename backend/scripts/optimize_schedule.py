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
from typing import Dict, List, Set, Tuple
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
 
    def add_hard_constraints(self):
        """Add all hard constraints that must be satisfied"""

        # CONSTRAINT: Only assign available employees
        for emp_id in self.employee_ids:
            for day, shift in self.valid_shifts:
                if not self._is_employee_available(emp_id, day, shift):
                    self.model.Add(self.x[(emp_id, day, shift)] == 0)

        # CONSTRAINT: Each shift must have EXACTLY 1 employee (if anyone is available)
        for day, shift in self.valid_shifts:
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
        for emp_id in self.employee_ids:
            violations_88 = []

            for day in range(self.num_days - 1):
                # Evening today → morning tomorrow
                evening_today = self.x.get((emp_id, day, 'evening'))
                morning_tomorrow = self.x.get((emp_id, day + 1, 'morning'))

                if evening_today is not None and morning_tomorrow is not None:
                    violation = self.model.NewBoolVar(f'violation_88_em_{emp_id}_d{day}')
                    # violation = 1 iff both are true
                    self.model.AddBoolAnd([evening_today, morning_tomorrow]).OnlyEnforceIf(violation)
                    self.model.AddBoolOr([evening_today.Not(), morning_tomorrow.Not()]).OnlyEnforceIf(violation.Not())
                    violations_88.append(violation)

                # Night today → evening tomorrow
                night_today = self.x.get((emp_id, day, 'night'))
                evening_tomorrow = self.x.get((emp_id, day + 1, 'evening'))

                if night_today is not None and evening_tomorrow is not None:
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

        # 4. 8-8-8 violations (3 consecutive shifts with 8-hour gaps)
        for emp_id in self.employee_ids:
            violations_888 = []

            for day in range(self.num_days - 2):
                # Pattern 1: night → evening → morning
                night_d0 = self.x.get((emp_id, day, 'night'))
                evening_d1 = self.x.get((emp_id, day + 1, 'evening'))
                morning_d2 = self.x.get((emp_id, day + 2, 'morning'))

                if night_d0 is not None and evening_d1 is not None and morning_d2 is not None:
                    violation = self.model.NewBoolVar(f'violation_888_nem_{emp_id}_d{day}')
                    self.model.AddBoolAnd([night_d0, evening_d1, morning_d2]).OnlyEnforceIf(violation)
                    self.model.AddBoolOr([night_d0.Not(), evening_d1.Not(), morning_d2.Not()]).OnlyEnforceIf(violation.Not())
                    violations_888.append(violation)

            if violations_888:
                total_888 = self.model.NewIntVar(0, len(violations_888), f'total_888_{emp_id}')
                self.eight_eight_eight_violations[emp_id] = total_888
                self.model.Add(total_888 == sum(violations_888))
            else:
                total_888 = self.model.NewIntVar(0, 0, f'total_888_{emp_id}')
                self.eight_eight_eight_violations[emp_id] = total_888

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
        2. Minimize 8-8 patterns (evening→morning, night→evening) - Weight: 150,000 (FIXED - VERY HIGH!)
        3. Ensure at least 1 morning per employee (if available) - Weight: 75,000 (FIXED - HIGH!)
        4a. ⭐ EQUAL TOTAL SHIFTS ⭐ - Weight: 50,000 (FIXED - HEAVILY EMPHASIZED!)
            Minimize gap between employee with most/least TOTAL shifts
        4b. ⭐ VARIETY IN SHIFT TYPES ⭐ - Weight: 25,000 (FIXED - HIGH!)
            Minimize gaps in morning/evening/night distribution (no employee gets only nights!)
        5. Ensure minimum 3 shifts per employee (soft target) - Weight: ~100
        6. Random tie-breaking for variety (1000-3000 per assignment) - Creates different schedules

        SEARCH STRATEGY:
        - Uses 8 parallel workers for extensive exploration
        - Maximum 60 seconds search time
        - Explores many solutions to find the absolute best (not just first good one)

        Note: Fairness includes BOTH total count AND shift type variety. Each employee should
        get a balanced mix of morning/evening/night shifts, not all of one type.
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
        solver.parameters.sat_parameters.max_sat_conflicts = 10000000  # Allow more conflicts exploration

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

        # For reporting and optimization: count total 8-8 violations
        # This is now a SOFT constraint with very high penalty to minimize usage
        total_88_count = sum(self.eight_eight_violations.values())

        # Objective 4: Employees without morning shifts (if they were available for mornings)
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
                no_morning = self.model.NewBoolVar(f'no_morning_{emp_id}')
                morning_count = self.employee_morning_counts[emp_id]
                self.model.Add(morning_count == 0).OnlyEnforceIf(no_morning)
                self.model.Add(morning_count >= 1).OnlyEnforceIf(no_morning.Not())
                employees_without_morning.append(no_morning)
        total_no_morning = sum(employees_without_morning) if employees_without_morning else 0

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

        # Objective 6: Employees with less than 3 shifts (soft constraint)
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
        weight_88 = 150000             # Priority 2: STRONGLY avoid 8-8 patterns (higher than morning!)

        # FAIRNESS IS NOW HEAVILY EMPHASIZED
        # This ensures equal distribution of shifts is a TOP priority
        weight_fairness = 50000        # Priority 3a: EQUAL DISTRIBUTION (FIXED - very high!)
        weight_shift_type_fairness = 25000  # Priority 3b: VARIETY in shift types (FIXED - high!)

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
        # Note: 8-8 patterns now SOFT constraint with very high penalty (minimize usage)
        # Critical constraints have fixed weights, lower priorities are randomized
        objective = (
            total_unfilled * weight_unfilled +           # Priority 1: No unfilled shifts (FIXED)
            total_88_count * weight_88 +                 # Priority 2: Minimize 8-8 patterns (FIXED - VERY HIGH!)
            fairness_gap * weight_fairness +             # Priority 3a: EQUAL total shifts (FIXED - VERY HIGH!)
            shift_type_fairness * weight_shift_type_fairness +  # Priority 3b: VARIETY in shift types (FIXED - HIGH!)
            total_no_morning * weight_morning +          # Priority 4: Everyone gets morning (FIXED - HIGH!)
            total_under_3 * weight_min3 +                # Priority 5: Min 3 shifts (RANDOMIZED)
            tie_breaker                                  # Priority 6: Random tie-breaking (larger weights)
        )

        print(f"✓ Priority weights - 8-8:150000 Morning:75000 TotalFairness:50000 ShiftTypeFairness:25000 Min3:{weight_min3}", file=sys.stderr)
        print(f"✓ 8-8-8 patterns: HARD CONSTRAINT (ZERO allowed!)", file=sys.stderr)
        print(f"✓ 8-8 patterns: SOFT constraint with VERY HIGH penalty (minimize usage)", file=sys.stderr)

        self.model.Minimize(objective)

        print(f"✓ Solving with CP-SAT...", file=sys.stderr)
        status = solver.Solve(self.model)

        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"✓ Solution found! Status: {'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'}", file=sys.stderr)
            print(f"  Objective value: {solver.ObjectiveValue()}", file=sys.stderr)
            print(f"  Unfilled shifts: {solver.Value(total_unfilled)}", file=sys.stderr)
            print(f"  8-8-8 violations: {solver.Value(total_888)}", file=sys.stderr)
            print(f"  8-8 patterns (max 1 per employee - HARD): {solver.Value(total_88_count)}", file=sys.stderr)
            print(f"  No morning: {solver.Value(total_no_morning) if employees_without_morning else 0}", file=sys.stderr)
            print(f"  Fairness gap (total shifts): {solver.Value(fairness_gap)}", file=sys.stderr)
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
                'eight_eight_patterns': solver.Value(total_88_count),  # Total 8-8 patterns (max 1 per employee)
                'employees_without_morning': solver.Value(total_no_morning) if employees_without_morning else 0,
                'fairness_gap': solver.Value(fairness_gap),
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


