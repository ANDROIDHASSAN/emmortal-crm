import { apiSlice } from '../../api/apiSlice';

export const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listNotifications: b.query({ query: () => '/notifications', providesTags: ['Notification'] }),
    unreadCount: b.query({ query: () => '/notifications/unread-count', providesTags: ['Notification'] }),
    markRead: b.mutation({ query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }), invalidatesTags: ['Notification'] }),
    markAllRead: b.mutation({ query: () => ({ url: '/notifications/read-all', method: 'POST' }), invalidatesTags: ['Notification'] }),
  }),
});
export const { useListNotificationsQuery, useUnreadCountQuery, useMarkReadMutation, useMarkAllReadMutation } = notificationsApi;
