import { useEffect, useState } from 'react';

const formatHourPeru = (isoValue, fallback = '—') => {
  if (!isoValue) return fallback;
  const normalized = String(isoValue).includes('T') ? String(isoValue) : String(isoValue).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(date);
};

const formatDateLabelEsPe = (dateValue) => {
  if (!dateValue) return '—';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(date);
};

/**
 * DayAttendanceModal - Shows all attendance records for a specific date.
 * Displayed when a day is clicked in the General calendar view.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.date - YYYY-MM-DD format
 */
export default function DayAttendanceModal({ isOpen, onClose, date }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !date) return;

    setLoading(true);
    setError(null);

    fetch(`/api/asistenciakrsft/day-attendance?date=${date}`)
      .then((response) => {
        if (!response.ok) throw new Error('Error fetching attendance');
        return response.json();
      })
      .then((result) => {
        if (result.success) {
          setRecords(result.data || []);
        } else {
          setError(result.message || 'Error loading records');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error loading records');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, date]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-content-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dayAttendanceModalTitle"
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-lg"
        onClick={(e) => { e.stopPropagation(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <h2 id="dayAttendanceModalTitle" className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Registros del Día
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{formatDateLabelEsPe(date)}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading && (
            <div className="py-8 text-center text-sm text-gray-500">Cargando registros...</div>
          )}

          {error && (
            <div className="rounded-md border border-red-100 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && records.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No hay registros para este día.
            </div>
          )}

          {!loading && !error && records.length > 0 && (
            <div className="space-y-3">
              {records.map((record, index) => (
                <div
                  key={record.id || index}
                  className="flex items-center justify-between rounded-lg border border-teal-100 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar placeholder */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                      {(record.trabajador_nombre || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{record.trabajador_nombre || 'Sin nombre'}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {record.dni || '—'} · {record.cargo || 'Sin cargo'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-gray-500">
                      {formatHourPeru(record.captured_at, record.hora_entrada || '—')} → {formatHourPeru(record.check_out_at, record.hora_salida || '—')}
                    </p>
                    <p className="text-[13px] font-bold text-teal-700 mt-0.5">
                      {record.worked_time || 'En jornada'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}