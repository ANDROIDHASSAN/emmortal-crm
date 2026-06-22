export function StatCard({ label, value, sub, accent = 'brand', icon }) {
  const colors = {
    brand: 'text-brand-700 bg-brand-50',
    red: 'text-red-600 bg-red-50',
    amber: 'text-amber-600 bg-amber-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    slate: 'text-slate-700 bg-slate-100',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        {icon && <div className={`rounded-lg p-2 text-xl ${colors[accent]}`}>{icon}</div>}
      </div>
    </div>
  );
}

export default StatCard;
