import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

export default function RejectOvertimeModal({
  isOpen,
  onClose,
  requestId,
  onSuccess,
}) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRejectionReason('');
      setErrors({});
      setLoading(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!rejectionReason || rejectionReason.trim() === '') {
      newErrors.rejectionReason = 'El motivo de rechazo es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/asistenciakrsft/overtime-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setErrors({ submit: result.message || 'Error al rechazar la solicitud' });
      }
    } catch (err) {
      setErrors({ submit: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-content-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejectModalTitle"
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
        onClick={(e) => { e.stopPropagation(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h2 id="rejectModalTitle" className="text-[15px] font-bold text-slate-800 uppercase tracking-wide">
            Rechazar Solicitud
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4">
          {errors.submit && (
            <div role="alert" className="rounded-md border border-red-500 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">{errors.submit}</p>
            </div>
          )}

          <div>
            <label htmlFor="reject-reason" className="block">
              <span className="text-[14px] font-medium text-slate-700">
                Motivo de Rechazo <span className="text-red-500">*</span>
              </span>
              <textarea
                id="reject-reason"
                rows={4}
                placeholder="Describe el motivo por el cual rechazas esta solicitud..."
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (errors.rejectionReason) setErrors((prev) => ({ ...prev, rejectionReason: '' }));
                }}
                className={`mt-1.5 w-full rounded-md border py-2 px-3 shadow-none sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-400 resize-none ${
                  errors.rejectionReason
                    ? 'border-red-300 focus:border-red-300 focus:ring-red-300'
                    : 'border-gray-200 focus:border-red-400 text-slate-900'
                }`}
              />
              {errors.rejectionReason && (
                <p className="mt-1 text-xs text-red-600">{errors.rejectionReason}</p>
              )}
            </label>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-100 bg-white px-6 py-2.5 text-[14px] font-medium text-slate-700 transition-colors hover:bg-gray-50 shadow-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-100 bg-white px-6 py-2.5 text-[14px] font-medium text-red-500 transition-colors hover:bg-gray-50 shadow-sm disabled:opacity-60"
          >
            {loading && (
              <svg className="size-4 animate-spin text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Rechazar
          </button>
        </footer>
      </div>
    </div>
  );
}
