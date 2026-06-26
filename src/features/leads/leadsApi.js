import { apiSlice } from '../../api/apiSlice';
import { qs } from '../../lib/format';

export const leadsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listLeads: b.query({ query: (p) => `/leads${qs(p)}`, providesTags: ['Lead'] }),
    leadBoard: b.query({ query: () => '/leads/board', providesTags: ['Lead'] }),
    createLead: b.mutation({ query: (body) => ({ url: '/leads', method: 'POST', body }), invalidatesTags: ['Lead'] }),
    updateLead: b.mutation({ query: ({ id, ...body }) => ({ url: `/leads/${id}`, method: 'PATCH', body }), invalidatesTags: ['Lead'] }),
    importCsv: b.mutation({ query: (fd) => ({ url: '/leads/import-csv', method: 'POST', body: fd }), invalidatesTags: ['Lead'] }),
  }),
});
export const { useListLeadsQuery, useLeadBoardQuery, useCreateLeadMutation, useUpdateLeadMutation, useImportCsvMutation } = leadsApi;
