import { useState, useEffect, useCallback } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import RejectOvertimeModal from './RejectOvertimeModal';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

const formatWorkedTime = (minutes) => {
  if (minutes === null || minutes === undefined || minutes < 0) {
    return '—';
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export default function PendingOvertimeTable({ onCountChange }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState({ open: false, requestId: null });
  const [actionLoading, setActionLoading] = useState(null);

  const loadPendingRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/asistenciakrsft/overtime-requests/pending');
      const result = await response.json();

      if (result.success) {
        setRequests(result.data || []);
        onCountChange?.(result.data?.length || 0);
      } else {
        setRequests([]);
        onCountChange?.(0);
      }
    } catch (err) {
      setRequests([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);

    try {
      const response = await fetch(`/api/asistenciakrsft/overtime-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });

      const result = await response.json();

      if (result.success) {
        await loadPendingRequests();
        return { success: true, message: 'Horas extra aprobadas' };
      } else {
        return { success: false, message: result.message || 'Error al aprobar' };
      }
    } catch (err) {
      return { success: false, message: 'Error de conexión' };
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = () => {
    loadPendingRequests();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-md border border-gray-300 bg-white shadow-sm">
        <svg className="size-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando solicitudes...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-md border border-gray-300 bg-white shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="size-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-500">No hay solicitudes pendientes de horas extra</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full divide-y-2 divide-gray-200">
            <thead className="ltr:text-left rtl:text-right">
              <tr className="*font-medium *text-gray-900">
                <th className="px-4 py-3 whitespace-nowrap">Solicitante</th>
                <th className="px-4 py-3 whitespace-nowrap">Fecha</th>
                <th className="px-4 py-3 whitespace-nowrap">Horas Originales</th>
                <th className="px-4 py-3 whitespace-nowrap">Horas Extra</th>
                <th className="px-4 py-3 whitespace-nowrap">Justificación</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="*text-gray-900 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-slate-800">{request.requester_name || '—'}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {request.fecha || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {formatWorkedTime(request.worked_minutes)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      +{parseFloat(request.extra_hours).toFixed(2)}h
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 max-w-xs truncate" title={request.justification}>
                      {request.justification}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={actionLoading === request.id}
                        title="Aprobar"
                        className="inline-flex items-center justify-center rounded p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === request.id ? (
                          <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <CheckIcon className="size-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setRejectModal({ open: true, requestId: request.id })}
                        disabled={actionLoading === request.id}
                        title="Rechazar"
                        className="inline-flex items-center justify-center rounded p-2 text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <XMarkIcon className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RejectOvertimeModal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, requestId: null })}
        requestId={rejectModal.requestId}
        onSuccess={handleReject}
      />
    </>
  );
}
