import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

const emptyForm = {
  name: '',
  expected_start_time: '',
  expected_end_time: '',
  tolerance_minutes: 5,
  auto_fill_salida: false,
};

export default function ScheduleTypeFormModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const isEdit = Boolean(initialData?.id);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData?.id) {
        setForm({
          name: initialData.name || '',
          expected_start_time: initialData.expected_start_time || '',
          expected_end_time: initialData.expected_end_time || '',
          tolerance_minutes: initialData.tolerance_minutes ?? 5,
          auto_fill_salida: Boolean(initialData.auto_fill_salida),
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name?.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (form.name.length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }

    if (!form.expected_start_time) {
      newErrors.expected_start_time = 'La hora de inicio es obligatoria';
    } else if (!/^\d{2}:\d{2}$/.test(form.expected_start_time)) {
      newErrors.expected_start_time = 'Formato inválido (HH:MM)';
    }

    // Helper to convert HH:MM to minutes for proper comparison
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    if (!form.expected_end_time) {
      newErrors.expected_end_time = 'La hora de fin es obligatoria';
    } else if (!/^\d{2}:\d{2}$/.test(form.expected_end_time)) {
      newErrors.expected_end_time = 'Formato inválido (HH:MM)';
    } else if (form.expected_start_time && timeToMinutes(form.expected_end_time) <= timeToMinutes(form.expected_start_time)) {
      newErrors.expected_end_time = 'La hora de fin debe ser posterior a la hora de inicio';
    }

    if (form.tolerance_minutes === '' || form.tolerance_minutes === null || form.tolerance_minutes === undefined) {
      // Allow empty, will default to 5
    } else if (!Number.isInteger(Number(form.tolerance_minutes)) || Number(form.tolerance_minutes) < 0) {
      newErrors.tolerance_minutes = 'Debe ser un número entero no negativo';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    try {
      const url = isEdit
        ? `/api/asistenciakrsft/schedule-types/${initialData.id}`
        : '/api/asistenciakrsft/schedule-types';

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          expected_start_time: form.expected_start_time,
          expected_end_time: form.expected_end_time,
          tolerance_minutes: Number(form.tolerance_minutes) || 5,
          auto_fill_salida: Boolean(form.auto_fill_salida),
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess?.(result.data);
        onClose();
      } else {
        // Handle Laravel validation errors
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setErrors({ form: result.message || 'Error al guardar' });
        }
      }
    } catch (err) {
      setErrors({ form: err.message || 'Error de conexión' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <Modal.Header
          title={isEdit ? 'Editar Tipo de Jornada' : 'Nuevo Tipo de Jornada'}
          onClose={onClose}
        />

        <Modal.Body>
          <div className="space-y-4">
            {errors.form && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{errors.form}</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`block w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 ${
                  errors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-200 focus:border-teal-500'
                }`}
                placeholder="Ej: Jornada Completa"
                maxLength={100}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Start & End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Hora Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.expected_start_time}
                  onChange={(e) => handleChange('expected_start_time', e.target.value)}
                  className={`block w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 ${
                    errors.expected_start_time ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-200 focus:border-teal-500'
                  }`}
                />
                {errors.expected_start_time && <p className="mt-1 text-xs text-red-600">{errors.expected_start_time}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Hora Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.expected_end_time}
                  onChange={(e) => handleChange('expected_end_time', e.target.value)}
                  className={`block w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 ${
                    errors.expected_end_time ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-200 focus:border-teal-500'
                  }`}
                />
                {errors.expected_end_time && <p className="mt-1 text-xs text-red-600">{errors.expected_end_time}</p>}
              </div>
            </div>

            {/* Tolerance */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Tolerancia (minutos)
              </label>
              <input
                type="number"
                value={form.tolerance_minutes}
                onChange={(e) => handleChange('tolerance_minutes', e.target.value)}
                min={0}
                max={1440}
                className={`block w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 ${
                  errors.tolerance_minutes ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-200 focus:border-teal-500'
                }`}
              />
              {errors.tolerance_minutes && <p className="mt-1 text-xs text-red-600">{errors.tolerance_minutes}</p>}
              <p className="mt-1 text-xs text-gray-400">Tiempo允许ido antes/después de la hora programada. Default: 5 min.</p>
            </div>

            {/* Auto-fill Toggle */}
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Auto-fill de salida</p>
                <p className="text-xs text-gray-500">Calcula automáticamente la hora de salida basada en este tipo de jornada.</p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('auto_fill_salida', !form.auto_fill_salida)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                  form.auto_fill_salida ? 'bg-teal-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                    form.auto_fill_salida ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Cancelar
          </button>
          <Button type="submit" variant="primary" loading={submitting}>
            {isEdit ? 'Actualizar' : 'Crear'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
