import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';
import authReducer from '../features/auth/authSlice';

// Import endpoint injections so they register on the apiSlice.
import '../features/auth/authApi';
import '../features/inventory/inventoryApi';
import '../features/rework/reworkApi';
import '../features/production/productionApi';
import '../features/accounting/accountingApi';
import '../features/hr/hrApi';
import '../features/leads/leadsApi';
import '../features/products/productsApi';
import '../features/dashboard/dashboardApi';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
  },
  middleware: (getDefault) => getDefault().concat(apiSlice.middleware),
});

export default store;
