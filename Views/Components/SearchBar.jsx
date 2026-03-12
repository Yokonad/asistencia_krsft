import { useState, useCallback } from 'react';

export default function SearchBar({ value, onChange }) {
  const [input, setInput] = useState(value);

  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      setInput(val);
      onChange(val);
    },
    [onChange]
  );

  return (
    <label htmlFor="cecos-search" className="block">
      <span className="sr-only">Buscar centros de costo</span>
      <div className="relative">
        <input
          id="cecos-search"
          type="text"
          placeholder="Buscar por código o nombre..."
          value={input}
          onChange={handleChange}
          className="w-full rounded border-gray-300 py-2 pe-10 ps-4 shadow-sm text-sm focus:border-teal-500 focus:ring-teal-500"
        />
        <span className="absolute inset-y-0 end-0 grid place-content-center px-3 text-gray-400 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
      </div>
    </label>
  );
}
