import { spawn } from 'child_process';
import * as path from 'path';

interface ORToolsInput {
  employees: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  availabilities: Array<{
    employeeId: string;
    weekStart: string;
    shifts: {
      [day: string]: {
        [shiftId: string]: {
          status: 'available' | 'unavailable';
          comment?: string;
        };
      };
    };
  }>;
  vacations: Array<{
    id: string;
    employeeId: string;
    date: string;
    type: 'vacation' | 'sick';
  }>;
  holidays: Array<{
    id: string;
    date: string;
    name: string;
    type: 'no-work' | 'morning-only';
  }>;
  weekStart: string;
}

interface ORToolsOutput {
  success: boolean;
  result: {
    assignments?: {
      [day: string]: {
        [shiftId: string]: string | null;
      };
    };
    stats?: {
      objective_value: number;
      unfilled_shifts: number;
      eight_eight_eight_violations: number;
      excess_eight_eight: number;
      employees_without_morning: number;
      fairness_gap: number;
      employees_under_3_shifts: number;
      solve_time_seconds: number;
      employee_shift_counts: {
        [employeeId: string]: number;
      };
    };
    error?: string;
    message?: string;
  };
}

/**
 * Calls the Python OR-Tools solver to generate optimized shift schedule
 */
export async function solveWithORTools(
  input: ORToolsInput,
  timeoutMs: number = 60000
): Promise<ORToolsOutput> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'optimize_schedule.py');

    console.log(`[OR-Tools] Starting solver with script: ${scriptPath}`);
    console.log(`[OR-Tools] Input: ${input.employees.length} employees, week ${input.weekStart}`);

    // Spawn Python process
    const python = spawn('python', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';
    let isResolved = false;

    // Set timeout
    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        python.kill('SIGTERM');
        reject(new Error(`OR-Tools solver timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    // Collect stdout
    python.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    // Collect stderr (logging)
    python.stderr.on('data', (data) => {
      const message = data.toString();
      stderrData += message;
      // Forward Python logs to Node console
      console.log(`[OR-Tools] ${message.trim()}`);
    });

    // Handle process completion
    python.on('close', (code) => {
      clearTimeout(timer);

      if (isResolved) {
        return; // Already resolved (timeout)
      }

      isResolved = true;

      if (code === 0) {
        try {
          const output: ORToolsOutput = JSON.parse(stdoutData);
          console.log(`[OR-Tools] Solver succeeded`);
          if (output.result.stats) {
            console.log(`[OR-Tools] Solve time: ${output.result.stats.solve_time_seconds.toFixed(3)}s`);
            console.log(`[OR-Tools] Objective: ${output.result.stats.objective_value}`);
          }
          resolve(output);
        } catch (err) {
          reject(new Error(`Failed to parse OR-Tools output: ${err}\nOutput: ${stdoutData}`));
        }
      } else {
        console.error(`[OR-Tools] Solver failed with code ${code}`);
        console.error(`[OR-Tools] stderr: ${stderrData}`);

        // Try to parse output even on failure (might contain error info)
        try {
          const output: ORToolsOutput = JSON.parse(stdoutData);
          resolve(output);
        } catch (err) {
          reject(new Error(`OR-Tools solver failed with code ${code}\nstderr: ${stderrData}`));
        }
      }
    });

    // Handle process errors
    python.on('error', (err) => {
      clearTimeout(timer);

      if (!isResolved) {
        isResolved = true;
        console.error(`[OR-Tools] Process error:`, err);
        reject(new Error(`Failed to start Python process: ${err.message}`));
      }
    });

    // Send input to Python via stdin
    try {
      python.stdin.write(JSON.stringify(input));
      python.stdin.end();
    } catch (err) {
      clearTimeout(timer);
      if (!isResolved) {
        isResolved = true;
        reject(new Error(`Failed to write input to Python: ${err}`));
      }
    }
  });
}

/**
 * Generate warnings based on solver statistics
 */
export function generateWarningsFromStats(
  stats: ORToolsOutput['result']['stats'],
  employees: ORToolsInput['employees']
): string[] {
  const warnings: string[] = [];

  if (!stats) {
    return warnings;
  }

  // Unfilled shifts
  if (stats.unfilled_shifts > 0) {
    warnings.push(`⚠️ ${stats.unfilled_shifts} משמרות נותרו ללא שיבוץ (אף עובד לא היה זמין)`);
  }

  // 8-8-8 violations
  if (stats.eight_eight_eight_violations > 0) {
    warnings.push(`⚠️ נוצרו ${stats.eight_eight_eight_violations} משמרות 8-8-8 (3 משמרות רצופות) - מומלץ לבדוק`);
  }

  // Excess 8-8 (more than 1 per employee)
  if (stats.excess_eight_eight > 0) {
    warnings.push(`⚠️ ${stats.excess_eight_eight} עובדים קיבלו יותר ממשמרת 8-8 אחת`);
  }

  // No morning shifts
  if (stats.employees_without_morning > 0) {
    warnings.push(`⚠️ ${stats.employees_without_morning} עובדים לא קיבלו משמרת בוקר`);
  }

  // Under 3 shifts
  if (stats.employees_under_3_shifts > 0) {
    warnings.push(`⚠️ ${stats.employees_under_3_shifts} עובדים קיבלו פחות מ-3 משמרות`);
  }

  // Fairness gap
  if (stats.fairness_gap > 2) {
    warnings.push(`⚠️ פער הוגנות: ${stats.fairness_gap} משמרות בין העובד עם הכי הרבה לעובד עם הכי מעט`);
  }

  // Per-employee details
  const employeeMap = new Map(employees.map(e => [e.id, e.name]));
  for (const [empId, count] of Object.entries(stats.employee_shift_counts)) {
    const name = employeeMap.get(empId) || empId;
    if (count === 0) {
      warnings.push(`ℹ️ העובד ${name} לא קיבל שום משמרת`);
    } else if (count < 3) {
      warnings.push(`ℹ️ העובד ${name} קיבל רק ${count} משמרות`);
    }
  }

  return warnings;
}
