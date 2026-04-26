import { ArrowLeftIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

export default function AsistenciaHeader({ onBack }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6">
      <div className="flex items-center gap-4">
        <Button variant="primary" size="md" onClick={onBack} className="gap-2">
          <ArrowLeftIcon className="size-4" />
          Volver
        </Button>

        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
          <span className="flex items-center justify-center rounded-xl bg-primary p-2.5">
            <ClipboardDocumentListIcon className="size-6 text-white" />
          </span>
          <span>
            ASISTENCIA
            <p className="text-sm font-normal text-gray-500">Gestione los registros de asistencia del personal</p>
          </span>
        </h1>
      </div>
    </header>
  );
}
