import { useState } from 'react';
import {
  useListEmployeesQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation,
  useListAttendanceQuery, useAddManualAttendanceMutation, usePayrollQuery, useEsslSyncMutation,
} from '../features/hr/hrApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FileUpload from '../components/FileUpload';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDate, fmtTime, toDateInput, toDateTimeInput, apiError } from '../lib/format';

const blank = { code: '', name: '', designation: '', monthlySalary: 0, esslUserId: '', phone: '', active: true };

export default function HR() {
  const toast = useToast();
  const [tab, setTab] = useState('employees');
  const month = toDateInput().slice(0, 7);
  const [payMonth, setPayMonth] = useState(month);

  const { data: employees } = useListEmployeesQuery({ limit: 200 });
  const { data: attendance } = useListAttendanceQuery({ limit: 100 });
  const { data: payroll } = usePayrollQuery({ month: payMonth });
  const [createEmployee] = useCreateEmployeeMutation();
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [addManual] = useAddManualAttendanceMutation();
  const [esslSync, { isLoading: syncing }] = useEsslSyncMutation();

  const [empModal, setEmpModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [attModal, setAttModal] = useState(false);
  const [att, setAtt] = useState({ employee: '', date: toDateInput(), inTime: toDateTimeInput(), outTime: toDateTimeInput() });

  const saveEmp = async () => {
    try {
      if (empModal.new) await createEmployee(form).unwrap();
      else await updateEmployee({ id: empModal.id, ...form }).unwrap();
      toast.success('Employee saved'); setEmpModal(null);
    } catch (e) { toast.error(apiError(e)); }
  };
  const saveAtt = async () => {
    try { await addManual(att).unwrap(); toast.success('Attendance saved'); setAttModal(false); }
    catch (e) { toast.error(apiError(e)); }
  };
  const doSync = async (fd) => {
    try { const r = await esslSync(fd).unwrap(); toast.success(`eSSL: ${r.data.daysUpserted} days from ${r.data.punches} punches${r.data.unmappedUserIds.length ? `, ${r.data.unmappedUserIds.length} unmapped` : ''}`); }
    catch (e) { toast.error(apiError(e)); }
  };

  const empCols = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono">{r.code}</span> },
    { key: 'name', header: 'Name', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-slate-400">{r.designation}</div></div> },
    { key: 'esslUserId', header: 'eSSL ID', render: (r) => r.esslUserId || '—' },
    { key: 'monthlySalary', header: 'Salary', align: 'right', render: (r) => inr(r.monthlySalary) },
    { key: 'active', header: '', render: (r) => <Badge color={r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}>{r.active ? 'active' : 'inactive'}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setForm({ ...r }); setEmpModal({ id: r._id }); }}>Edit</button> },
  ];

  const attCols = [
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
    { key: 'employee', header: 'Employee', render: (r) => r.employee?.name || '—' },
    { key: 'inTime', header: 'In', render: (r) => fmtTime(r.inTime) },
    { key: 'outTime', header: 'Out', render: (r) => fmtTime(r.outTime) },
    { key: 'workedMinutes', header: 'Hours', align: 'right', render: (r) => (r.workedMinutes / 60).toFixed(1) },
    { key: 'source', header: 'Src', render: (r) => <span className="text-xs text-slate-400">{r.source}</span> },
  ];

  const payCols = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono">{r.employee.code}</span> },
    { key: 'name', header: 'Name', render: (r) => r.employee.name },
    { key: 'presentDays', header: 'Present days', align: 'right', render: (r) => r.presentDays },
    { key: 'totalHours', header: 'Hours', align: 'right', render: (r) => r.totalHours },
    { key: 'salary', header: 'Monthly salary', align: 'right', render: (r) => inr(r.monthlySalary) },
  ];

  return (
    <div>
      <PageHeader title="HR & Attendance" subtitle="Biometric (eSSL) attendance, employee master & payroll"
        actions={<button className="btn-primary" onClick={() => { setForm(blank); setEmpModal({ new: true }); }}>+ Employee</button>} />

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {['employees', 'attendance', 'payroll'].map((t) => <button key={t} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'employees' && <DataTable columns={empCols} rows={employees?.data || []} emptyText="No employees yet." />}

      {tab === 'attendance' && (
        <div className="space-y-4">
          <SectionCard title="eSSL biometric import">
            <p className="mb-3 text-sm text-slate-500">Upload the device punch export (.dat / .csv). First punch = in, last = out, worked minutes computed. Idempotent per employee+date; unmapped device IDs are listed, not dropped.</p>
            <div className="flex flex-wrap items-center gap-3">
              <FileUpload accept=".dat,.csv,.txt" label="Choose eSSL export" onUpload={doSync} busy={syncing} />
              <button className="btn-ghost" onClick={() => setAttModal(true)}>+ Manual attendance</button>
            </div>
          </SectionCard>
          <DataTable columns={attCols} rows={attendance?.data || []} emptyText="No attendance records yet." />
        </div>
      )}

      {tab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="label mb-0">Month</label>
            <input className="input max-w-[180px]" type="month" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} />
            <span className="ml-auto font-semibold text-slate-700">Total payroll: {inr(payroll?.data?.totalSalary)}</span>
          </div>
          <DataTable columns={payCols} rows={payroll?.data?.rows || []} emptyText="No active employees." />
        </div>
      )}

      <Modal open={!!empModal} onClose={() => setEmpModal(null)} title={empModal?.new ? 'New employee' : 'Edit employee'}
        footer={<><button className="btn-ghost" onClick={() => setEmpModal(null)}>Cancel</button><button className="btn-primary" onClick={saveEmp}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code"><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Designation"><input className="input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
          <Field label="Monthly salary"><input className="input" type="number" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} /></Field>
          <Field label="eSSL User ID"><input className="input" value={form.esslUserId} onChange={(e) => setForm({ ...form, esslUserId: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Active"><select className="input" value={form.active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}><option value="true">Active</option><option value="false">Inactive</option></select></Field>
        </div>
      </Modal>

      <Modal open={attModal} onClose={() => setAttModal(false)} title="Manual attendance"
        footer={<><button className="btn-ghost" onClick={() => setAttModal(false)}>Cancel</button><button className="btn-primary" onClick={saveAtt}>Save</button></>}>
        <Field label="Employee"><select className="input" value={att.employee} onChange={(e) => setAtt({ ...att, employee: e.target.value })}><option value="">Select…</option>{(employees?.data || []).map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}</select></Field>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Field label="Date"><input className="input" type="date" value={att.date} onChange={(e) => setAtt({ ...att, date: e.target.value })} /></Field>
          <Field label="In"><input className="input" type="datetime-local" value={att.inTime} onChange={(e) => setAtt({ ...att, inTime: e.target.value })} /></Field>
          <Field label="Out"><input className="input" type="datetime-local" value={att.outTime} onChange={(e) => setAtt({ ...att, outTime: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
