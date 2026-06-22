import { apiSlice } from '../../api/apiSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    login: b.mutation({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
    logout: b.mutation({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
    me: b.query({ query: () => '/auth/me' }),
    listUsers: b.query({ query: () => '/auth/users', providesTags: ['User'] }),
    createUser: b.mutation({ query: (body) => ({ url: '/auth/users', method: 'POST', body }), invalidatesTags: ['User'] }),
    updateUser: b.mutation({ query: ({ id, ...body }) => ({ url: `/auth/users/${id}`, method: 'PATCH', body }), invalidatesTags: ['User'] }),
  }),
});

export const {
  useLoginMutation, useLogoutMutation, useMeQuery,
  useListUsersQuery, useCreateUserMutation, useUpdateUserMutation,
} = authApi;
