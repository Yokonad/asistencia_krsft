import clsx from 'clsx';
import { forwardRef } from 'react';

/**
 * Componente Input reutilizable
 * @param {Object} props
 * @param {string} props.label - Etiqueta
 * @param {string} props.placeholder - Placeholder
 * @param {string} props.value - Valor actual
 * @param {Function} props.onChange - Callback al cambiar
 * @param {string} props.error - Mensaje de error
 * @param {boolean} props.disabled - Deshabilitar
 * @param {string} props.type - Tipo de input
 */
const Input = forwardRef(
  (
    {
      label,
      placeholder,
      value,
      onChange,
      error,
      disabled = false,
      type = 'text',
      ...props
    },
    ref
  ) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={clsx(
            'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors',
            error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-white',
            disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed'
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
