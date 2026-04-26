import { useState, useMemo } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { CalendarDaysIcon, UserIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import WorkerSearchSelect from './WorkerSearchSelect';
import CustomDay from './CustomDay';

dayjs.locale('es');

// Check if a date string is a past weekday (not future, not weekend)
const isPastWeekday = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateString}T00:00:00`);
  if (date > today) return false; // Future date
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend
  return true;
};

const formatDateLabelEsPe = (dateValue) => {
  if (!dateValue) return '—';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(date);
};

const formatShortDate = (dateValue) => {
  if (!dateValue) return '—';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Lima',
  }).format(date);
};

/**
 * WorkerCalendar - Solo búsqueda until worker selected, then full view.
 * Layout: Calendar LEFT (small), Info RIGHT.
 */
export default function WorkerCalendar({
  selectedDate,
  onDateChange,
  selectedWorker,
  onWorkerSelect,
  workers,
  workerAttendanceSummary,
  loading,
}) {
  const [selectedDayForDetail, setSelectedDayForDetail] = useState(null);

  const selected = dayjs(selectedDate);

  // Find the record for the selected day
  const selectedDayRecord = useMemo(() => {
    if (!selectedDayForDetail) return null;
    return workerAttendanceSummary.find(d => d.date === selectedDayForDetail) || null;
  }, [selectedDayForDetail, workerAttendanceSummary]);

  const handleDateChange = (newValue) => {
    if (!newValue || !newValue.isValid()) return;
    const dateStr = newValue.format('YYYY-MM-DD');
    onDateChange(dateStr);
    setSelectedDayForDetail(dateStr);
  };

  const handleDayClick = (day) => {
    const dateStr = day.format('YYYY-MM-DD');
    setSelectedDayForDetail(dateStr);
  };

  // Stats
  const stats = useMemo(() => {
    if (!workerAttendanceSummary || workerAttendanceSummary.length === 0) {
      return { worked: 0, partial: 0, absent: 0, total: 0, total_worked_minutes: 0, total_expected_minutes: 0 };
    }
    const worked = workerAttendanceSummary.filter(d => {
      if (!d.has_record || d.expected_minutes === null) return false;
      return d.worked_minutes >= d.expected_minutes - 15;
    }).length;
    const partial = workerAttendanceSummary.filter(d => {
      if (!d.has_record || d.expected_minutes === null) return false;
      return d.worked_minutes > 0 && d.worked_minutes < d.expected_minutes - 15;
    }).length;
    const absent = workerAttendanceSummary.filter(d => {
      if (!d.has_record && isPastWeekday(d.date)) return true;
      return false;
    }).length;
    
    const total_worked_minutes = workerAttendanceSummary.reduce((acc, d) => acc + (d.worked_minutes || 0), 0);
    const total_expected_minutes = workerAttendanceSummary.reduce((acc, d) => acc + (d.expected_minutes || 0), 0);
    
    return { worked, partial, absent, total: workerAttendanceSummary.length, total_worked_minutes, total_expected_minutes };
  }, [workerAttendanceSummary]);

  // Determine status for selected day
  const getDayStatus = (record) => {
    if (!record || !record.has_record) return 'absent';
    if (!record.expected_minutes) return 'neutral';
    if (record.worked_minutes >= record.expected_minutes - 15) return 'complete';
    if (record.worked_minutes > 0) return 'partial';
    return 'absent';
  };

  const selectedDayStatus = selectedDayRecord ? getDayStatus(selectedDayRecord) : null;

  // If no worker selected, show only search
  if (!selectedWorker) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[500px] relative">
        <div className="w-full max-w-xl relative">
          <div className="absolute inset-0 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden pointer-events-none">
            {/* Fondo decorativo */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-teal-50 blur-3xl opacity-60"></div>
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-50 blur-3xl opacity-60"></div>
          </div>

          <div className="relative z-10 p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50/80 ring-[10px] ring-teal-50/30">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-teal-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Consulta Individual</h3>
            <p className="text-[14px] text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
              Busca a cualquier colaborador por su <strong className="font-semibold text-slate-700">nombre</strong> o <strong className="font-semibold text-slate-700">DNI</strong> para visualizar sus registros detallados.
            </p>
            
            <div className="text-left relative max-w-md mx-auto">
              <WorkerSearchSelect
                selectedWorker={selectedWorker}
                workers={workers}
                onWorkerSelect={onWorkerSelect}
                size="large"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Worker selected - show full view
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* LEFT COLUMN - Calendar (smaller fixed width) */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        {/* Mini Calendar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <StaticDatePicker
              value={selected}
              onChange={handleDateChange}
              onMonthChange={(newMonth) => {
                if (newMonth && newMonth.isValid()) {
                  // Actualizar la fecha para que se cargue la data del nuevo mes
                  onDateChange(newMonth.format('YYYY-MM-DD'));
                }
              }}
              slotProps={{
                actionBar: { actions: [] },
                toolbar: { hidden: true },
                day: {
                  workerAttendanceSummary,
                  selectedWorker,
                },
              }}
              slots={{
                day: CustomDay,
              }}
              sx={{
                width: '100%',
                backgroundColor: 'transparent',
                '& .MuiPickersLayout-root': { minWidth: '100%', backgroundColor: 'transparent' },
                '& .MuiPickersCalendarHeader-root': { 
                  paddingLeft: '12px', 
                  paddingRight: '12px', 
                  marginTop: '0px',
                  marginBottom: '12px'
                },
                '& .MuiPickersCalendarHeader-label': {
                  fontSize: '14px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#1e293b'
                },
                '& .MuiPickersArrowSwitcher-button': {
                  color: '#0AA4A4'
                },
                '& .MuiDayCalendar-header': {
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '8px',
                  marginBottom: '8px',
                },
                '& .MuiDayCalendar-weekDayLabel': {
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: '12px',
                },
                '& .MuiPickersDay-root': {
                  fontSize: '13px',
                  fontWeight: 500,
                },
                '& .MuiPickersDay-root.Mui-selected': {
                  backgroundColor: '#0AA4A4',
                  fontWeight: 700,
                },
                '& .MuiPickersDay-root.Mui-selected:hover': {
                  backgroundColor: '#088c8c',
                },
                '& .MuiPickersDay-root.MuiPickersDay-today': {
                  borderColor: '#0AA4A4',
                  borderWidth: '2px',
                },
              }}
            />
          </LocalizationProvider>

          {/* Leyenda integrada bajo el calendario */}
          <div className="mt-4 flex items-center justify-center gap-5 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Completa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm"></span>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Parcial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm"></span>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Falta</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Info Panel */}
      <div className="w-full lg:flex-1 space-y-4">
        {/* Worker Info Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 ring-4 ring-teal-50">
                <UserIcon className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 uppercase tracking-wide">{selectedWorker.nombre_completo}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">DNI: {selectedWorker.dni} {selectedWorker.cargo ? `· ${selectedWorker.cargo}` : ''}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onWorkerSelect(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-red-500 transition-colors border border-gray-200 hover:border-red-200"
            >
              Cambiar
            </button>
          </div>
        </div>

        {/* Resumen Mensual (siempre visible) */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
          <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-4">Resumen Mensual</h4>
          
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="flex flex-col rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-10 translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                <CheckCircleIcon className="h-16 w-16 text-emerald-600" />
              </div>
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider relative z-10 mb-1">Completas</p>
              <p className="text-2xl font-black text-emerald-700 relative z-10">{stats.worked}</p>
            </div>
            
            <div className="flex flex-col rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-10 translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                <ExclamationTriangleIcon className="h-16 w-16 text-amber-600" />
              </div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider relative z-10 mb-1">Parciales</p>
              <p className="text-2xl font-black text-amber-600 relative z-10">{stats.partial}</p>
            </div>
            
            <div className="flex flex-col rounded-xl border border-red-100 bg-red-50 px-3 py-3 relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-10 translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                <XCircleIcon className="h-16 w-16 text-red-600" />
              </div>
              <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider relative z-10 mb-1">Faltas</p>
              <p className="text-2xl font-black text-red-600 relative z-10">{stats.absent}</p>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horas Acumuladas</p>
                <p className="text-sm font-bold text-slate-800">
                  {Math.floor(stats.total_worked_minutes / 60)}h {stats.total_worked_minutes % 60}m
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    / {Math.floor(stats.total_expected_minutes / 60)}h {stats.total_expected_minutes % 60}m
                  </span>
                </p>
              </div>
              <p className="text-[11px] font-bold text-teal-700">
                {stats.total_expected_minutes > 0 ? Math.round((stats.total_worked_minutes / stats.total_expected_minutes) * 100) : 0}%
              </p>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.total_expected_minutes > 0 ? (stats.total_worked_minutes / stats.total_expected_minutes) * 100 : 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Day Detail Panel */}
        {selectedDayForDetail ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
            <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-3">Detalle del Día</h4>
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{formatDateLabelEsPe(selectedDayForDetail)}</span>
              </div>
              {selectedDayStatus === 'complete' && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Completa</span>
              )}
              {selectedDayStatus === 'partial' && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Parcial</span>
              )}
              {selectedDayStatus === 'absent' && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">Falta</span>
              )}
            </div>

            {selectedDayRecord && selectedDayRecord.has_record ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Horas Trabajadas</p>
                  <p className="text-lg font-bold text-slate-800">
                    {selectedDayRecord.worked_minutes > 0
                      ? `${Math.floor(selectedDayRecord.worked_minutes / 60)}h ${selectedDayRecord.worked_minutes % 60}m`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Jornada Esperada</p>
                  <p className="text-lg font-bold text-slate-800">
                    {selectedDayRecord.expected_minutes
                      ? `${Math.floor(selectedDayRecord.expected_minutes / 60)}h ${selectedDayRecord.expected_minutes % 60}m`
                      : '—'}
                  </p>
                </div>
                {selectedDayRecord.schedule_type_name && (
                  <div className="col-span-2 rounded-lg bg-teal-50/50 p-3 border border-teal-100 mt-1">
                    <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-0.5">Tipo jornada</p>
                    <p className="text-sm font-bold text-teal-700">{selectedDayRecord.schedule_type_name}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-bold text-slate-700">Sin registro</p>
                <p className="text-xs text-gray-500">No hay asistencia registrada para este día.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center mt-4">
            <div className="h-12 w-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-3">
              <CalendarDaysIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-slate-700">Seleccione un día en el calendario</p>
            <p className="text-xs text-gray-500 max-w-xs mt-1">Haga clic en cualquier día del mes para ver el detalle de horas trabajadas y esperadas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
