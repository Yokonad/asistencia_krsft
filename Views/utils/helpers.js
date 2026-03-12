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

  if (!data.trabajador_nombre?.trim()) {
    errors.trabajador_nombre = 'El nombre del trabajador es requerido';
  }

  if (!data.fecha) {
    errors.fecha = 'La fecha es requerida';
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
    trabajador_nombre: '',
    dni: '',
    area: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_entrada: '',
    hora_salida: '',
    estado: true,
    observaciones: '',
  };
}
