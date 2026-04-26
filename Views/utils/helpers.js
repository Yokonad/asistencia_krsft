/**
 * Formatea un registro de asistencia para visualización
 * @param {Object} asistencia - Objeto del registro
 * @returns {Object} Registro formateado
 */
export function formatAsistencia(asistencia) {
  return {
    ...asistencia,
    nombreFormateado: asistencia.trabajador_nombre?.toUpperCase() || '',
  };
}

/**
 * Valida datos básicos de un registro de asistencia
 * @param {Object} data - Datos a validar
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateAsistenciaData(data) {
  const errors = {};

  if (!/^\d{8}$/.test(data.dni || '')) {
    errors.dni = 'El DNI debe tener 8 dígitos';
  }

  if (!data.trabajador_id) {
    errors.dni = errors.dni || 'Debe seleccionar un trabajador válido';
  }

  if (!data.fecha) {
    errors.fecha = 'La fecha es requerida';
  }

  if (data.hora_entrada && data.hora_salida && data.hora_salida < data.hora_entrada) {
    errors.hora_salida = 'La hora de salida debe ser mayor o igual a la hora de entrada';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Crea un objeto de asistencia vacío
 * @returns {Object}
 */
export function createEmptyAsistencia() {
  return {
    trabajador_id: null,
    trabajador_nombre: '',
    dni: '',
    area: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_entrada: '',
    hora_salida: '',
  };
}
