import { useMemo } from 'react';
import { PickerDay } from '@mui/x-date-pickers/PickerDay';
import { calculateDayStatus } from '../utils/attendanceStatus';

/**
 * Custom day renderer that shows attendance status dot below the day number.
 * Used by WorkerCalendar to display colored dots for each day.
 *
 * @param {object} props
 * @param {object} props.day - dayjs day object
 * @param {Array} props.workerAttendanceSummary - array of { date, worked_minutes, has_record }
 * @param {object|null} props.selectedWorker - selected worker object
 */
export default function CustomDay({ day, _selectedDays, _outsideMonthlyContainer, inMonth, workerAttendanceSummary, selectedWorker, ...pickersProps }) {
  const dateStr = day.format('YYYY-MM-DD');

  const dayStatus = useMemo(() => {
    if (!selectedWorker || !workerAttendanceSummary || workerAttendanceSummary.length === 0) {
      return null;
    }
    const dayData = workerAttendanceSummary.find(d => d.date === dateStr);
    return calculateDayStatus(dateStr, dayData);
  }, [dateStr, workerAttendanceSummary, selectedWorker]);

  const colorMap = {
    complete: '#22c55e',
    partial: '#eab308',
    absent: '#ef4444',
    neutral: 'transparent',
  };
  const dotColor = dayStatus ? colorMap[dayStatus] : 'transparent';

  return (
    <PickerDay
      {...pickersProps}
      day={day}
      inMonth={inMonth}
      sx={{
        ...pickersProps.sx,
        position: 'relative',
        '&::after': dayStatus && dayStatus !== 'neutral' ? {
          content: '""',
          position: 'absolute',
          bottom: '2px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
        } : {},
      }}
    />
  );
}