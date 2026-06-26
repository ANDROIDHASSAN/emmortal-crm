import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext({ success: () => {}, error: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((type, msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const api = { success: (m) => push('success', m), error: (m) => push('error', m) };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${t.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
