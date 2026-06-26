// Lightweight inline SVG icon set (stroke-based, inherits currentColor).
const PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  inventory: <><path d="M3.5 8 12 3l8.5 5v8L12 21l-8.5-5V8Z" /><path d="M3.5 8 12 13l8.5-5" /><path d="M12 13v8" /></>,
  rework: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z" /></>,
  accounting: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></>,
  production: <><path d="M3 21h18" /><path d="M4 21V10l5 3V10l5 3V7l5 3v11" /></>,
  hr: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 5.5" /><path d="M17 14.5a5.5 5.5 0 0 1 3.5 5.5" /></>,
  products: <><path d="M3 9h18l-1.4 9.3a2 2 0 0 1-2 1.7H6.4a2 2 0 0 1-2-1.7L3 9Z" /><path d="M8 9V7a4 4 0 0 1 8 0v2" /></>,
  leads: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2.6 14H2.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1A2 2 0 1 1 7.3 4l.1.1A1.6 1.6 0 0 0 9 4.6 1.6 1.6 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  arrowUpRight: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  download: <><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></>,
  upload: <><path d="M12 21V9" /><path d="m7 13 5-5 5 5" /><path d="M5 5h14" /></>,
  printer: <><path d="M6 9V3h12v6" /><rect x="5" y="9" width="14" height="8" rx="2" /><path d="M8 17h8v4H8z" /></>,
  battery: <><rect x="3" y="8" width="16" height="8" rx="2" /><path d="M22 11v2" /><path d="M7 11v2M11 11v2" /></>,
  chat: <><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z" /></>,
  trendUp: <><path d="m3 17 6-6 4 4 7-7" /><path d="M17 8h4v4" /></>,
  plug: <><path d="M9 2v6M15 2v6" /><path d="M7 8h10v3a5 5 0 0 1-10 0V8Z" /><path d="M12 16v6" /></>,
};

export default function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {path}
    </svg>
  );
}
