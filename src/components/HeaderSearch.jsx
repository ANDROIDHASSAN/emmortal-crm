import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

// Quick-jump search: filters the app's sections by keyword and navigates.
// Enter jumps to the top match; ↑/↓ move the highlight; Esc closes.
export default function HeaderSearch({ items }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  const query = q.trim().toLowerCase();
  const matches = query
    ? items.filter((n) => n.label.toLowerCase().includes(query))
    : [];

  useEffect(() => {
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const go = (item) => {
    if (!item) return;
    navigate(item.to);
    setQ(''); setOpen(false); setActive(0);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(matches[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={boxRef} className="relative hidden max-w-md flex-1 md:block">
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => q && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search pages…"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">⌘F</kbd>

      {open && query && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 animate-fade-in overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-pop">
          {matches.length === 0 && <p className="px-4 py-4 text-center text-sm text-slate-400">No matching pages</p>}
          {matches.map((n, i) => (
            <button
              key={n.to}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(n)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${i === active ? 'bg-brand-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon name={n.icon} className={`h-4 w-4 shrink-0 ${i === active ? 'text-brand-600' : 'text-slate-400'}`} />
              <span className="truncate">{n.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
