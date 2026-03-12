import { useState, useEffect } from 'react';
import { validateAsistenciaData, createEmptyAsistencia } from '../utils/helpers';

export default function AsistenciaModal({ isOpen, onClose, onSubmit, initialData }) {
  const [data, setData] = useState(createEmptyAsistencia());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData({ ...createEmptyAsistencia(), ...initialData });
    } else {
      setData(createEmptyAsistencia());
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    const { isValid, errors: validationErrors } = validateAsistenciaData(data);
    if (!isValid) { setErrors(validationErrors); return; }
    setLoading(true);
    const result = await onSubmit(data);
    setLoading(false);
    if (!result.success) setErrors({ submit: result.message });
  };

  const isEditMode = !!initialData;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asistenciaModalTitle"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <h2 id="asistenciaModalTitle" className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Editar Registro de Asistencia' : 'Nuevo Registro de Asistencia'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="-mt-1 -me-1 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 pb-2 space-y-4">
          {errors.submit && (
            <div role="alert" className="rounded-md border border-red-500 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Nombre Trabajador */}
          <label htmlFor="asistencia-nombre">
            <span className="text-sm font-medium text-gray-700">Nombre del Trabajador *</span>
            <input
              id="asistencia-nombre"
              type="text"
              placeholder="Nombre completo"
              value={data.trabajador_nombre}
              onChange={(e) => handleChange('trabajador_nombre', e.target.value)}
              autoComplete="off"
              className={`mt-0.5 w-full rounded border shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${errors.trabajador_nombre ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'}`}
            />
            {errors.trabajador_nombre && <p className="mt-1 text-xs text-red-600">{errors.trabajador_nombre}</p>}
          </label>

          {/* DNI */}
          <label htmlFor="asistencia-dni">
            <span className="text-sm font-medium text-gray-700">DNI</span>
            <input
              id="asistencia-dni"
              type="text"
              placeholder="Número de documento"
              value={data.dni}
              onChange={(e) => handleChange('dni', e.target.value)}
              autoComplete="off"
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-emerald-500 focus:ring-emerald-200"
            />
          </label>

          {/* Área */}
          <label htmlFor="asistencia-area">
            <span className="text-sm font-medium text-gray-700">Área</span>
            <input
              id="asistencia-area"
              type="text"
              placeholder="Área o departamento"
              value={data.area}
              onChange={(e) => handleChange('area', e.target.value)}
              autoComplete="off"
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-emerald-500 focus:ring-emerald-200"
            />
          </label>

          {/* Fecha */}
          <label htmlFor="asistencia-fecha">
            <span className="text-sm font-medium text-gray-700">Fecha *</span>
            <input
              id="asistencia-fecha"
              type="date"
              value={data.fecha}
              onChange={(e) => handleChange('fecha', e.target.value)}
              className={`mt-0.5 w-full rounded border shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${errors.fecha ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'}`}
            />
            {errors.fecha && <p className="mt-1 text-xs text-red-600">{errors.fecha}</p>}
          </label>

          {/* Hora entrada / salida */}
          <div className="grid grid-cols-2 gap-4">
            <label htmlFor="asistencia-entrada">
              <span className="text-sm font-medium text-gray-700">Hora Entrada</span>
              <input
                id="asistencia-entrada"
                type="time"
                value={data.hora_entrada}
                onChange={(e) => handleChange('hora_entrada', e.target.value)}
                className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-emerald-500 focus:ring-emerald-200"
              />
            </label>
            <label htmlFor="asistencia-salida">
              <span className="text-sm font-medium text-gray-700">Hora Salida</span>
              <input
                id="asistencia-salida"
                type="time"
                value={data.hora_salida}
                onChange={(e) => handleChange('hora_salida', e.target.value)}
                className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-emerald-500 focus:ring-emerald-200"
              />
            </label>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={data.estado}
              onClick={() => handleChange('estado', !data.estado)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${data.estado ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform ${data.estado ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {data.estado ? 'Presente' : 'Ausente'}
            </span>
          </div>

          {/* Observaciones */}
          <label htmlFor="asistencia-observaciones">
            <span className="text-sm font-medium text-gray-700">Observaciones</span>
            <textarea
              id="asistencia-observaciones"
              rows={3}
              placeholder="Notas adicionales..."
              value={data.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-emerald-500 focus:ring-emerald-200"
            />
          </label>
        </div>

        {/* Footer */}
        <footer className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {loading && (
              <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isEditMode ? 'Actualizar' : 'Registrar'}
          </button>
        </footer>
      </div>
    </div>
  );
}
