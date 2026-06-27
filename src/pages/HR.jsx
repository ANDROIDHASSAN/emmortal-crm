import { useState } from 'react';
import {
  useListEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useListAttendanceQuery,
  useAddManualAttendanceMutation,
  usePayrollQuery,
  useEsslSyncMutation,
} from '../features/hr/hrApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FileUpload from '../components/FileUpload';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDate, fmtTime, toDateInput, toDateTimeInput, apiError } from '../lib/format';

const BLANK_EMPLOYEE = { code: '', name: '', designation: '', monthlySalary: 0, esslUserId: '', phone: '', active: true };

export default function HR() {
  const toast = useToast();
  const [tab, setTab] = useState('employees'); // 'employees' | 'attendance' | 'payroll'
  const [payMonth, setPayMonth] = useState(toDateInput().slice(0, 7)); // 'YYYY-MM'

  // Data
  const { data: employees } = useListEmployeesQuery({ limit: 200 });
  const { data: attendance } = useListAttendanceQuery({ limit: 100 });
  const { data: payroll } = usePayrollQuery({ month: payMonth });

  // Mutations
  const [createEmployee] = useCreateEmployeeMutation();
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [addManualAttendance] = useAddManualAttendanceMutation();
  const [esslSync, { isLoading: syncing }] = useEsslSyncMutation();

  // Employee create/edit modal: null (closed), {} (new), or { id } (editing).
  const [empModal, setEmpModal] = useState(null);
  const [empForm, setEmpForm] = useState(BLANK_EMPLOYEE);

  // Manual-attendance modal
  const [attModal, setAttModal] = useState(false);
  const [attForm, setAttForm] = useState({
    employee: '', date: toDateInput(), inTime: toDateTimeInput(), outTime: toDateTimeInput(),
  });

  // ── Actions ──────────────────────────────────────────────────────────────
  const openNewEmp = () => { setEmpForm(BLANK_EMPLOYEE); setEmpModal({}); };
  const openEditEmp = (emp) => { setEmpForm({ ...emp }); setEmpModal({ id: emp._id }); };

  const saveEmployee = async () => {
    try {
      if (empModal.id) await updateEmployee({ id: empModal.id, ...empForm }).unwrap();
      else await createEmployee(empForm).unwrap();
      toast.success('Employee saved');
      setEmpModal(null);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const saveAttendance = async () => {
    try {
      await addManualAttendance(attForm).unwrap();
      toast.success('Attendance saved');
      setAttModal(false);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  // Upload an eSSL biometric export; report how much was imported.
  const importEssl = async (formData) => {
    try {
      const r = await esslSync(formData).unwrap();
      const { daysUpserted, punches, unmappedUserIds } = r.data;
      const unmapped = unmappedUserIds.length ? `, ${unmappedUserIds.length} unmapped` : '';
      toast.success(`eSSL: ${daysUpserted} days from ${punches} punches${unmapped}`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  // ── Table columns ────────────────────────────────────────────────────────
  const employeeColumns = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono">{r.code}</span> },
    {
      key: 'name', header: 'Name',
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-slate-400">{r.designation}</div>
        </div>
      ),
    },
    { key: 'esslUserId', header: 'eSSL ID', render: (r) => r.esslUserId || '—' },
    { key: 'monthlySalary', header: 'Salary', align: 'right', render: (r) => inr(r.monthlySalary) },
    {
      key: 'active', header: '',
      render: (r) => (
        <Badge color={r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}>
          {r.active ? 'active' : 'inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEditEmp(r)}>Edit</button>,
    },
  ];

  const attendanceColumns = [
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
    { key: 'employee', header: 'Employee', render: (r) => r.employee?.name || '—' },
    { key: 'inTime', header: 'In', render: (r) => fmtTime(r.inTime) },
    { key: 'outTime', header: 'Out', render: (r) => fmtTime(r.outTime) },
    { key: 'workedMinutes', header: 'Hours', align: 'right', render: (r) => (r.workedMinutes / 60).toFixed(1) },
    { key: 'source', header: 'Src', render: (r) => <span className="text-xs text-slate-400">{r.source}</span> },
  ];

  const payrollColumns = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono">{r.employee.code}</span> },
    { key: 'name', header: 'Name', render: (r) => r.employee.name },
    { key: 'presentDays', header: 'Present', align: 'right', render: (r) => r.presentDays },
    { key: 'absentDays', header: 'Absent', align: 'right', render: (r) => (r.absentDays > 0 ? <Badge color="bg-red-100 text-red-700">{r.absentDays}</Badge> : 0) },
    { key: 'shortDays', header: 'Short (<8h)', align: 'right', render: (r) => (r.shortDays > 0 ? <Badge color="bg-amber-100 text-amber-700">{r.shortDays}</Badge> : 0) },
    { key: 'totalHours', header: 'Hours', align: 'right', render: (r) => r.totalHours },
    { key: 'salary', header: 'Salary', align: 'right', render: (r) => inr(r.monthlySalary) },
  ];

  return (
    <div>
      <PageHeader
        title="HR & Attendance"
        subtitle="Biometric (eSSL) attendance, employee master & payroll"
        actions={<button className="btn-primary" onClick={openNewEmp}>+ Employee</button>}
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {['employees', 'attendance', 'payroll'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <SectionCard><DataTable columns={employeeColumns} rows={employees?.data || []} emptyText="No employees." /></SectionCard>
      )}

      {tab === 'attendance' && (
        <div>
          <SectionCard title="eSSL biometric import">
            <p className="mb-3 text-sm text-slate-500">
              Upload the device punch export (.dat / .csv). First punch = in, last = out.
              Idempotent per employee+date; unmapped IDs are listed.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <FileUpload accept=".dat,.csv,.txt" label="Upload eSSL export" onUpload={importEssl} busy={syncing} />
              <button className="btn-ghost" onClick={() => setAttModal(true)}>+ Manual attendance</button>
            </div>
          </SectionCard>
          <SectionCard><DataTable columns={attendanceColumns} rows={attendance?.data || []} emptyText="No attendance records." /></SectionCard>
        </div>
      )}

      {tab === 'payroll' && (
        <SectionCard>
          <div className="mb-4 flex items-center gap-2">
            <label className="label mb-0">Month</label>
            <input className="input max-w-[180px]" type="month" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} />
            <span className="ml-auto font-semibold text-slate-700">Total: {inr(payroll?.data?.totalSalary)}</span>
          </div>
          <DataTable columns={payrollColumns} rows={payroll?.data?.rows || []} emptyText="No active employees." />
        </SectionCard>
      )}

      {/* Create / edit employee */}
      <Modal
        open={!!empModal}
        onClose={() => setEmpModal(null)}
        title={empModal?.id ? 'Edit employee' : 'New employee'}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setEmpModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveEmployee}>Save</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code">
            <input className="input" value={empForm.code} onChange={(e) => setEmpForm({ ...empForm, code: e.target.value })} />
          </Field>
          <Field label="Name">
            <input className="input" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} />
          </Field>
          <Field label="Designation">
            <input className="input" value={empForm.designation} onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })} />
          </Field>
          <Field label="Monthly salary">
            <input className="input" type="number" value={empForm.monthlySalary} onChange={(e) => setEmpForm({ ...empForm, monthlySalary: e.target.value })} />
          </Field>
          <Field label="eSSL User ID">
            <input className="input" value={empForm.esslUserId} onChange={(e) => setEmpForm({ ...empForm, esslUserId: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Manual attendance */}
      <Modal
        open={attModal}
        onClose={() => setAttModal(false)}
        title="Manual attendance"
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setAttModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveAttendance}>Save</button>
          </>
        )}
      >
        <Field label="Employee">
          <select className="input" value={attForm.employee} onChange={(e) => setAttForm({ ...attForm, employee: e.target.value })}>
            <option value="">Select…</option>
            {(employees?.data || []).map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
          </select>
        </Field>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <Field label="Date">
            <input className="input" type="date" value={attForm.date} onChange={(e) => setAttForm({ ...attForm, date: e.target.value })} />
          </Field>
          <Field label="In">
            <input className="input" type="datetime-local" value={attForm.inTime} onChange={(e) => setAttForm({ ...attForm, inTime: e.target.value })} />
          </Field>
          <Field label="Out">
            <input className="input" type="datetime-local" value={attForm.outTime} onChange={(e) => setAttForm({ ...attForm, outTime: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
