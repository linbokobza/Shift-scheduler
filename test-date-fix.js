#!/usr/bin/env node

/**
 * Test script to verify timezone-aware date formatting
 * This tests that vacation dates are correctly formatted regardless of timezone
 */

// Simulate the formatDate function from backend
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Test 1: Create a date for November 18, 2025 in local timezone
console.log('\n=== TEST: Date Formatting Fix ===\n');

const testDate = new Date(2025, 10, 18); // November 18, 2025 (local time)
console.log('Test Date (local): November 18, 2025');
console.log(`JavaScript Date object: ${testDate}`);
console.log(`ISO String (UTC): ${testDate.toISOString()}`);

// OLD WAY (BROKEN) - using toISOString().split('T')[0]
const oldWayFormat = testDate.toISOString().split('T')[0];
console.log(`\n❌ OLD WAY (using toISOString): ${oldWayFormat}`);
if (oldWayFormat !== '2025-11-18') {
  console.log(`   WARNING: Date shifted! Expected 2025-11-18, got ${oldWayFormat}`);
}

// NEW WAY (FIXED) - using formatDate with local timezone
const newWayFormat = formatDate(testDate);
console.log(`\n✅ NEW WAY (using formatDate): ${newWayFormat}`);
if (newWayFormat === '2025-11-18') {
  console.log(`   SUCCESS: Date is correct! (2025-11-18)`);
} else {
  console.log(`   ERROR: Expected 2025-11-18, got ${newWayFormat}`);
}

// Test 2: Test with parseLocalDate + formatDate round trip
function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

console.log('\n=== TEST: Round-trip (String -> Date -> String) ===\n');

const inputString = '2025-11-18';
const parsedDate = parseLocalDate(inputString);
const formattedString = formatDate(parsedDate);

console.log(`Input:    ${inputString}`);
console.log(`Parsed:   ${parsedDate}`);
console.log(`Formatted: ${formattedString}`);

if (inputString === formattedString) {
  console.log(`✅ SUCCESS: Round-trip successful!`);
} else {
  console.log(`❌ FAILED: Round-trip failed! Expected ${inputString}, got ${formattedString}`);
}

// Test 3: Simulate what happens in MongoDB + Python
console.log('\n=== TEST: MongoDB + Python Script Scenario ===\n');

const vacationDate = new Date(2025, 10, 18); // User enters 18.11
console.log('1. Frontend: User enters 18.11 (November 18, 2025)');
console.log(`   Sent to backend: "2025-11-18"`);

console.log('\n2. Backend stores in MongoDB as Date object');
console.log(`   MongoDB stores: Date(${vacationDate.getTime()})`);

console.log('\n3. Backend retrieves from MongoDB and sends to Python');
const pythonDateString = formatDate(vacationDate);
console.log(`   Sent to Python: "${pythonDateString}"`);

if (pythonDateString === '2025-11-18') {
  console.log(`   ✅ SUCCESS: Python receives correct date (2025-11-18)`);
} else {
  console.log(`   ❌ FAILED: Python receives wrong date (${pythonDateString})`);
}

console.log('\n=== All tests completed ===\n');
