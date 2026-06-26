import { apiSlice } from '../../api/apiSlice';

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    dashSummary: b.query({ query: () => '/dashboard/summary', providesTags: ['Dashboard'] }),
    dashCharts: b.query({ query: () => '/dashboard/charts', providesTags: ['Dashboard'] }),
  }),
});
export const { useDashSummaryQuery, useDashChartsQuery } = dashboardApi;
