export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ children, color = 'bg-slate-100 text-slate-600' }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{children}</span>;
}

export function Field({ label, children }) {
  return <div className="mb-3"><label className="label">{label}</label>{children}</div>;
}

export function SectionCard({ title, children, actions }) {
  return (
    <div className="card mb-6 p-5 sm:p-6">
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-base font-bold text-slate-800">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
