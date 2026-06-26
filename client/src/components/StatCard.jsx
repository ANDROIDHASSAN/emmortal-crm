const ACCENTS = {
  brand: 'bg-brand-50 text-brand-700', slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-100 text-amber-700', emerald: 'bg-emerald-100 text-emerald-700', red: 'bg-red-100 text-red-700',
};

export default function StatCard({ label, value, sub, icon, accent = 'brand' }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        {icon && <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${ACCENTS[accent]}`}>{icon}</span>}
      </div>
    </div>
  );
}
