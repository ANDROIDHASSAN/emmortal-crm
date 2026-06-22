import { apiSlice } from '../../api/apiSlice';
import { qs } from '../inventory/inventoryApi';

export const reworkApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listBatteries: b.query({ query: (params) => `/batteries${qs(params)}`, providesTags: ['Battery'] }),
    createBattery: b.mutation({ query: (body) => ({ url: '/batteries', method: 'POST', body }), invalidatesTags: ['Battery'] }),
    batteryHistory: b.query({ query: (uniqueId) => `/batteries/${uniqueId}`, providesTags: ['Battery', 'Rework'] }),
    listReworks: b.query({ query: (params) => `/rework${qs(params)}`, providesTags: ['Rework'] }),
    createRework: b.mutation({ query: (body) => ({ url: '/rework', method: 'POST', body }), invalidatesTags: ['Rework', 'Battery', 'Item', 'StockMovement'] }),
    reworkLoss: b.query({ query: (params) => `/rework/loss${qs(params)}`, providesTags: ['Rework'] }),
    reworkAging: b.query({ query: (params) => `/rework/aging${qs(params)}`, providesTags: ['Rework'] }),
  }),
});

export const {
  useListBatteriesQuery, useCreateBatteryMutation, useBatteryHistoryQuery,
  useListReworksQuery, useCreateReworkMutation, useReworkLossQuery, useReworkAgingQuery,
} = reworkApi;
