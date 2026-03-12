import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

function StatCard({ title, value, icon, iconBg, iconColor }) {
  return (
    <article className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`inline-flex size-9 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold text-gray-900 leading-tight">{value}</p>
          <p className="text-xs text-gray-500 truncate mt-1">{title}</p>
        </div>
      </div>
    </article>
  );
}

export default function AsistenciaStats({ total, presentes, ausentes, hoy }) {
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Registros"
        value={total}
        icon={<ClipboardDocumentListIcon className="size-4" />}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
      />
      <StatCard
        title="Presentes"
        value={presentes}
        icon={<CheckCircleIcon className="size-4" />}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
      />
      <StatCard
        title="Ausentes"
        value={ausentes}
        icon={<XCircleIcon className="size-4" />}
        iconBg="bg-red-100"
        iconColor="text-red-600"
      />
      <StatCard
        title="Registros Hoy"
        value={hoy}
        icon={<CalendarDaysIcon className="size-4" />}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
      />
    </section>
  );
}
