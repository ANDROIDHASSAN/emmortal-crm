export default function DataTable({ columns, rows, emptyText = 'No data.', loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            {columns.map((c) => <th key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">{emptyText}</td></tr>}
          {!loading && rows.map((r, i) => (
            <tr key={r._id || r.id || i} className="border-b border-slate-50 hover:bg-slate-50">
              {columns.map((c) => <td key={c.key} className={`px-3 py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
