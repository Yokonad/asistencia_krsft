import { memo } from 'react';
import { ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * ConfirmModal – Generic confirmation dialog (HyperUI style).
 * Uses cecoskrsft Modal API (isOpen instead of open).
 */
function ConfirmModal({
    isOpen,
    onClose,
    title,
    message,
    actionLabel = 'Aceptar',
    actionVariant = 'danger',
    processing = false,
    onConfirm,
}) {
    const isDanger = actionVariant === 'danger';
    const resolvedVariant = isDanger ? 'danger' : 'primary';
    const Icon = isDanger ? ExclamationTriangleIcon : QuestionMarkCircleIcon;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <div className="text-center px-6 py-6">
                <div className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${
                    isDanger ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                    <Icon className={`size-7 ${isDanger ? 'text-red-600' : 'text-blue-600'}`} />
                </div>

                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                <p className="mt-2 text-sm text-pretty text-gray-500 leading-relaxed">{message}</p>

                <footer className="mt-6 flex gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={processing} className="flex-1">
                        Cancelar
                    </Button>
                    <Button variant={resolvedVariant} onClick={onConfirm} disabled={processing} loading={processing} className="flex-1">
                        {processing ? 'Procesando...' : actionLabel}
                    </Button>
                </footer>
            </div>
        </Modal>
    );
}

export default memo(ConfirmModal);
