import { useCallback, useMemo, useState, useEffect } from 'react';
import { TrashIcon, EyeIcon, XMarkIcon, ClockIcon, PhotoIcon, MapPinIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import ConfirmModal from './modals/ConfirmModal';

const MANUAL_ENTRY = 'manual-entry';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasCoordinates = (lat, lng) => {
  const latitude = toNumber(lat);
  const longitude = toNumber(lng);

  if (latitude === null || longitude === null) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;

  return true;
};

const formatCoordinate = (value) => {
  const parsed = toNumber(value);
  if (parsed === null) return '—';
  return parsed.toFixed(7);
};

const buildMapEmbedUrl = (lat, lng) => {
  const latitude = toNumber(lat);
  const longitude = toNumber(lng);
  if (latitude === null || longitude === null) return '';

  const delta = 0.003;
  const left = (longitude - delta).toFixed(6);
  const right = (longitude + delta).toFixed(6);
  const top = (latitude + delta).toFixed(6);
  const bottom = (latitude - delta).toFixed(6);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

const getPhotoCandidates = (photoPath, recordId) => {
  if (!photoPath || photoPath === MANUAL_ENTRY) return [];

  const normalized = String(photoPath).trim().replace(/^\/+/, '');
  if (!normalized) return [];
  if (/^https?:\/\//i.test(normalized)) {
    return recordId ? [`/api/asistenciakrsft/photo/${recordId}`, normalized] : [normalized];
  }

  const candidates = [];

  if (recordId) {
    candidates.push(`/api/asistenciakrsft/photo/${recordId}`);
  }

  if (normalized.startsWith('storage/')) {
    candidates.push(`/${normalized}`);
  }

  if (normalized.startsWith('uploads/')) {
    candidates.push(`/storage/${normalized}`);
    candidates.push(`/${normalized}`);
  } else {
    candidates.push(`/storage/${normalized}`);
    candidates.push(`/${normalized}`);
  }

  return [...new Set(candidates)];
};

const buildMapLinks = (lat, lng) => {
  const latitude = toNumber(lat);
  const longitude = toNumber(lng);
  if (latitude === null || longitude === null) {
    return { google: '#', osm: '#' };
  }

  return {
    google: `https://www.google.com/maps?q=${latitude},${longitude}`,
    osm: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`,
  };
};

const formatWorkedTime = (minutes) => {
  if (minutes === null || minutes === undefined || minutes < 0) {
    return '—';
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatTableDate = (dateString) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
  }
  return dateString;
};

export default function AsistenciaTable({
  asistencia,
  loading,
  onDelete,
  auth,
  onRequestOvertime,
}) {
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', id: null });
  const [detailModal, setDetailModal] = useState({ open: false, row: null, overtimeRequests: [] });
  const [loadingOvertime, setLoadingOvertime] = useState(false);

  const openConfirm = useCallback((id, title, message) => setConfirmModal({ open: true, title, message, id }), []);
  const closeConfirm = useCallback(() => setConfirmModal({ open: false, title: '', message: '', id: null }), []);
  const handleConfirmed = useCallback(() => { onDelete?.(confirmModal.id); closeConfirm(); }, [confirmModal.id, onDelete, closeConfirm]);
  const openDetailModal = useCallback((row) => setDetailModal({ open: true, row, overtimeRequests: [] }), []);
  const closeDetailModal = useCallback(() => setDetailModal({ open: false, row: null, overtimeRequests: [] }), []);
  const detailRow = detailModal.row;
  const detailPhotoCandidates = useMemo(() => {
    if (!detailRow) return [];
    return getPhotoCandidates(detailRow.photo_path, detailRow.id);
  }, [detailRow]);
  const detailHasPhoto = detailPhotoCandidates.length > 0;
  const detailCoordinatesReady = detailRow ? hasCoordinates(detailRow.latitude, detailRow.longitude) : false;
  const detailMapEmbedUrl = useMemo(() => {
    if (!detailCoordinatesReady || !detailRow) return '';
    return buildMapEmbedUrl(detailRow.latitude, detailRow.longitude);
  }, [detailCoordinatesReady, detailRow]);
  const detailMapLinks = useMemo(() => {
    if (!detailRow) return { google: '#', osm: '#' };
    return buildMapLinks(detailRow.latitude, detailRow.longitude);
  }, [detailRow]);

  // Load overtime requests when detail modal opens
  useEffect(() => {
    if (detailModal.open && detailRow?.id) {
      setLoadingOvertime(true);
      fetch(`/api/asistenciakrsft/overtime-requests/for-record/${detailRow.id}`)
        .then((r) => r.json())
        .then((result) => {
          if (result.success) {
            setDetailModal((prev) => ({ ...prev, overtimeRequests: result.data || [] }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingOvertime(false));
    }
  }, [detailModal.open, detailRow?.id]);

  const approvedOvertime = useMemo(() => {
    return detailModal.overtimeRequests?.find((r) => r.status === 'approved');
  }, [detailModal.overtimeRequests]);

  const onImageError = useCallback((event) => {
    const image = event.currentTarget;
    const fallbackNode = image.nextElementSibling;
    const candidates = (image.dataset.candidates || '').split('|').filter(Boolean);
    const currentIndex = Number(image.dataset.index || '0');
    const nextIndex = currentIndex + 1;

    if (nextIndex < candidates.length) {
      image.dataset.index = String(nextIndex);
      image.src = candidates[nextIndex];
      return;
    }

    image.style.display = 'none';
    if (fallbackNode) fallbackNode.classList.remove('hidden');
  }, []);

  const canRequestOvertime = auth?.permission_names?.includes('create');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-md border border-gray-300 bg-white shadow-sm">
        <svg className="size-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray-500">Cargando estado de asistencia...</p>
      </div>
    );
  }

  if (!asistencia || asistencia.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-md border border-gray-300 bg-white shadow-sm">
        <p className="text-sm text-gray-500">Nadie se registró el día de hoy.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full divide-y-2 divide-gray-200">
          <thead className="ltr:text-left rtl:text-right">
            <tr className="*font-medium *text-gray-900">
              <th className="px-4 py-3 whitespace-nowrap text-left">Nombre</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">DNI</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Estado</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Hora y fecha de entrada</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Hora y fecha de salida</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Horas trabajadas</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {asistencia.map((row) => {
              const isRegistered = Boolean(row.id);
              const hasCompleteJornada = Boolean(row.hora_salida);

              return (
                <tr key={row.id || row.trabajador_id} className="*text-gray-900 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-left">
                    <span className="font-medium text-[13px] text-slate-800">{row.trabajador_nombre}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {row.dni || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold ${isRegistered ? 'bg-[#0AA4A4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {isRegistered ? (row.hora_salida ? 'Jornada completa' : 'En jornada') : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {row.hora_entrada || '—'}{row.fecha ? ` · ${formatTableDate(row.fecha)}` : ''}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {row.hora_salida ? (
                      <div className="flex items-center justify-center">
                        {row.hora_salida}{row.fecha ? ` · ${formatTableDate(row.fecha)}` : ''}
                        {row.is_salida_auto_calculated && (
                          <span title="Salida auto-calculada según jornada" className="ml-1 inline-flex items-center">
                            <ClockIcon className="size-3 text-teal-600" />
                          </span>
                        )}
                      </div>
                    ) : row.expected_salida ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-amber-600 font-medium">{row.expected_salida}</span>
                        <span title="Salida esperada según jornada" className="inline-flex items-center">
                          <ClockIcon className="size-3 text-amber-500" />
                        </span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {row.worked_time || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openDetailModal(row)}
                        title="Ver detalle"
                        className="inline-flex items-center justify-center rounded p-1.5 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        <EyeIcon className="size-4" />
                      </button>
                      {canRequestOvertime && hasCompleteJornada && (
                        <button
                          onClick={() => onRequestOvertime?.(row)}
                          title="Solicitar horas extra"
                          className="inline-flex items-center justify-center rounded p-1.5 text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
                        >
                          <ClockIcon className="size-4" />
                        </button>
                      )}
                      <button
                        onClick={() => isRegistered && openConfirm(row.id, 'Eliminar asistencia', '¿Estás seguro de que deseas eliminar este registro?')}
                        disabled={!isRegistered}
                        className="inline-flex items-center justify-center rounded p-1.5 text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={closeConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        actionLabel="Sí, eliminar"
        actionVariant="danger"
        onConfirm={handleConfirmed}
      />

      {detailModal.open && detailRow && (
        <div className="fixed inset-0 z-[58] grid place-content-center bg-black/50 p-4 sm:p-6 overflow-y-auto">
          <div
            className="my-auto w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[1.25rem] bg-white shadow-2xl overflow-hidden"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <div className="flex-none flex items-center justify-between bg-white px-6 py-4 border-b border-gray-100 z-10">
              <h3 className="text-[17px] font-bold text-slate-800 inline-flex items-center gap-2">
                <InformationCircleIcon className="size-5 text-teal-600" />
                Info detallada
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-bold text-slate-800 mb-2 inline-flex items-center gap-2">
                    <PhotoIcon className="size-4 text-teal-600" />
                    Prueba Fotográfica
                  </h4>
                {detailHasPhoto ? (
                  <div className="w-full flex-1 min-h-[420px] rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 relative border border-gray-100 shadow-inner">
                    <img
                      src={detailPhotoCandidates[0]}
                      alt={`Foto ${detailRow.trabajador_nombre || 'trabajador'}`}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                      loading="lazy"
                      data-index="0"
                      data-candidates={detailPhotoCandidates.join('|')}
                      onError={onImageError}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[420px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-slate-500 flex-shrink-0">
                    Sin imagen enviada
                  </div>
                )}
              </div>

                <div className="flex flex-col gap-4">
                  <h4 className="text-[15px] font-bold text-slate-800 mb-2 inline-flex items-center gap-2">
                    <MapPinIcon className="size-4 text-teal-600" />
                    Actividad y Ubicación
                  </h4>

                  <div className="h-[380px] w-full relative rounded-xl overflow-hidden shadow-inner border border-gray-100 bg-gray-50 flex-shrink-0">
                  {detailMapEmbedUrl ? (
                    <iframe
                      title="Mapa OpenStreetMap"
                      src={detailMapEmbedUrl}
                      className="absolute inset-0 w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No hay coordenadas válidas para mostrar el mapa.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 mt-1">
                  <a
                    href={detailMapLinks.google}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-100 bg-[#ebfbf5] px-5 py-2.5 text-sm font-bold text-[#0AA4A4] hover:bg-[#dffdcf] transition-colors"
                  >
                    <MapPinIcon className="size-4 mr-1.5" />
                    Abrir en Google Maps
                  </a>
                </div>

                {/* Overtime Info Section */}
                {loadingOvertime ? (
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                    <p className="text-sm text-amber-700">Cargando información de horas extra...</p>
                  </div>
                ) : approvedOvertime ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                    <h5 className="text-[13px] font-bold text-emerald-800 mb-2">Horas Extra Aprobadas</h5>
                    <div className="space-y-1">
                      <p className="text-sm text-emerald-700">
                        <span className="font-medium">Horas Extra:</span> {parseFloat(approvedOvertime.extra_hours).toFixed(2)}h
                      </p>
                      <p className="text-sm text-emerald-700">
                        <span className="font-medium">Horas Trabajadas:</span> {formatWorkedTime(detailRow?.worked_minutes)}
                      </p>
                    </div>
                  </div>
                ) : null}
                </div>
              </div>
            </div>

            <div className="flex-none flex items-center justify-end bg-gray-50 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={closeDetailModal}
                className="inline-flex items-center justify-center rounded-lg bg-red-500 px-6 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors shadow-sm"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
