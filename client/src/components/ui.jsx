// Small shared UI atoms used across pages.

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
  dispatched: 'bg-blue-100 text-blue-700',
  returned: 'bg-amber-100 text-amber-700',
  in_rework: 'bg-purple-100 text-purple-700',
  repaired: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-600',
  pending: 'bg-slate-200 text-slate-600',
  done: 'bg-emerald-100 text-emerald-700',
  on: 'bg-emerald-100 text-emerald-700',
  off: 'bg-slate-200 text-slate-600',
};

export function Badge({ children, color }) {
  const cls = color || statusColors[children] || 'bg-slate-100 text-slate-600';
  return <span className={`badge ${cls}`}>{String(children).replace(/_/g, ' ')}</span>;
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function SectionCard({ title, children, actions }) {
  return (
    <div className="card p-5">
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="font-semibold text-slate-700">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
