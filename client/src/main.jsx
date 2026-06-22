import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from './app/store';
import { router } from './routes';
import { ToastProvider } from './components/Toast';
import { setUser, clearUser } from './features/auth/authSlice';
import './index.css';

// Bootstrap: ask the server who we are (cookie-based) before rendering routes.
function AuthBootstrap({ children }) {
  const dispatch = useDispatch();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch('/api/v1/auth/me', { credentials: 'include' });
        if (!active) return;
        if (r.ok) {
          const j = await r.json();
          dispatch(setUser(j.data));
        } else {
          // try refresh once
          const rr = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
          if (rr.ok) {
            const me = await fetch('/api/v1/auth/me', { credentials: 'include' });
            const j = await me.json();
            dispatch(setUser(j.data));
          } else {
            dispatch(clearUser());
          }
        }
      } catch {
        if (active) dispatch(clearUser());
      }
    })();
    return () => { active = false; };
  }, [dispatch]);
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <AuthBootstrap>
          <RouterProvider router={router} />
        </AuthBootstrap>
      </ToastProvider>
    </Provider>
  </React.StrictMode>
);
