import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';

/**
 * WorkerSearchSelect - Search and select a worker from the active workforce.
 *
 * @param {object} props
 * @param {Function} props.onWorkerSelect - Callback: (worker|null) => void
 * @param {object|null} props.selectedWorker - Currently selected worker object or null
 * @param {Array} props.workers - Array of worker objects with id, nombre_completo, dni, cargo
 */
export default function WorkerSearchSelect({ onWorkerSelect, selectedWorker, workers = [], size = 'default' }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filteredWorkers = query.trim().length >= 1
    ? workers.filter(w => {
        const q = query.toLowerCase();
        return (
          (w.nombre_completo || '').toLowerCase().includes(q) ||
          (w.dni || '').includes(q)
        );
      }).slice(0, 10)
    : [];

  const handleSelect = (worker) => {
    setQuery('');
    setIsOpen(false);
    onWorkerSelect(worker);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    onWorkerSelect(null);
    inputRef.current?.focus();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If there's a selected worker, show a compact display instead of the search input
  if (selectedWorker && !query) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-slate-800 truncate">
            {selectedWorker.nombre_completo}
          </p>
          <p className="text-[11px] text-gray-500">
            DNI: {selectedWorker.dni}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Limpiar selección"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <MagnifyingGlassIcon className={`${size === 'large' ? 'h-5 w-5' : 'h-4 w-4'} text-gray-400`} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Ej: Juan Pérez o 7241..."
          className={`block w-full rounded-xl border border-gray-200 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all ${
            size === 'large' ? 'h-[52px] text-[15px] shadow-sm' : 'h-[38px] text-[13px]'
          }`}
        />
      </div>

      {isOpen && query.trim().length >= 1 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-100 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden">
          {filteredWorkers.length === 0 ? (
            <div className="px-4 py-4 text-center text-[13px] text-gray-500">
              No se encontraron trabajadores con ese nombre o DNI.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-2">
              {filteredWorkers.map((worker) => (
                <li key={worker.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(worker)}
                    className="w-full px-4 py-2.5 text-left hover:bg-teal-50/50 transition-colors"
                  >
                    <p className="text-[14px] font-bold text-slate-800">
                      {worker.nombre_completo}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      <span className="font-medium text-slate-600">DNI: {worker.dni}</span> · {worker.cargo || 'Sin cargo'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
