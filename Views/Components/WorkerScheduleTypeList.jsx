import { useCallback, useState, useEffect } from 'react';
import { useScheduleTypes } from '../hooks/useScheduleTypes';
import WorkerScheduleTypeSelect from './WorkerScheduleTypeSelect';

export default function WorkerScheduleTypeList({ refreshTrigger = 0 }) {
  const { workers, loading, loadWorkers, updateWorkerSchedule } = useScheduleTypes();
  const [assigningId, setAssigningId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers, refreshTrigger]);

  const handleAssign = useCallback(async (workerId) => {
    if (!selectedType) return;
    setAssigningId(workerId);
    try {
      await updateWorkerSchedule(workerId, selectedType, new Date().toISOString().split('T')[0]);
      setSelectedType(null);
      await loadWorkers();
    } finally {
      setAssigningId(null);
    }
  }, [selectedType, updateWorkerSchedule, loadWorkers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="size-8 animate-spin text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-white py-8 text-center">
        <p className="text-sm text-gray-500">No hay trabajadores activos con jornadas asignadas.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y-2 divide-gray-200">
          <thead className="ltr:text-left rtl:text-right">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trabajador</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">DNI</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Jornada Actual</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hora Inicio</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hora Fin</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Desde</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Cambiar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workers.map((worker) => {
              const isCurrentAssigning = assigningId === worker.worker_id;
              return (
                <tr key={worker.worker_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{worker.nombre_completo}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{worker.dni}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{worker.cargo || '—'}</td>
                  <td className="px-4 py-3">
                    {worker.schedule_type_name ? (
                      <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                        {worker.schedule_type_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                        Sin asignar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{worker.expected_start_time || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{worker.expected_end_time || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{worker.effective_from || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <WorkerScheduleTypeSelect
                        workerId={worker.worker_id}
                        currentTypeId={worker.schedule_type_id}
                        onSelect={(typeId) => setSelectedType(typeId)}
                        onConfirm={() => handleAssign(worker.worker_id)}
                        loading={isCurrentAssigning}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
