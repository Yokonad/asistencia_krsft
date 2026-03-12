export const ASISTENCIA_TABLE = 'asistencias';

export const AsistenciaStatus = {
  PRESENTE: true,
  AUSENTE: false,
};

export const AsistenciaStatusLabels = {
  [AsistenciaStatus.PRESENTE]: 'Presente',
  [AsistenciaStatus.AUSENTE]: 'Ausente',
};

export const AsistenciaStatusColors = {
  [AsistenciaStatus.PRESENTE]: 'success',
  [AsistenciaStatus.AUSENTE]: 'warning',
};

export const POLLING_INTERVAL = 30000; // 30 segundos
