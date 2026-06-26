import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider, useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from './app/store';
import { router } from './routes';
import { ToastProvider } from './components/Toast';
import { useMeQuery } from './features/auth/authApi';
import { setUser, setReady, clearUser } from './features/auth/authSlice';
import './index.css';

// Bootstrap: hydrate the session from /auth/me before rendering the router.
function Boot() {
  const dispatch = useDispatch();
  const { data, isError, isLoading } = useMeQuery();
  useEffect(() => {
    if (isLoading) return;
    if (data?.data) dispatch(setUser(data.data));
    else if (isError) { dispatch(clearUser()); }
    else dispatch(setReady());
  }, [data, isError, isLoading, dispatch]);
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <Boot />
      </ToastProvider>
    </Provider>
  </React.StrictMode>
);
