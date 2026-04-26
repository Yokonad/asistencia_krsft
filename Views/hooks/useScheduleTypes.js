import { useState, useEffect, useCallback } from 'react';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

export function useScheduleTypes() {
  const [scheduleTypes, setScheduleTypes] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadScheduleTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/asistenciakrsft/schedule-types');
      const result = await response.json();
      if (result.success) {
        setScheduleTypes(result.data || []);
      }
    } catch (err) {
      // silent fail
    }
  }, []);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/asistenciakrsft/workers/schedule-types');
      const result = await response.json();
      if (result.success) {
        setWorkers(result.data || []);
      }
    } catch (err) {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  const createScheduleType = useCallback(async (payload) => {
    try {
      const response = await fetch('/api/asistenciakrsft/schedule-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        await loadScheduleTypes();
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message || 'Error al crear tipo de jornada', errors: result.errors };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [loadScheduleTypes]);

  const updateScheduleType = useCallback(async (id, payload) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/schedule-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        await loadScheduleTypes();
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message || 'Error al actualizar', errors: result.errors };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [loadScheduleTypes]);

  const deleteScheduleType = useCallback(async (id) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/schedule-types/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const result = await response.json();
      if (result.success) {
        await loadScheduleTypes();
        return { success: true, message: result.message, affected_workers: result.affected_workers };
      }
      return { success: false, message: result.message || 'Error al eliminar' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [loadScheduleTypes]);

  const updateWorkerSchedule = useCallback(async (workerId, scheduleTypeId, effectiveFrom) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/workers/${workerId}/schedule-type`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          schedule_type_id: scheduleTypeId,
          effective_from: effectiveFrom || new Date().toISOString().split('T')[0],
        }),
      });
      const result = await response.json();
      if (result.success) {
        await loadWorkers();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al asignar jornada' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [loadWorkers]);

  useEffect(() => {
    loadScheduleTypes();
  }, [loadScheduleTypes]);

  return {
    scheduleTypes,
    workers,
    loading,
    loadScheduleTypes,
    loadWorkers,
    createScheduleType,
    updateScheduleType,
    deleteScheduleType,
    updateWorkerSchedule,
  };
}
