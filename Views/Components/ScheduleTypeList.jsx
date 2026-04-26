import { useCallback, useState, useEffect } from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

export default function ScheduleTypeList({ onEdit, refreshTrigger = 0 }) {
  const [scheduleTypes, setScheduleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, name: '' });
  const [deleting, setDeleting] = useState(false);

  const loadScheduleTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/asistenciakrsft/schedule-types');
      const result = await response.json();
      if (result.success) {
        setScheduleTypes(result.data || []);
        setError(null);
      } else {
        setError(result.message || 'Error al cargar tipos de jornada');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadScheduleTypes();
  }, [loadScheduleTypes, refreshTrigger]);

  const handleDelete = useCallback(async (id) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/asistenciakrsft/schedule-types/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const result = await response.json();
      if (result.success) {
        setScheduleTypes((prev) => prev.filter((st) => st.id !== id));
        setConfirmModal({ open: false, id: null, name: '' });
      } else {
        alert(result.message || 'No se pudo eliminar');
      }
    } catch (err) {
      alert(err.message || 'Error de conexión');
    } finally {
      setDeleting(false);
    }
  }, []);

  const openConfirm = (id, name) => setConfirmModal({ open: true, id, name });
  const closeConfirm = () => setConfirmModal({ open: false, id: null, name: '' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="size-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={loadScheduleTypes} className="mt-2 text-xs text-red-600 underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (scheduleTypes.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-white py-8 text-center">
        <p className="text-sm text-gray-500">No hay tipos de jornada definidos.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y-2 divide-gray-200">
            <thead className="ltr:text-left rtl:text-right">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hora Inicio</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hora Fin</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tolerancia</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Auto-fill</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {scheduleTypes.map((st) => (
                <tr key={st.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{st.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{st.expected_start_time}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{st.expected_end_time}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{st.tolerance_minutes ?? 5} min</td>
                  <td className="px-4 py-3">
                    {st.auto_fill_salida ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Sí</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {st.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Activo</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit?.(st)}
                        title="Editar"
                        className="inline-flex items-center justify-center rounded p-1.5 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        <PencilIcon className="size-4" />
                      </button>
                      <button
                        onClick={() => openConfirm(st.id, st.name)}
                        title="Desactivar"
                        className="inline-flex items-center justify-center rounded p-1.5 text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 grid place-content-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">Desactivar tipo de jornada</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Estás seguro de que deseas desactivar &quot;{confirmModal.name}&quot;? Esta acción afecta las asignaciones existentes.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={closeConfirm}
                className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmModal.id)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
