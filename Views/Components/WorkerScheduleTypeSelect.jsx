import { useCallback, useState, useEffect } from 'react';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

export default function WorkerScheduleTypeSelect({ workerId, currentTypeId, onSelect, onConfirm, loading = false }) {
  const [scheduleTypes, setScheduleTypes] = useState([]);
  const [selected, setSelected] = useState(currentTypeId || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/asistenciakrsft/schedule-types')
        .then((r) => r.json())
        .then((result) => {
          if (result.success) {
            setScheduleTypes(result.data || []);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const handleChange = (e) => {
    const val = e.target.value;
    setSelected(val);
    onSelect?.(val ? Number(val) : null);
  };

  const handleConfirm = () => {
    if (selected && selected !== String(currentTypeId)) {
      onConfirm?.();
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setSelected(currentTypeId || '');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Cambiar
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <select
        value={selected}
        onChange={handleChange}
        className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        disabled={loading}
      >
        <option value="">— Sin asignar —</option>
        {scheduleTypes.map((st) => (
          <option key={st.id} value={st.id}>
            {st.name}
          </option>
        ))}
      </select>

      {loading ? (
        <svg className="size-4 animate-spin text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          <button
            onClick={handleConfirm}
            disabled={!selected || selected === String(currentTypeId)}
            className="inline-flex items-center justify-center rounded bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ok
          </button>
          <button
            onClick={handleCancel}
            className="inline-flex items-center justify-center rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
