import { apiSlice } from '../../api/apiSlice';

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    dashboardSummary: b.query({ query: () => '/dashboard/summary', providesTags: ['Dashboard'] }),
    dashboardCharts: b.query({ query: () => '/dashboard/charts', providesTags: ['Dashboard'] }),
  }),
});

export const { useDashboardSummaryQuery, useDashboardChartsQuery } = dashboardApi;
