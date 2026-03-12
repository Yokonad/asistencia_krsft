import { createPortal } from 'react-dom';
import clsx from 'clsx';

/**
 * Componente Modal base
 * @param {Object} props
 * @param {boolean} props.isOpen - Mostrar modal
 * @param {Function} props.onClose - Callback para cerrar
 * @param {React.ReactNode} props.children - Contenido del modal
 * @param {string} props.size - sm, md, lg, xl
 */
function Modal({ isOpen, onClose, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={clsx('relative bg-white rounded-lg shadow-lg', sizeClasses[size])}>
        {children}
      </div>
    </div>,
    document.body
  );
}

/**
 * Header del modal
 */
Modal.Header = function ModalHeader({ title, titleIcon, onClose }) {
  return (
    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {titleIcon && <span className={clsx(titleIcon, 'text-lg')} />}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Body del modal
 */
Modal.Body = function ModalBody({ children }) {
  return <div className="px-6 py-4">{children}</div>;
};

/**
 * Footer del modal
 */
Modal.Footer = function ModalFooter({ children }) {
  return (
    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
      {children}
    </div>
  );
};

export default Modal;
