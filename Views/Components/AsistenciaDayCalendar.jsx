import { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { PickerDay } from '@mui/x-date-pickers/PickerDay';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

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

const formatHourPeru = (isoValue, fallback = '—') => {
  if (!isoValue) return fallback;
  const normalized = String(isoValue).includes('T') ? String(isoValue) : String(isoValue).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  }).format(date);
};

/**
 * Simple day renderer for General view - no colored dots.
 */
function PlainDay({ day, inMonth, ...pickersProps }) {
  return (
    <PickerDay
      {...pickersProps}
      day={day}
      inMonth={inMonth}
    />
  );
}

/**
 * AsistenciaDayCalendar - General view calendar without worker-specific elements.
 * Used when calendarView === 'general' in the parent Index component.
 *
 * @param {object} props
 * @param {string} props.selectedDate - YYYY-MM-DD
 * @param {Function} props.onDateChange
 * @param {string} props.selectedPeriod
 * @param {Function} props.onPeriodChange
 * @param {string} props.searchValue
 * @param {Function} props.onSearchChange
 * @param {object} props.resumen
 * @param {Array} props.groupedAsistencias
 * @param {Function} props.onExport
 * @param {boolean} props.loading
 * @param {Function} props.onDayClick - called with date string when a day is clicked
 */
export default function AsistenciaDayCalendar({
  selectedDate,
  onDateChange,
  selectedPeriod,
  onPeriodChange,
  searchValue,
  onSearchChange,
  resumen,
  groupedAsistencias,
  onExport, // We can keep the prop if it's passed from parent, or ignore it
  loading,
  onDayClick,
}) {
  const selected = dayjs(selectedDate);
  const periodLabel = selectedPeriod === 'Día' ? 'día' : selectedPeriod === 'Semana' ? 'semana' : 'mes';
  const groupedRecords = selectedPeriod === 'Día'
    ? (groupedAsistencias || []).filter(([fecha]) => fecha === selectedDate)
    : (groupedAsistencias || []);

  const handleDateChange = (newValue) => {
    if (!newValue || !newValue.isValid()) return;
    const dateStr = newValue.format('YYYY-MM-DD');
    onDateChange(dateStr);
  };

  return (
    <div className="rounded-lg border border-teal-100 bg-white px-4 py-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Calendario de Asistencia</h3>
        <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">
          Día seleccionado: {formatDateLabelEsPe(resumen?.fecha || selectedDate)}
        </span>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-3">
          {/* Calendar - no WorkerSearchSelect, no AttendanceLegend */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] p-3">
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <StaticDatePicker
                value={selected}
                onChange={handleDateChange}
                slotProps={{
                  actionBar: { actions: [] },
                  toolbar: { hidden: true },
                }}
                slots={{
                  day: PlainDay,
                }}
                sx={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  '& .MuiPickersLayout-root': { minWidth: '100%', backgroundColor: 'transparent' },
                  '& .MuiPickersCalendarHeader-root': {
                    paddingTop: 0,
                    paddingBottom: '8px',
                    marginTop: 0,
                  },
                  '& .MuiPickersCalendarHeader-label': {
                    fontWeight: 800,
                    textTransform: 'capitalize',
                    fontSize: '15px',
                    color: '#1e293b',
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

            {/* Nuevo card de resumen bajo el calendario */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] p-4">
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-4">Resumen del Día</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 opacity-10 translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-slate-800">
                      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1 relative z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3.5 text-gray-500">
                      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Trabajadores</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 relative z-10">{resumen?.total_trabajadores ?? 0}</p>
                </div>
                
                <div className="flex flex-col rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-3 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 opacity-10 translate-x-1 -translate-y-1 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-[#0AA4A4]">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1 relative z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3.5 text-[#0AA4A4]">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700">Fueron</p>
                  </div>
                  <p className="text-2xl font-bold text-[#0AA4A4] relative z-10">{resumen?.total_presentes ?? 0}</p>
                </div>
                
                <div className="flex flex-col rounded-lg border border-red-100 bg-red-50/60 px-3 py-3 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 opacity-10 translate-x-1 -translate-y-1 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-red-500">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1 relative z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3.5 text-red-500">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">No fueron</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600 relative z-10">{resumen?.total_ausentes ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Registros del período</p>
              {selectedPeriod === 'Día' && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                  {groupedRecords[0]?.[1]?.length || 0} registros
                </span>
              )}
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Buscar</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Nombre, DNI o cargo..."
                  className="block w-full rounded-md border border-gray-200 h-[38px] pl-9 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-[13px]"
                />
              </div>
            </div>

            {loading ? (
              <div className="px-3 py-6 text-sm text-gray-500">Cargando registros...</div>
            ) : groupedRecords.length ? (
              <div className="max-h-[420px] overflow-y-auto p-3 space-y-3">
                {groupedRecords.map(([fecha, records]) => (
                  <div key={fecha} className="space-y-1.5">
                    {selectedPeriod !== 'Día' && (
                      <div className="flex items-center gap-3 mb-2 mt-3 first:mt-0">
                        <span className="inline-flex items-center rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-white">
                          {formatDateLabelEsPe(fecha)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {records.length} registro{records.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {records.map((record, index) => (
                      <div key={record.id || index} className="grid grid-cols-[minmax(0,1fr)_auto_100px] gap-3 items-center rounded-lg border border-gray-100 bg-white px-3 py-2.5 hover:bg-gray-50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-800 truncate">{record.trabajador_nombre}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{record.dni} · {record.cargo || 'Sin cargo'}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center px-3 sm:px-5 sm:border-x border-gray-100">
                          <p className="text-[12px] font-medium text-slate-700 whitespace-nowrap">
                            {formatHourPeru(record.captured_at, record.hora_entrada || '—')} <span className="text-gray-400 mx-1">—</span> {formatHourPeru(record.check_out_at, record.hora_salida || '—')}
                          </p>
                          {record.worked_time && (
                            <p className="text-[11px] font-bold text-teal-700 mt-0.5">
                              {record.worked_time} hrs
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-end">
                          <span className={`inline-flex items-center rounded-xl px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${record.hora_salida ? 'bg-[#0AA4A4] text-white' : 'bg-amber-100 text-amber-700'}`}>
                            {record.hora_salida ? 'Completado' : 'En jornada'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-sm text-gray-500">No hay registros de asistencia para el período seleccionado.</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}