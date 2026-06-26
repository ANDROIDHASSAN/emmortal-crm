// Centralized origins for the split deploy.
// Local dev / single-origin: both empty → relative URLs work via the Vite proxy / same host.
// Vercel: set VITE_API_URL (Render API) and VITE_SITE_URL (Render website).
export const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
export const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, ''); // storefront origin
