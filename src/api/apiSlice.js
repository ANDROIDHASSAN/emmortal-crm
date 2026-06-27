import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setUser, clearUser } from '../features/auth/authSlice';
import { API_BASE } from '../lib/config';

const rawBaseQuery = fetchBaseQuery({ baseUrl: API_BASE, credentials: 'include' });

// Wraps every request: on a 401, silently try a token refresh once, then replay
// the original request. If the refresh also fails, log the user out.
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refresh = await rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, extraOptions);
    if (refresh.data) {
      api.dispatch(setUser(refresh.data.data));
      result = await rawBaseQuery(args, api, extraOptions); // replay the original request
    } else {
      api.dispatch(clearUser());
    }
  }

  return result;
};

// Cache tags let each mutation invalidate exactly the queries it affects.
const TAG_TYPES = [
  'Item', 'StockMovement', 'Battery', 'Rework', 'AccountingEntry', 'Party',
  'ProductionJob', 'Employee', 'Attendance', 'Lead', 'Product', 'User',
  'Dashboard', 'Notification',
];

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: TAG_TYPES,
  endpoints: () => ({}), // each feature injects its own endpoints (see src/features/*)
});

export default apiSlice;
