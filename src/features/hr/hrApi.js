import { apiSlice } from '../../api/apiSlice';
import { qs } from '../../lib/format';

export const hrApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listEmployees: b.query({ query: (p) => `/employees${qs(p)}`, providesTags: ['Employee'] }),
    createEmployee: b.mutation({ query: (body) => ({ url: '/employees', method: 'POST', body }), invalidatesTags: ['Employee'] }),
    updateEmployee: b.mutation({ query: ({ id, ...body }) => ({ url: `/employees/${id}`, method: 'PATCH', body }), invalidatesTags: ['Employee'] }),
    listAttendance: b.query({ query: (p) => `/attendance${qs(p)}`, providesTags: ['Attendance'] }),
    addManualAttendance: b.mutation({ query: (body) => ({ url: '/attendance/manual', method: 'POST', body }), invalidatesTags: ['Attendance'] }),
    payroll: b.query({ query: (p) => `/hr/payroll${qs(p)}`, providesTags: ['Employee', 'Attendance'] }),
    esslSync: b.mutation({ query: (fd) => ({ url: '/hr/essl/sync', method: 'POST', body: fd }), invalidatesTags: ['Attendance'] }),
  }),
});
export const { useListEmployeesQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation, useListAttendanceQuery, useAddManualAttendanceMutation, usePayrollQuery, useEsslSyncMutation } = hrApi;
