import Icon from './Icon';

// Donezo-style metric card: title, big value, sub line, and a corner arrow chip.
// `highlight` renders the filled-green variant used for the lead metric.
export default function StatCard({ label, value, sub, highlight = false }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card ${
        highlight ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200/80 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${highlight ? 'text-white/85' : 'text-slate-500'}`}>{label}</p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition group-hover:rotate-45 ${
            highlight ? 'border-white/40 text-white' : 'border-slate-200 text-slate-400'
          }`}
        >
          <Icon name="arrowUpRight" className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <p className={`mt-3 truncate text-3xl font-extrabold tracking-tight ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      {sub && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs ${highlight ? 'text-white/80' : 'text-slate-400'}`}>
          <Icon name="trendUp" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="truncate">{sub}</span>
        </p>
      )}
    </div>
  );
}
