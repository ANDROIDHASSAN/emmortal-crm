export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');
export const toDateInput = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
export const toDateTimeInput = (d = new Date()) => new Date(d).toISOString().slice(0, 16);
export const apiError = (e) => e?.data?.error?.message || e?.error || e?.message || 'Something went wrong';

// Shared query-string builder for RTK Query endpoints.
export const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null)).toString();
  return s ? `?${s}` : '';
};
