import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAsistenciaData } from './hooks/useAsistenciaData';
import { useScheduleTypes } from './hooks/useScheduleTypes';
import AsistenciaTable from './Components/AsistenciaTable';
import AsistenciaHeader from './Components/AsistenciaHeader';
import AsistenciaTabBar from './Components/AsistenciaTabBar';
import AsistenciaModal from './Components/AsistenciaModal';
import AsistenciaDayCalendar from './Components/AsistenciaDayCalendar';
import WorkerCalendar from './Components/WorkerCalendar';
import GeneralMonthlySummary from './Components/GeneralMonthlySummary';
import DayAttendanceModal from './Components/DayAttendanceModal';
import PrevencionTab from './Components/PrevencionTab';
import ProyectosTab from './Components/ProyectosTab';
import OvertimeRequestModal from './Components/OvertimeRequestModal';
import PendingOvertimeTable from './Components/PendingOvertimeTable';
import ScheduleTypeList from './Components/ScheduleTypeList';
import ScheduleTypeFormModal from './Components/ScheduleTypeFormModal';
import WorkerScheduleTypeList from './Components/WorkerScheduleTypeList';
import CustomSelect from './Components/ui/CustomSelect';

const formatDateYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolvePeriodRange = (dateString, period) => {
  const base = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(base.getTime())) {
    return { fecha_desde: dateString, fecha_hasta: dateString };
  }

  if (period === 'Semana') {
    const mondayOffset = (base.getDay() + 6) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      fecha_desde: formatDateYmd(start),
      fecha_hasta: formatDateYmd(end),
    };
  }

  if (period === 'Mes') {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      fecha_desde: formatDateYmd(start),
      fecha_hasta: formatDateYmd(end),
    };
  }

  return { fecha_desde: dateString, fecha_hasta: dateString };
};

