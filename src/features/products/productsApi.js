import { apiSlice } from '../../api/apiSlice';
import { qs } from '../../lib/format';

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listProducts: b.query({ query: (p) => `/products${qs(p)}`, providesTags: ['Product'] }),
    createProduct: b.mutation({ query: (body) => ({ url: '/products', method: 'POST', body }), invalidatesTags: ['Product'] }),
    updateProduct: b.mutation({ query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PATCH', body }), invalidatesTags: ['Product'] }),
  }),
});
export const { useListProductsQuery, useCreateProductMutation, useUpdateProductMutation } = productsApi;
