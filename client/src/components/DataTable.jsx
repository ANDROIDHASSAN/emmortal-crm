// Lightweight table with header, empty state, and optional pagination footer.
export function DataTable({ columns, rows, loading, emptyText = 'No records yet.', meta, onPage }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">{emptyText}</td></tr>
            )}
            {!loading && rows.map((row, i) => (
              <tr key={row._id || row.id || i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>Page {meta.page} of {meta.pages} · {meta.total} records</span>
          <div className="flex gap-2">
            <button className="btn-ghost px-3 py-1" disabled={meta.page <= 1} onClick={() => onPage?.(meta.page - 1)}>Prev</button>
            <button className="btn-ghost px-3 py-1" disabled={meta.page >= meta.pages} onClick={() => onPage?.(meta.page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
