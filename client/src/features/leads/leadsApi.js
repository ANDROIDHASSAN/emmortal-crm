import { apiSlice } from '../../api/apiSlice';
import { qs } from '../inventory/inventoryApi';

export const leadsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listLeads: b.query({ query: (params) => `/leads${qs(params)}`, providesTags: ['Lead'] }),
    leadBoard: b.query({ query: () => '/leads/board', providesTags: ['Lead'] }),
    createLead: b.mutation({ query: (body) => ({ url: '/leads', method: 'POST', body }), invalidatesTags: ['Lead'] }),
    updateLead: b.mutation({ query: ({ id, ...body }) => ({ url: `/leads/${id}`, method: 'PATCH', body }), invalidatesTags: ['Lead'] }),
    importCsv: b.mutation({ query: (formData) => ({ url: '/leads/import-csv', method: 'POST', body: formData }), invalidatesTags: ['Lead'] }),
  }),
});

export const {
  useListLeadsQuery, useLeadBoardQuery, useCreateLeadMutation, useUpdateLeadMutation, useImportCsvMutation,
} = leadsApi;
