const colorMap = {
  success: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-700' },
  warning: { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: 'text-amber-700' },
  error:   { bg: 'bg-red-100',     text: 'text-red-700',     icon: 'text-red-700' },
  info:    { bg: 'bg-blue-100',    text: 'text-blue-700',    icon: 'text-blue-700' },
  primary: { bg: 'bg-teal-100',    text: 'text-teal-700',    icon: 'text-teal-700' },
  secondary:{ bg: 'bg-gray-100',   text: 'text-gray-700',    icon: 'text-gray-700' },
};

export default function Badge({ children, color = 'primary', dismissible = false, onDismiss }) {
  const c = colorMap[color] ?? colorMap.secondary;

  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 ${c.bg} ${c.text}`}>
      <p className="text-sm whitespace-nowrap">{children}</p>
      {dismissible && (
        <button
          onClick={onDismiss}
          className={`ms-1.5 -me-1 inline-block rounded-full p-0.5 transition hover:opacity-70 ${c.icon}`}
        >
          <span className="sr-only">Quitar</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
