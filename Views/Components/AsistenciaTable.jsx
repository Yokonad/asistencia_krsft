import { useCallback, useState } from 'react';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { AsistenciaStatusLabels, AsistenciaStatusColors } from '../utils/constants';
import Badge from './ui/Badge';
import ConfirmModal from './modals/ConfirmModal';

export default function AsistenciaTable({ asistencias, loading, onEdit, onDelete }) {
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', id: null });
  const openConfirm = useCallback((id, title, message) => setConfirmModal({ open: true, title, message, id }), []);
  const closeConfirm = useCallback(() => setConfirmModal({ open: false, title: '', message: '', id: null }), []);
  const handleConfirmed = useCallback(() => { onDelete?.(confirmModal.id); closeConfirm(); }, [confirmModal.id, onDelete, closeConfirm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded border border-gray-300 bg-white shadow-sm">
        <svg className="size-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando registros de asistencia...</p>
      </div>
    );
  }

  if (!asistencias || asistencias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded border border-gray-300 bg-white shadow-sm">
        <p className="text-sm text-gray-500">No hay registros de asistencia aún.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-300 bg-white shadow-sm overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trabajador</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">DNI</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Área</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entrada</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Salida</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {asistencias.map((asistencia) => (
            <tr key={asistencia.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{asistencia.trabajador_nombre}</td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asistencia.dni || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asistencia.area || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asistencia.fecha}</td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asistencia.hora_entrada || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{asistencia.hora_salida || '—'}</td>
              <td className="px-4 py-3 text-sm whitespace-nowrap">
                <Badge color={AsistenciaStatusColors[asistencia.estado]}>
                  {AsistenciaStatusLabels[asistencia.estado]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm whitespace-nowrap">
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit?.(asistencia)}
                    className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <PencilIcon className="size-3" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => openConfirm(asistencia.id, '¿Eliminar registro?', `Se eliminará el registro de "${asistencia.trabajador_nombre}" del ${asistencia.fecha}. Esta acción no se puede deshacer.`)}
                    className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    <TrashIcon className="size-3" />
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={closeConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        actionLabel="Sí, eliminar"
        actionVariant="danger"
        onConfirm={handleConfirmed}
      />
    </div>
  );
}
