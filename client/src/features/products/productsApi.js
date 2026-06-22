import { apiSlice } from '../../api/apiSlice';
import { qs } from '../inventory/inventoryApi';

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listProducts: b.query({ query: (params) => `/products${qs(params)}`, providesTags: ['Product'] }),
    getProduct: b.query({ query: (id) => `/products/${id}`, providesTags: ['Product'] }),
    createProduct: b.mutation({ query: (body) => ({ url: '/products', method: 'POST', body }), invalidatesTags: ['Product'] }),
    updateProduct: b.mutation({ query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PATCH', body }), invalidatesTags: ['Product'] }),
  }),
});

export const { useListProductsQuery, useGetProductQuery, useCreateProductMutation, useUpdateProductMutation } = productsApi;
