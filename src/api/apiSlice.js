import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setUser, clearUser } from '../features/auth/authSlice';
import { API_BASE } from '../lib/config';

const rawBaseQuery = fetchBaseQuery({ baseUrl: API_BASE, credentials: 'include' });

// On 401, try one silent refresh then retry the original request.
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    const refresh = await rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extraOptions);
    if (refresh.data) { api.dispatch(setUser(refresh.data.data)); result = await rawBaseQuery(args, api, extraOptions); }
    else api.dispatch(clearUser());
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Item', 'StockMovement', 'Battery', 'Rework', 'AccountingEntry', 'Party', 'ProductionJob', 'Employee', 'Attendance', 'Lead', 'Product', 'User', 'Dashboard', 'Notification'],
  endpoints: () => ({}),
});

export default apiSlice;