export default function Index({ auth }) {
  const {
    trabajadoresHoy,
    statsHoy,
    loadHoy,
    asistencia,
    loading,
    createAsistencia,
    updateAsistencia,
    deleteAsistencia,
    loadAsistencias,
    generalMonthlySummary,
    generalMonthlyLoading,
    loadGeneralMonthlySummary,
    createOvertimeRequest,
    loadPendingOvertime,
    pendingOvertimeCount,
    setPendingOvertimeCount,
  } = useAsistenciaData(auth);

  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAsistencia, setEditingAsistencia] = useState(null);
  const [activeTab, setActiveTab] = useState('hoy');
  const [searchTerm, setSearchTerm] = useState('');

  // Overtime modal state
  const [overtimeModal, setOvertimeModal] = useState({ open: false, attendanceRecordId: null, row: null });

  const today = new Date().toISOString().split('T')[0];
  const [selectedCargo, setSelectedCargo] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  const [selectedOrigin, setSelectedOrigin] = useState('Todos');
  const [selectedPeriod, setSelectedPeriod] = useState('Día');
  const [searchAsistencias, setSearchAsistencias] = useState('');
  const [calendarDate, setCalendarDate] = useState(today);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarResumen, setCalendarResumen] = useState({
    fecha: today,
    total_trabajadores: 0,
    total_presentes: 0,
    total_ausentes: 0,
    trabajadores: [],
  });

  const [proyectosCount, setProyectosCount] = useState(0);

  // Schedule types state
  const [scheduleTypeModal, setScheduleTypeModal] = useState({ open: false, editingType: null });
  const [jornadaRefresh, setJornadaRefresh] = useState(0);
  const [scheduleTypeListKey, setScheduleTypeListKey] = useState(0);

  const { scheduleTypes, loadScheduleTypes, createScheduleType, updateScheduleType, deleteScheduleType } = useScheduleTypes();

  // ── Worker selection for calendar color indicators ──
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerAttendanceSummary, setWorkerAttendanceSummary] = useState([]);
  const [workersList, setWorkersList] = useState([]);
  const [workerAttendanceLoading, setWorkerAttendanceLoading] = useState(false);

  // ── Calendar view toggle (General | Por Trabajador) ──
  const [calendarView, setCalendarView] = useState('general');
  const [dayAttendanceModal, setDayAttendanceModal] = useState({ open: false, date: null });

  // Load active workers list for the search component
  useEffect(() => {
    fetch('/api/trabajadoreskrsft/list?estado=Activo')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const workers = data.trabajadores ?? data.workers ?? [];
          setWorkersList(workers);
        }
      })
      .catch(() => {});
  }, []);

  // Track if we're currently loading to prevent race conditions
  const workerLoadingRef = useRef(false);

  // Fetch worker attendance summary when worker is selected
  const loadWorkerAttendanceSummary = useCallback(async (worker, month) => {
    if (!worker || workerLoadingRef.current) {
      setWorkerAttendanceSummary([]);
      return;
    }
    workerLoadingRef.current = true;
    setWorkerAttendanceLoading(true);
    try {
      const res = await fetch(`/api/asistenciakrsft/worker-attendance-summary?worker_id=${worker.id}&month=${month}`);
      const data = await res.json();
      if (data.success) {
        setWorkerAttendanceSummary(data.data || []);
      }
    } catch (e) {
      console.error('Error loading worker attendance summary:', e);
    } finally {
      workerLoadingRef.current = false;
      setWorkerAttendanceLoading(false);
    }
  }, []);

  // Load summary when worker is selected (for current displayed month)
  useEffect(() => {
    if (selectedWorker && activeTab === 'asistencias' && calendarView === 'worker') {
      const month = (calendarDate || '').slice(0, 7);
      if (month && month.length === 7) {
        loadWorkerAttendanceSummary(selectedWorker, month);
      }
    } else if (calendarView === 'general') {
      setWorkerAttendanceSummary([]);
    }
  }, [selectedWorker, calendarDate, activeTab, calendarView, loadWorkerAttendanceSummary]);

  // Clear state when switching away from asistnecias tab
  useEffect(() => {
    if (activeTab !== 'asistencias') {
      setSelectedWorker(null);
      setWorkerAttendanceSummary([]);
      setCalendarView('general');
      setDayAttendanceModal({ open: false, date: null });
    }
  }, [activeTab]);

  // Handle worker selection
  const handleWorkerSelect = useCallback((worker) => {
    setSelectedWorker(worker);
    if (!worker) {
      setWorkerAttendanceSummary([]);
    }
  }, []);

  useEffect(() => {
    fetch('/api/asistenciakrsft/counts')
      .then(r => r.json())
      .then(data => {
        if (data.proyectos) setProyectosCount(data.proyectos);
      })
      .catch(() => {});
  }, []);

  // Load pending overtime count when approver views the tab
  useEffect(() => {
    if (activeTab === 'horas_extra') {
      loadPendingOvertime().then((requests) => {
        setPendingOvertimeCount(requests?.length || 0);
      });
    }
  }, [activeTab, loadPendingOvertime, setPendingOvertimeCount]);

  const tabCounts = useMemo(() => ({
    hoy: statsHoy.total,
    total: asistencia.length,
    prevencion: 0,
    proyectos: proyectosCount,
    horas_extra: pendingOvertimeCount,
    jornada: 0,
  }), [statsHoy, asistencia, proyectosCount, pendingOvertimeCount]);

  const selectedRange = useMemo(
    () => resolvePeriodRange(calendarDate, selectedPeriod),
    [calendarDate, selectedPeriod],
  );

  const cargoOptions = useMemo(() => {
    const cargos = trabajadoresHoy
      .map((trabajador) => trabajador.cargo)
      .filter(Boolean);

    return ['Todas', ...new Set(cargos)];
  }, [trabajadoresHoy]);

  const filteredAsistencias = useMemo(() => {
    let rows = asistencia;

    if (selectedOrigin === 'Captura app') {
      rows = rows.filter((r) => r.photo_path && r.photo_path !== 'manual-entry');
    } else if (selectedOrigin === 'Registro manual') {
      rows = rows.filter((r) => r.photo_path === 'manual-entry');
    }

    if (searchAsistencias) {
      const term = searchAsistencias.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.trabajador_nombre || '').toLowerCase().includes(term)
          || (r.dni || '').includes(term)
          || (r.cargo || '').toLowerCase().includes(term),
      );
    }

    return rows;
  }, [asistencia, selectedOrigin, searchAsistencias]);

  const groupedAsistencias = useMemo(() => {
    const groups = {};
    for (const record of filteredAsistencias) {
      const key = record.fecha || 'Sin fecha';
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredAsistencias]);

  useEffect(() => {
    loadAsistencias(selectedRange);
  }, [loadAsistencias, selectedRange]);

  const loadCalendarResumen = useCallback((targetDate, isBackground = false) => {
    if (!targetDate) return;

    if (!isBackground) {
      setCalendarLoading(true);
    }

    fetch(`/api/asistenciakrsft/resumen-dia?fecha=${targetDate}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setCalendarResumen({
            fecha: result.fecha,
            total_trabajadores: result.total_trabajadores ?? 0,
            total_presentes: result.total_presentes ?? 0,
            total_ausentes: result.total_ausentes ?? 0,
            trabajadores: result.trabajadores || [],
          });
          return;
        }

        setCalendarResumen((prev) => ({
          ...prev,
          fecha: targetDate,
          total_presentes: 0,
          total_ausentes: prev.total_trabajadores,
          trabajadores: [],
        }));
      })
      .catch(() => {
        setCalendarResumen((prev) => ({
          ...prev,
          fecha: targetDate,
          total_presentes: 0,
          total_ausentes: prev.total_trabajadores,
          trabajadores: [],
        }));
      })
      .finally(() => {
        if (!isBackground) {
          setCalendarLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    if (activeTab !== 'asistencias' || !calendarDate) return;
    loadCalendarResumen(calendarDate);
  }, [activeTab, calendarDate, loadCalendarResumen]);

  useEffect(() => {
    if (activeTab !== 'asistencias') return;

    const interval = setInterval(() => {
      loadAsistencias(selectedRange);
      loadCalendarResumen(calendarDate, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, calendarDate, selectedRange, loadAsistencias, loadCalendarResumen]);

  useEffect(() => {
    if (activeTab !== 'hoy') return;

    const interval = setInterval(() => {
      loadHoy();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, loadHoy]);

  useEffect(() => {
    const handleFocusRefresh = () => {
      if (activeTab === 'asistencias') {
        loadAsistencias(selectedRange);
        loadCalendarResumen(calendarDate);
      }
      if (activeTab === 'hoy') {
        loadHoy();
      }
    };

    window.addEventListener('focus', handleFocusRefresh);
    return () => window.removeEventListener('focus', handleFocusRefresh);
  }, [activeTab, calendarDate, selectedRange, loadAsistencias, loadCalendarResumen, loadHoy]);

  const filteredTrabajadores = useMemo(() => {
    let rows = trabajadoresHoy;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        (trabajador) =>
          (trabajador.trabajador_nombre || '').toLowerCase().includes(term)
          || (trabajador.dni || '').includes(term),
      );
    }

    if (selectedCargo !== 'Todas') {
      rows = rows.filter((trabajador) => (trabajador.cargo || '') === selectedCargo);
    }

    if (selectedStatus === 'Registrado') {
      rows = rows.filter((trabajador) => Boolean(trabajador.id));
    }

    if (selectedStatus === 'Pendiente') {
      rows = rows.filter((trabajador) => !trabajador.id);
    }

    return rows;
  }, [trabajadoresHoy, searchTerm, selectedCargo, selectedStatus]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 1300);
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleOpenEdit = (asistencia) => {
    setEditingAsistencia(asistencia?.id ? asistencia : { ...asistencia, _new: true });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAsistencia(null);
  };

  const handleSubmit = async (payload) => {
    let result;
    if (editingAsistencia && !editingAsistencia._new) {
      result = await updateAsistencia(editingAsistencia.id, payload);
    } else {
      result = await createAsistencia(payload);
    }

    if (result.success) {
      await loadAsistencias(selectedRange);
      showToast(result.message || (editingAsistencia ? 'Registro actualizado' : 'Registro creado'));
      handleCloseModal();
    }

    return result;
  };

  const handleDelete = async (id) => {
    const result = await deleteAsistencia(id);
    if (result.success) {
      await loadAsistencias(selectedRange);
    }
    showToast(result.message || (result.success ? 'Registro eliminado' : 'No se pudo eliminar'), result.success ? 'success' : 'error');
  };

  const handleExport = (exportConfig = null) => {
    if (filteredAsistencias.length === 0) {
      showToast('No hay registros para exportar en este período', 'warning');
      return;
    }

    const finalPeriod = exportConfig?.periodo || selectedPeriod;
    const finalDate = exportConfig?.fecha || calendarDate;
    const finalDesde = exportConfig?.fecha_desde || selectedRange.fecha_desde;
    const finalHasta = exportConfig?.fecha_hasta || selectedRange.fecha_hasta;

    const params = new URLSearchParams();
    params.set('periodo', finalPeriod);
    params.set('fecha', finalDate);
    if (finalDesde) params.set('fecha_desde', finalDesde);
    if (finalHasta) params.set('fecha_hasta', finalHasta);
    if (selectedOrigin && selectedOrigin !== 'Todos') params.set('origin', selectedOrigin);
    if (searchAsistencias) params.set('search', searchAsistencias);

    window.location.href = `/api/asistenciakrsft/export?${params.toString()}`;
  };

  // Overtime handlers
  const handleOpenOvertimeModal = (row) => {
    if (row && row.id) {
      setOvertimeModal({ open: true, attendanceRecordId: row.id, row });
    }
  };

  const handleCloseOvertimeModal = () => {
    setOvertimeModal({ open: false, attendanceRecordId: null, row: null });
  };

  const handleOvertimeSubmit = async (payload) => {
    const result = await createOvertimeRequest(payload);
    if (result.success) {
      showToast('Solicitud enviada exitosamente', 'success');
    } else {
      showToast(result.message || 'Error al crear solicitud', 'error');
    }
    return result;
  };

  const handleOvertimeSuccess = async () => {
    await loadAsistencias(selectedRange);
    await loadHoy();
  };

  const handlePendingOvertimeCountChange = useCallback((count) => {
    setPendingOvertimeCount(count);
  }, [setPendingOvertimeCount]);

  // Day click handler for General calendar view - opens DayAttendanceModal
  const handleDayClick = useCallback((dateStr) => {
    setDayAttendanceModal({ open: true, date: dateStr });
  }, []);

  const handleCloseDayAttendanceModal = useCallback(() => {
    setDayAttendanceModal({ open: false, date: null });
  }, []);

  return (
    <div className="asistencia-scroll-hidden h-screen overflow-y-auto bg-gray-50">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div role="alert" className={`rounded-md border p-4 shadow-lg ${
            toast.type === 'success' ? 'bg-green-50 border-green-500'
              : toast.type === 'error' ? 'bg-red-50 border-red-500'
                : 'bg-amber-50 border-amber-500'
          }`}>
            <div className="flex items-start gap-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className={`size-5 mt-0.5 ${toast.type === 'success' ? 'text-green-700' : toast.type === 'error' ? 'text-red-700' : 'text-amber-700'}`}
              >
                {toast.type === 'success'
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />}
              </svg>
              <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-800' : toast.type === 'error' ? 'text-red-800' : 'text-amber-800'}`}>
                {toast.message}
              </p>
              <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full px-12 py-4">
        <div className="space-y-6">
          <AsistenciaHeader onBack={handleBack} />

          <AsistenciaTabBar
            counts={tabCounts}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            auth={auth}
          />

          {activeTab === 'hoy' && (
            <div className="space-y-6">
              <div className="rounded-md border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="relative flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Buscar</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full rounded-md border border-gray-200 h-[38px] pl-9 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-[13px]"
                        placeholder="Buscar por nombre o DNI..."
                      />
                    </div>
                  </div>
                  <div className="w-[140px] shrink-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Cargo</label>
                    <CustomSelect
                      options={cargoOptions}
                      value={selectedCargo}
                      onChange={setSelectedCargo}
                      className="rounded-md border-gray-200 px-3 py-2 text-[13px] bg-white w-full h-[38px]"
                    />
                  </div>
                  <div className="w-[140px] shrink-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estado</label>
                    <CustomSelect
                      options={['Todos', 'Registrado', 'Pendiente']}
                      value={selectedStatus}
                      onChange={setSelectedStatus}
                      className="rounded-md border-gray-200 px-3 py-2 text-[13px] bg-white w-full h-[38px]"
                    />
                  </div>
                </div>
              </div>

              <AsistenciaTable
                asistencia={filteredTrabajadores}
                loading={loading}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                auth={auth}
                onRequestOvertime={handleOpenOvertimeModal}
              />
            </div>
          )}

          {activeTab === 'asistencias' && (
            <div className="space-y-4">
              {/* View Toggle */}
              <div className="flex items-center gap-2 rounded-lg border border-teal-100 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setCalendarView('general')}
                  className={`flex-1 rounded-md px-4 py-2 text-[13px] font-bold transition-colors ${
                    calendarView === 'general'
                      ? 'bg-teal-600 text-white'
                      : 'text-teal-700 hover:bg-teal-50'
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView('worker')}
                  className={`flex-1 rounded-md px-4 py-2 text-[13px] font-bold transition-colors ${
                    calendarView === 'worker'
                      ? 'bg-teal-600 text-white'
                      : 'text-teal-700 hover:bg-teal-50'
                  }`}
                >
                  Por Trabajador
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView('monthly')}
                  className={`flex-1 rounded-md px-4 py-2 text-[13px] font-bold transition-colors ${
                    calendarView === 'monthly'
                      ? 'bg-teal-600 text-white'
                      : 'text-teal-700 hover:bg-teal-50'
                  }`}
                >
                  Resumen Mensual
                </button>
              </div>

              {/* General View */}
              {calendarView === 'general' && (
                <>
                  <AsistenciaDayCalendar
                    selectedDate={calendarDate}
                    onDateChange={setCalendarDate}
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={setSelectedPeriod}
                    searchValue={searchAsistencias}
                    onSearchChange={setSearchAsistencias}
                    resumen={calendarResumen}
                    groupedAsistencias={groupedAsistencias}
                    onExport={handleExport}
                    loading={calendarLoading}
                    onDayClick={handleDayClick}
                  />
                  <DayAttendanceModal
                    isOpen={dayAttendanceModal.open}
                    onClose={handleCloseDayAttendanceModal}
                    date={dayAttendanceModal.date}
                  />
                </>
              )}

              {/* Worker View */}
              {calendarView === 'worker' && (
                <WorkerCalendar
                  selectedDate={calendarDate}
                  onDateChange={setCalendarDate}
                  selectedWorker={selectedWorker}
                  onWorkerSelect={handleWorkerSelect}
                  workers={workersList}
                  workerAttendanceSummary={workerAttendanceSummary}
                  loading={workerAttendanceLoading}
                />
              )}

              {/* Monthly General View */}
              {calendarView === 'monthly' && (
                <GeneralMonthlySummary
                  data={generalMonthlySummary}
                  loading={generalMonthlyLoading}
                  onMonthChange={loadGeneralMonthlySummary}
                  currentDate={calendarDate}
                />
              )}
            </div>
          )}

          {activeTab === 'prevencion' && (
            <PrevencionTab />
          )}

          <div className={activeTab === 'proyectos' ? '' : 'hidden'}>
            <ProyectosTab onCountChange={setProyectosCount} />
          </div>

          {activeTab === 'horas_extra' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Solicitudes Pendientes de Horas Extra</h3>
                <PendingOvertimeTable onCountChange={handlePendingOvertimeCountChange} />
              </div>
            </div>
          )}

          {activeTab === 'jornada' && (
            <div className="space-y-6">
              {/* Tipos de Jornada */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Tipos de Jornada</h3>
                  <button
                    onClick={() => setScheduleTypeModal({ open: true, editingType: null })}
                    className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
                  >
                    + Nueva Jornada
                  </button>
                </div>
                <ScheduleTypeList
                  key={scheduleTypeListKey}
                  onEdit={(type) => setScheduleTypeModal({ open: true, editingType: type })}
                  refreshTrigger={jornadaRefresh}
                />
              </div>

              {/* Asignación a Trabajadores */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Asignación a Trabajadores</h3>
                <WorkerScheduleTypeList refreshTrigger={jornadaRefresh} />
              </div>
            </div>
          )}
        </div>
      </div>

      <AsistenciaModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingAsistencia}
      />

      <OvertimeRequestModal
        isOpen={overtimeModal.open}
        onClose={handleCloseOvertimeModal}
        attendanceRecordId={overtimeModal.attendanceRecordId}
        onSuccess={handleOvertimeSuccess}
      />

      <ScheduleTypeFormModal
        isOpen={scheduleTypeModal.open}
        onClose={() => setScheduleTypeModal({ open: false, editingType: null })}
        initialData={scheduleTypeModal.editingType}
        onSuccess={(data) => {
          setJornadaRefresh((n) => n + 1);
          setScheduleTypeListKey((k) => k + 1);
        }}
      />

      <style>{`
        .asistencia-scroll-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .asistencia-scroll-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
