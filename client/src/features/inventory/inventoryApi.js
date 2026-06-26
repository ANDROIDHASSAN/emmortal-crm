import { apiSlice } from '../../api/apiSlice';
import { qs } from '../../lib/format';

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listItems: b.query({ query: (p) => `/items${qs(p)}`, providesTags: ['Item'] }),
    createItem: b.mutation({ query: (body) => ({ url: '/items', method: 'POST', body }), invalidatesTags: ['Item'] }),
    updateItem: b.mutation({ query: ({ id, ...body }) => ({ url: `/items/${id}`, method: 'PATCH', body }), invalidatesTags: ['Item'] }),
    lowStock: b.query({ query: () => '/items/low-stock', providesTags: ['Item'] }),
    inventorySummary: b.query({ query: () => '/inventory/summary', providesTags: ['Item', 'StockMovement'] }),
    listMovements: b.query({ query: (p) => `/stock-movements${qs(p)}`, providesTags: ['StockMovement'] }),
    createMovement: b.mutation({ query: (body) => ({ url: '/stock-movements', method: 'POST', body }), invalidatesTags: ['Item', 'StockMovement'] }),
  }),
});
export const { useListItemsQuery, useCreateItemMutation, useUpdateItemMutation, useLowStockQuery, useInventorySummaryQuery, useListMovementsQuery, useCreateMovementMutation } = inventoryApi;
