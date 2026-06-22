import { apiSlice } from '../../api/apiSlice';
import { qs } from '../inventory/inventoryApi';

export const hrApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listEmployees: b.query({ query: (params) => `/employees${qs(params)}`, providesTags: ['Employee'] }),
    createEmployee: b.mutation({ query: (body) => ({ url: '/employees', method: 'POST', body }), invalidatesTags: ['Employee'] }),
    updateEmployee: b.mutation({ query: ({ id, ...body }) => ({ url: `/employees/${id}`, method: 'PATCH', body }), invalidatesTags: ['Employee'] }),
    listAttendance: b.query({ query: (params) => `/attendance${qs(params)}`, providesTags: ['Attendance'] }),
    addManualAttendance: b.mutation({ query: (body) => ({ url: '/attendance/manual', method: 'POST', body }), invalidatesTags: ['Attendance'] }),
    payroll: b.query({ query: (params) => `/hr/payroll${qs(params)}`, providesTags: ['Employee', 'Attendance'] }),
    esslSync: b.mutation({ query: (formData) => ({ url: '/hr/essl/sync', method: 'POST', body: formData }), invalidatesTags: ['Attendance'] }),
  }),
});

export const {
  useListEmployeesQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation,
  useListAttendanceQuery, useAddManualAttendanceMutation, usePayrollQuery, useEsslSyncMutation,
} = hrApi;
