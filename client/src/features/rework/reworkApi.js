import { apiSlice } from '../../api/apiSlice';
import { qs } from '../../lib/format';

export const reworkApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listBatteries: b.query({ query: (p) => `/batteries${qs(p)}`, providesTags: ['Battery'] }),
    createBattery: b.mutation({ query: (body) => ({ url: '/batteries', method: 'POST', body }), invalidatesTags: ['Battery'] }),
    batteryHistory: b.query({ query: (uniqueId) => `/batteries/${uniqueId}`, providesTags: ['Battery', 'Rework'] }),
    listReworks: b.query({ query: (p) => `/rework${qs(p)}`, providesTags: ['Rework'] }),
    createRework: b.mutation({ query: (body) => ({ url: '/rework', method: 'POST', body }), invalidatesTags: ['Rework', 'Battery', 'Item', 'StockMovement'] }),
    reworkLoss: b.query({ query: (p) => `/rework/loss${qs(p)}`, providesTags: ['Rework'] }),
    reworkAging: b.query({ query: (p) => `/rework/aging${qs(p)}`, providesTags: ['Rework'] }),
  }),
});
export const { useListBatteriesQuery, useCreateBatteryMutation, useBatteryHistoryQuery, useListReworksQuery, useCreateReworkMutation, useReworkLossQuery, useReworkAgingQuery } = reworkApi;
