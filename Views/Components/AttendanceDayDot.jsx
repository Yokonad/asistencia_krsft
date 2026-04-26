/**
 * AttendanceDayDot - Small colored dot rendered below a calendar day number.
 *
 * @param {object} props
 * @param {'complete'|'partial'|'absent'|'neutral'|null} props.status
 */
export default function AttendanceDayDot({ status }) {
  if (!status || status === 'neutral') {
    return null;
  }

  const colorMap = {
    complete: '#22c55e',
    partial: '#eab308',
    absent: '#ef4444',
  };

  const color = colorMap[status] || colorMap.neutral;

  return (
    <span
      style={{
        display: 'block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        margin: '2px auto 0',
      }}
      aria-label={status}
    />
  );
}
