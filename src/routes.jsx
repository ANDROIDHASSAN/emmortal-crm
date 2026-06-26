import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Rework from './pages/Rework';
import Accounting from './pages/Accounting';
import Production from './pages/Production';
import HR from './pages/HR';
import Products from './pages/Products';
import Leads from './pages/Leads';
import Settings from './pages/Settings';

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: <ProtectedRoute><Layout /></ProtectedRoute>,
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'inventory', element: <Inventory /> },
        { path: 'rework', element: <Rework /> },
        { path: 'accounting', element: <ProtectedRoute roles={['admin', 'manager']}><Accounting /></ProtectedRoute> },
        { path: 'production', element: <Production /> },
        { path: 'hr', element: <ProtectedRoute roles={['admin', 'manager']}><HR /></ProtectedRoute> },
        { path: 'products', element: <ProtectedRoute roles={['admin', 'manager']}><Products /></ProtectedRoute> },
        { path: 'leads', element: <Leads /> },
        { path: 'settings', element: <ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute> },
      ],
    },
    // Unknown paths → redirect to the dashboard (instead of the default error boundary).
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  {
    // Derive the router basename from Vite's resolved base ('/app/' single-origin, '/' on Vercel).
    basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
    // Opt in to React Router v7 behaviour now (v7_startTransition is set on
    // <RouterProvider> in main.jsx; this one belongs on the data router).
    future: { v7_relativeSplatPath: true },
  }
);

export default router;
