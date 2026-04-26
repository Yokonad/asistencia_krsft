import { useState, useEffect, useCallback, useRef } from 'react';
import { POLLING_INTERVAL } from '../utils/constants';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

// Simple deep comparison for arrays of objects
const hasDataChanged = (prev, next) => {
  if (prev.length !== next.length) return true;
  const prevIds = prev.map(r => r.id).join(',');
  const nextIds = next.map(r => r.id).join(',');
  if (prevIds !== nextIds) return true;
  // Quick check on first record to see if any timestamps changed
  if (prev.length > 0 && next.length > 0) {
    const prevTs = prev.map(r => r.captured_at || '').join(',');
    const nextTs = next.map(r => r.captured_at || '').join(',');
    return prevTs !== nextTs;
  }
  return false;
};

// Check if hoy stats changed
const hasStatsChanged = (prev, next) => {
  return prev.total !== next.total ||
         prev.presentes !== next.presentes ||
         prev.ausentes !== next.ausentes;
};

/**
 * Hook para gestionar los datos de asistencia.
 * - loadHoy(): Carga las asistencia registradas en el día
 * - loadAsistencias(): Carga todos los registros de attendance_records
 */
export function useAsistenciaData(auth) {
  const [trabajadoresHoy, setTrabajadoresHoy] = useState([]);
  const [asistencia, setAsistencia] = useState([]);
  const [statsHoy, setStatsHoy] = useState({ total: 0, presentes: 0, ausentes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOvertimeCount, setPendingOvertimeCount] = useState(0);
  const [generalMonthlySummary, setGeneralMonthlySummary] = useState([]);
  const [generalMonthlyLoading, setGeneralMonthlyLoading] = useState(false);
  const prevAsistenciaRef = useRef([]);
  const prevHoyDataRef = useRef([]);
  const prevStatsRef = useRef({ total: 0, presentes: 0, ausentes: 0 });

  // ── Cargar vista HOY (workers + attendance merged) ───
  const loadHoy = useCallback(async () => {
    try {
      const response = await fetch('/api/asistenciakrsft/hoy');
      const result = await response.json();

      if (result.success) {
        const newData = result.data || [];
        const newStats = {
          total: result.total_registros ?? result.total_presentes ?? 0,
          presentes: result.total_presentes || 0,
          ausentes: result.total_ausentes || 0,
        };
        // Only update if data actually changed (prevents polling flicker)
        if (hasDataChanged(prevHoyDataRef.current, newData) ||
            hasStatsChanged(prevStatsRef.current, newStats)) {
          prevHoyDataRef.current = newData;
          prevStatsRef.current = newStats;
          setTrabajadoresHoy(newData);
          setStatsHoy(newStats);
        }
        setError(null);
      } else {
        setError(result.message || 'Error al cargar datos de hoy');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Cargar todos los registros (para la vista ASISTENCIAS) ───
  const loadAsistencias = useCallback(async (params = {}) => {
    try {
      const searchParams = new URLSearchParams(params).toString();
      const response = await fetch(`/api/asistenciakrsft/list?${searchParams}`);
      const result = await response.json();

      if (result.success) {
        const newData = result.data || [];
        // Only update state if data actually changed (prevents polling flicker)
        if (hasDataChanged(prevAsistenciaRef.current, newData)) {
          prevAsistenciaRef.current = newData;
          setAsistencia(newData);
        }
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    }
  }, []);

  // ── Cargar resumen mensual de todos los trabajadores ───
  const loadGeneralMonthlySummary = useCallback(async (month, year) => {
    setGeneralMonthlyLoading(true);
    try {
      const response = await fetch(`/api/asistenciakrsft/general-monthly-summary?month=${month}&year=${year}`);
      const result = await response.json();

      if (result.success) {
        setGeneralMonthlySummary(result.data || []);
        setError(null);
      } else {
        setError(result.message || 'Error al cargar resumen mensual');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setGeneralMonthlyLoading(false);
    }
  }, []);

  // ── Registrar asistencia por DNI ───
  const createAsistencia = useCallback(async (payload) => {
    try {
      const response = await fetch('/api/asistenciakrsft/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        await loadHoy(); // Refresh HOY view
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al crear registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadHoy]);

  const updateAsistencia = useCallback(async (id, payload) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        await loadHoy();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al actualizar registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadHoy]);

  const deleteAsistencia = useCallback(async (id) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const result = await response.json();
      if (result.success) {
        await loadHoy();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al eliminar registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadHoy]);

  // ── Overtime Request Functions ───
  const createOvertimeRequest = useCallback(async (payload) => {
    try {
      const response = await fetch('/api/asistenciakrsft/overtime-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        return { success: true, message: 'Solicitud enviada exitosamente' };
      }
      return { success: false, message: result.message || 'Error al crear solicitud' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, []);

  const loadPendingOvertime = useCallback(async () => {
    try {
      const response = await fetch('/api/asistenciakrsft/overtime-requests/pending');
      const result = await response.json();
      if (result.success) {
        setPendingOvertimeCount(result.data?.length || 0);
        return result.data || [];
      }
      return [];
    } catch (err) {
      return [];
    }
  }, []);

  const approveOvertimeRequest = useCallback(async (id) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/overtime-requests/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const result = await response.json();
      if (result.success) {
        await loadAsistencias();
        return { success: true, message: 'Horas extra aprobadas' };
      }
      return { success: false, message: result.message || 'Error al aprobar' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadAsistencias]);

  const rejectOvertimeRequest = useCallback(async (id, reason) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/overtime-requests/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ rejection_reason: reason }),
      });
      const result = await response.json();
      if (result.success) {
        return { success: true, message: 'Solicitud rechazada' };
      }
      return { success: false, message: result.message || 'Error al rechazar' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, []);

  // ── Initial load ───
  useEffect(() => {
    loadHoy();
  }, [loadHoy]);

  // ── Polling (silent refresh) ───
  useEffect(() => {
    const interval = setInterval(() => {
      loadHoy();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [loadHoy]);

  return {
    // HOY view data
    trabajadoresHoy,
    statsHoy,
    loadHoy,
    // All records (ASISTENCIAS tab)
    asistencia,
    loadAsistencias,
    // Resumen Mensual General
    generalMonthlySummary,
    generalMonthlyLoading,
    loadGeneralMonthlySummary,
    // State
    loading,
    error,
    // CRUD
    createAsistencia,
    updateAsistencia,
    deleteAsistencia,
    // Overtime
    createOvertimeRequest,
    loadPendingOvertime,
    approveOvertimeRequest,
    rejectOvertimeRequest,
    pendingOvertimeCount,
    setPendingOvertimeCount,
  };
}
