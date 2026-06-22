import { apiSlice } from '../../api/apiSlice';
import { qs } from '../inventory/inventoryApi';

export const accountingApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listEntries: b.query({ query: (params) => `/accounting/entries${qs(params)}`, providesTags: ['AccountingEntry'] }),
    entrySummary: b.query({ query: (params) => `/accounting/summary${qs(params)}`, providesTags: ['AccountingEntry'] }),
    createEntry: b.mutation({ query: (body) => ({ url: '/accounting/entries', method: 'POST', body }), invalidatesTags: ['AccountingEntry'] }),
    listParties: b.query({ query: (params) => `/accounting/parties${qs(params)}`, providesTags: ['Party'] }),
    createParty: b.mutation({ query: (body) => ({ url: '/accounting/parties', method: 'POST', body }), invalidatesTags: ['Party'] }),
    partyLedger: b.query({ query: (id) => `/accounting/parties/${id}/ledger`, providesTags: ['AccountingEntry', 'Party'] }),
    tallyLogs: b.query({ query: () => '/accounting/tally/logs', providesTags: ['AccountingEntry'] }),
    tallySync: b.mutation({
      query: (formData) => ({ url: '/accounting/tally/sync', method: 'POST', body: formData }),
      invalidatesTags: ['AccountingEntry', 'Party'],
    }),
  }),
});

export const {
  useListEntriesQuery, useEntrySummaryQuery, useCreateEntryMutation,
  useListPartiesQuery, useCreatePartyMutation, usePartyLedgerQuery,
  useTallyLogsQuery, useTallySyncMutation,
} = accountingApi;
