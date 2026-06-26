import { createBrowserRouter } from 'react-router-dom';
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
  ],
  // Derive the router basename from Vite's resolved base ('/app/' single-origin, '/' on Vercel).
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' }
);

export default router;
