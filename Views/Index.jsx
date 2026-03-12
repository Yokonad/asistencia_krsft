import { useMemo, useState } from 'react';
import { useAsistenciaData } from './hooks/useAsistenciaData';
import AsistenciaTable from './Components/AsistenciaTable';
import AsistenciaHeader from './Components/AsistenciaHeader';
import AsistenciaStats from './Components/AsistenciaStats';
import AsistenciaTabBar from './Components/AsistenciaTabBar';
import AsistenciaModal from './Components/AsistenciaModal';

export default function Index({ auth }) {
  const { asistencias, loading, error, createAsistencia, updateAsistencia, deleteAsistencia } = useAsistenciaData(auth);

  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAsistencia, setEditingAsistencia] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    return {
      total: asistencias.length,
      presentes: asistencias.filter(a => a.estado).length,
      ausentes: asistencias.filter(a => !a.estado).length,
      hoy: asistencias.filter(a => a.fecha === today).length,
    };
  }, [asistencias, today]);

  const tabCounts = useMemo(() => ({
    total: asistencias.length,
  }), [asistencias]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 1300);
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleOpenCreate = () => {
    setEditingAsistencia(null);
    setShowModal(true);
  };

  const handleOpenEdit = (asistencia) => {
    setEditingAsistencia(asistencia);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAsistencia(null);
  };

  const handleSubmit = async (payload) => {
    let result;
    if (editingAsistencia) {
      result = await updateAsistencia(editingAsistencia.id, payload);
    } else {
      result = await createAsistencia(payload);
    }

    if (result.success) {
      showToast(result.message || (editingAsistencia ? 'Registro actualizado' : 'Registro creado'));
      handleCloseModal();
    }

    return result;
  };

  const handleDelete = async (id) => {
    const result = await deleteAsistencia(id);
    showToast(result.message || (result.success ? 'Registro eliminado' : 'No se pudo eliminar'), result.success ? 'success' : 'error');
  };

  return (
    <div className="asistencia-scroll-hidden h-screen overflow-y-auto bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div role="alert" className={`rounded-md border p-4 shadow-lg ${
            toast.type === 'success' ? 'bg-green-50 border-green-500' :
            toast.type === 'error'   ? 'bg-red-50 border-red-500' :
                                       'bg-amber-50 border-amber-500'
          }`}>
            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                stroke="currentColor"
                className={`size-5 mt-0.5 ${toast.type === 'success' ? 'text-green-700' : toast.type === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                {toast.type === 'success'
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                }
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

      {/* Content */}
      <div className="w-full px-12 py-4">
        <div className="space-y-6">
          <AsistenciaHeader onBack={handleBack} onCreate={handleOpenCreate} />

          <AsistenciaStats
            total={stats.total}
            presentes={stats.presentes}
            ausentes={stats.ausentes}
            hoy={stats.hoy}
          />

          <AsistenciaTabBar counts={tabCounts} />

          {/* Error */}
          {error && (
            <div role="alert" className="rounded-md border border-red-500 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-red-700 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          <AsistenciaTable
            asistencias={asistencias}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <AsistenciaModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingAsistencia}
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
