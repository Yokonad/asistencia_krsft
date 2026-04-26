/**
 * Attendance status color constants and calculation utilities
 * for calendar day indicators.
 */

export const ATTENDANCE_COLORS = {
  complete: '#22c55e',   // green
  partial: '#eab308',   // yellow
  absent: '#ef4444',    // red
  neutral: '#9ca3af',   // gray
};

/**
 * Calculate the attendance status for a specific day.
 *
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {object|null} dayData - { worked_minutes, has_record, expected_minutes, schedule_type_name }
 * @returns {'complete'|'partial'|'absent'|'neutral'}
 */
export function calculateDayStatus(dateString, dayData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateString}T00:00:00`);

  // Future date → neutral
  if (date > today) {
    return 'neutral';
  }

  // Weekend (Sat=6, Sun=7) → neutral
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'neutral';
  }

  // No worker selected or no day data → neutral
  if (!dayData) {
    return 'neutral';
  }

  // No schedule type assigned → neutral
  if (dayData.expected_minutes === null || dayData.expected_minutes === undefined) {
    return 'neutral';
  }

  const expectedMinutes = dayData.expected_minutes;
  const workedMinutes = dayData.worked_minutes ?? 0;

  // No attendance record → absent (only for past weekdays)
  if (!dayData.has_record) {
    return 'absent';
  }

  // Complete: worked >= expected - 15 (tolerance)
  if (workedMinutes >= expectedMinutes - 15) {
    return 'complete';
  }

  // Partial: worked > 0 and worked < expected - 15
  if (workedMinutes > 0 && workedMinutes < expectedMinutes - 15) {
    return 'partial';
  }

  // Fallback: no record but technically 0 worked
  if (workedMinutes === 0) {
    return 'absent';
  }

  return 'neutral';
}

/**
 * Get the hex color for a given status.
 *
 * @param {'complete'|'partial'|'absent'|'neutral'|null} status
 * @returns {string}
 */
export function getStatusColor(status) {
  return ATTENDANCE_COLORS[status] ?? ATTENDANCE_COLORS.neutral;
}
