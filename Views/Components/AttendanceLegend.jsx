/**
 * AttendanceLegend - Shows the color legend for attendance day indicators.
 * Only renders when a worker is selected.
 *
 * @param {object} props
 * @param {object|null} props.selectedWorker
 */
export default function AttendanceLegend({ selectedWorker }) {
  if (!selectedWorker) {
    return null;
  }

  const items = [
    { status: 'complete', color: '#22c55e', label: 'Jornada completa' },
    { status: 'partial', color: '#eab308', label: 'Salida temprana' },
    { status: 'absent', color: '#ef4444', label: 'No trabajó' },
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      {items.map(({ status, color, label }) => (
        <div key={status} className="flex items-center gap-1.5">
          <span
            style={{
              display: 'block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
          <span className="text-[11px] text-gray-600">{label}</span>
        </div>
      ))}
    </div>
  );
}
