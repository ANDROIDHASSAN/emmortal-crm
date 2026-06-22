import { apiSlice } from '../../api/apiSlice';
import { qs } from '../inventory/inventoryApi';

export const productionApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    dayBoard: b.query({ query: (date) => `/production/day/${date}`, providesTags: ['ProductionJob'] }),
    listJobs: b.query({ query: (params) => `/production${qs(params)}`, providesTags: ['ProductionJob'] }),
    createJob: b.mutation({ query: (body) => ({ url: '/production', method: 'POST', body }), invalidatesTags: ['ProductionJob'] }),
    updateJob: b.mutation({ query: ({ id, ...body }) => ({ url: `/production/${id}`, method: 'PATCH', body }), invalidatesTags: ['ProductionJob'] }),
  }),
});

export const { useDayBoardQuery, useListJobsQuery, useCreateJobMutation, useUpdateJobMutation } = productionApi;
