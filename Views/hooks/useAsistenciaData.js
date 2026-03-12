import { useState, useEffect, useCallback } from 'react';
import { POLLING_INTERVAL } from '../utils/constants';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

/**
 * @param {Object} auth - Datos de autenticación del usuario
 * @returns {Object} Estado para gestionar registros de asistencia
 */
export function useAsistenciaData(auth) {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Cargar asistencias ───
  const loadAsistencias = useCallback(async () => {
    try {
      const response = await fetch('/api/asistenciakrsft/list');
      const result = await response.json();

      if (result.success) {
        setAsistencias(result.data || []);
        setError(null);
      } else {
        setError(result.message || 'Error al cargar los registros de asistencia');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

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
        await loadAsistencias();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al crear registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadAsistencias]);

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
        await loadAsistencias();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al actualizar registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadAsistencias]);

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
        await loadAsistencias();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al eliminar registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadAsistencias]);

  // ── Cargar data inicial ───
  useEffect(() => {
    loadAsistencias();
  }, [loadAsistencias]);

  // ── Polling cada 30 segundos (silencioso) ───
  useEffect(() => {
    const interval = setInterval(() => {
      loadAsistencias();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [loadAsistencias]);

  return {
    asistencias,
    loading,
    error,
    createAsistencia,
    updateAsistencia,
    deleteAsistencia,
  };
}
