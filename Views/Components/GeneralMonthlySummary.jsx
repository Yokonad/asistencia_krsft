import { useState, useEffect, useMemo } from 'react';
import { CalendarDaysIcon, MagnifyingGlassIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

export default function GeneralMonthlySummary({ 
  data, 
  loading, 
  onMonthChange,
  currentDate
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use local state for the currently viewed month, initialized from currentDate
  const [viewDate, setViewDate] = useState(dayjs(currentDate));

  // Trigger load on mount or viewDate change
  useEffect(() => {
    onMonthChange(viewDate.month() + 1, viewDate.year());
  }, [viewDate.format('YYYY-MM')]);

  const handlePrevMonth = () => {
    setViewDate(prev => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setViewDate(prev => prev.add(1, 'month'));
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(worker => 
      worker.nombre_completo.toLowerCase().includes(lowerSearch) ||
      (worker.dni && worker.dni.includes(lowerSearch))
    );
  }, [data, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={handlePrevMonth}
                className="px-3 py-1.5 text-gray-500 hover:text-teal-600 hover:bg-white rounded-md transition-all font-bold"
              >
                &lt;
              </button>
              <div className="px-4 py-1.5 min-w-[140px] text-center">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  {viewDate.format('MMMM YYYY')}
                </span>
              </div>
              <button
                onClick={handleNextMonth}
                className="px-3 py-1.5 text-gray-500 hover:text-teal-600 hover:bg-white rounded-md transition-all font-bold"
              >
                &gt;
              </button>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-gray-200"></div>
            
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Resumen General</h3>
            </div>
          </div>

          <div className="relative max-w-xs w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-sm text-slate-800 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-500"
              placeholder="Buscar trabajador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Trabajador
                </th>
                <th scope="col" className="px-6 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Días Laborados
                </th>
                <th scope="col" className="px-6 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Total Horas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
                    <p className="mt-4 text-sm text-gray-500 font-medium">Cargando resumen mensual...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                    No se encontraron registros para este mes.
                  </td>
                </tr>
              ) : (
                filteredData.map((worker) => (
                  <tr key={worker.worker_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100">
                          <UserIcon className="h-4 w-4 text-teal-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-[13px] font-bold text-slate-800 uppercase">{worker.nombre_completo}</div>
                          <div className="text-[11px] text-gray-500">{worker.dni} • {worker.cargo || 'Sin cargo'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-[13px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <CalendarDaysIcon className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                        {worker.dias_asistidos}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-[13px] font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        <ClockIcon className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                        {Math.floor(worker.total_worked_minutes / 60)}h {worker.total_worked_minutes % 60}m
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
