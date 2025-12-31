#!/usr/bin/env node

// Debug script to analyze the date ranges and understand the dashboard discrepancy

const today = new Date('2025-12-31T11:00:00.000Z'); // Using the current time from the system

console.log('=== DASHBOARD DATE ANALYSIS ===\n');
console.log('Current Date:', today.toISOString().split('T')[0]);
console.log('Current Date (local):', today.toLocaleDateString());
console.log('Day of week:', today.getDay(), '(0=Sunday, 1=Monday, ..., 6=Saturday)');
console.log('');

// Calculate weekly range
const weekStart = new Date(today);
weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

console.log('=== WEEKLY PERIOD ===');
console.log('Week Start:', weekStart.toISOString().split('T')[0], '(' + weekStart.toLocaleDateString() + ')');
console.log('Week End:', weekEnd.toISOString().split('T')[0], '(' + weekEnd.toLocaleDateString() + ')');
console.log('Days in week:', getDateArray(weekStart, weekEnd).length);
console.log('Week days:', getDateArray(weekStart, weekEnd).map(d => d.toLocaleDateString()));
console.log('');

// Calculate monthly range
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

console.log('=== MONTHLY PERIOD ===');
console.log('Month Start:', monthStart.toISOString().split('T')[0], '(' + monthStart.toLocaleDateString() + ')');
console.log('Month End:', monthEnd.toISOString().split('T')[0], '(' + monthEnd.toLocaleDateString() + ')');
console.log('Days in month:', getDateArray(monthStart, monthEnd).length);
console.log('');

// Find overlap
const overlapStart = weekStart > monthStart ? weekStart : monthStart;
const overlapEnd = weekEnd < monthEnd ? weekEnd : monthEnd;

console.log('=== OVERLAP ANALYSIS ===');
if (overlapStart <= overlapEnd) {
  const overlapDays = getDateArray(overlapStart, overlapEnd);
  console.log('Overlap period:', overlapStart.toLocaleDateString(), '-', overlapEnd.toLocaleDateString());
  console.log('Overlap days:', overlapDays.length);
  console.log('Overlap dates:', overlapDays.map(d => d.toLocaleDateString()));
  
  // Calculate what should be in weekly but not in monthly
  const weeklyOnlyDays = getDateArray(weekStart, weekEnd).filter(d => d < monthStart || d > monthEnd);
  const monthlyOnlyDays = getDateArray(monthStart, monthEnd).filter(d => d < weekStart || d > weekEnd);
  
  console.log('');
  console.log('Weekly only days (not in monthly):', weeklyOnlyDays.map(d => d.toLocaleDateString()));
  console.log('Monthly only days (not in weekly):', monthlyOnlyDays.map(d => d.toLocaleDateString()));
} else {
  console.log('No overlap between weekly and monthly periods!');
}
console.log('');

// Data consistency check
console.log('=== DATA CONSISTENCY CHECK ===');
console.log('Monthly data:');
console.log('  Total Sales: ₹120,660');
console.log('  Total Bills: 24');
console.log('  Expected Average: ₹120,660 ÷ 24 = ₹5,027.50');
console.log('');
console.log('Weekly data:');
console.log('  Total Sales: ₹160,210');
console.log('  Total Bills: 29');
console.log('  Expected Average: ₹160,210 ÷ 29 = ₹5,524.48');
console.log('');
console.log('Today data:');
console.log('  Total Sales: ₹39,550');
console.log('  Total Bills: 5');
console.log('  Expected Average: ₹39,550 ÷ 5 = ₹7,910.00');
console.log('');

// Cross-check calculations
console.log('=== CROSS-CHECK ===');
const monthlyTotal = 120660;
const monthlyBills = 24;
const weeklyTotal = 160210;
const weeklyBills = 29;
const todayTotal = 39550;
const todayBills = 5;

console.log('Monthly calculation:', monthlyTotal, '÷', monthlyBills, '=', (monthlyTotal / monthlyBills).toFixed(2));
console.log('Weekly calculation:', weeklyTotal, '÷', weeklyBills, '=', (weeklyTotal / weeklyBills).toFixed(2));
console.log('Today calculation:', todayTotal, '÷', todayBills, '=', (todayTotal / todayBills).toFixed(2));

// Check if weekly includes today
const todayInWeekly = weekStart <= today && today <= weekEnd;
const todayInMonthly = monthStart <= today && today <= monthEnd;

console.log('');
console.log('Today in Weekly period:', todayInWeekly);
console.log('Today in Monthly period:', todayInMonthly);

if (todayInWeekly && todayInMonthly) {
  console.log('Today is included in both periods');
  const weeklyWithoutToday = weeklyTotal - todayTotal;
  const billsWithoutToday = weeklyBills - todayBills;
  console.log('Weekly without today:', weeklyWithoutToday, '÷', billsWithoutToday, '=', (weeklyWithoutToday / billsWithoutToday).toFixed(2));
}

function getDateArray(start, end) {
  const dates = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}