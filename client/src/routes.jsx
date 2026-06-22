import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Rework from './pages/Rework';
import Production from './pages/Production';
import Accounting from './pages/Accounting';
import HR from './pages/HR';
import Leads from './pages/Leads';
import Products from './pages/Products';
import Settings from './pages/Settings';

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'inventory', element: <Inventory /> },
        { path: 'rework', element: <Rework /> },
        { path: 'production', element: <Production /> },
        { path: 'accounting', element: <ProtectedRoute roles={['admin', 'manager']}><Accounting /></ProtectedRoute> },
        { path: 'hr', element: <ProtectedRoute roles={['admin', 'manager']}><HR /></ProtectedRoute> },
        { path: 'leads', element: <Leads /> },
        { path: 'products', element: <Products /> },
        { path: 'settings', element: <ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute> },
      ],
    },
  ],
  { basename: '/app' }
);

export default router;
