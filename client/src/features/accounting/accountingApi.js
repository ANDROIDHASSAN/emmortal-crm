import { apiSlice } from '../../api/apiSlice';
import { qs } from '../../lib/format';

export const accountingApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listEntries: b.query({ query: (p) => `/accounting/entries${qs(p)}`, providesTags: ['AccountingEntry'] }),
    entrySummary: b.query({ query: (p) => `/accounting/summary${qs(p)}`, providesTags: ['AccountingEntry'] }),
    createEntry: b.mutation({ query: (body) => ({ url: '/accounting/entries', method: 'POST', body }), invalidatesTags: ['AccountingEntry'] }),
    listParties: b.query({ query: (p) => `/accounting/parties${qs(p)}`, providesTags: ['Party'] }),
    createParty: b.mutation({ query: (body) => ({ url: '/accounting/parties', method: 'POST', body }), invalidatesTags: ['Party'] }),
    partyLedger: b.query({ query: (id) => `/accounting/parties/${id}/ledger`, providesTags: ['AccountingEntry', 'Party'] }),
    tallyLogs: b.query({ query: () => '/accounting/tally/logs', providesTags: ['AccountingEntry'] }),
    tallySync: b.mutation({ query: (fd) => ({ url: '/accounting/tally/sync', method: 'POST', body: fd }), invalidatesTags: ['AccountingEntry', 'Party'] }),
  }),
});
export const { useListEntriesQuery, useEntrySummaryQuery, useCreateEntryMutation, useListPartiesQuery, useCreatePartyMutation, usePartyLedgerQuery, useTallyLogsQuery, useTallySyncMutation } = accountingApi;
