import { apiSlice } from '../../api/apiSlice';

const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null)).toString();
  return s ? `?${s}` : '';
};

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listItems: b.query({ query: (params) => `/items${qs(params)}`, providesTags: ['Item'] }),
    getItem: b.query({ query: (id) => `/items/${id}`, providesTags: ['Item'] }),
    createItem: b.mutation({ query: (body) => ({ url: '/items', method: 'POST', body }), invalidatesTags: ['Item'] }),
    updateItem: b.mutation({ query: ({ id, ...body }) => ({ url: `/items/${id}`, method: 'PATCH', body }), invalidatesTags: ['Item'] }),
    lowStock: b.query({ query: () => '/items/low-stock', providesTags: ['Item'] }),
    inventorySummary: b.query({ query: () => '/inventory/summary', providesTags: ['Item', 'StockMovement'] }),
    listMovements: b.query({ query: (params) => `/stock-movements${qs(params)}`, providesTags: ['StockMovement'] }),
    // Creating a movement changes qtyOnHand → invalidate both Item and StockMovement.
    createMovement: b.mutation({ query: (body) => ({ url: '/stock-movements', method: 'POST', body }), invalidatesTags: ['Item', 'StockMovement'] }),
  }),
});

export const {
  useListItemsQuery, useGetItemQuery, useCreateItemMutation, useUpdateItemMutation,
  useLowStockQuery, useInventorySummaryQuery, useListMovementsQuery, useCreateMovementMutation,
} = inventoryApi;

export { qs };
