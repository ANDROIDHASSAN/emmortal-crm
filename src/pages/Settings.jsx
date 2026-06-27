import { useState } from 'react';
import { useListUsersQuery, useCreateUserMutation, useUpdateUserMutation } from '../features/auth/authApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { apiError } from '../lib/format';
import { API_BASE } from '../lib/config';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

const BLANK_USER = { name: '', email: '', password: '', role: 'staff' };

export default function Settings() {
  const toast = useToast();
  const { data: users } = useListUsersQuery();
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();

  // `modal` is null (closed), { new: true } (creating), or { id } (editing).
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK_USER);
  const [backupBusy, setBackupBusy] = useState(false);

  const openNew = () => { setForm(BLANK_USER); setModal({ new: true }); };

  const openEdit = (user) => {
    setForm({ name: user.name, email: user.email, role: user.role, active: user.active, password: '' });
    setModal({ id: user.id });
  };

  const save = async () => {
    try {
      if (modal.new) {
        await createUser(form).unwrap();
      } else {
        // Email is immutable; only send a password when one was typed.
        await updateUser({
          id: modal.id,
          name: form.name,
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        }).unwrap();
      }
      toast.success('User saved');
      setModal(null);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const runBackup = async () => {
    setBackupBusy(true);
    try {
      const res = await fetch(`${API_BASE}/backup/run`, { method: 'POST', credentials: 'include' });
      const body = await res.json();
      if (res.ok) toast.success(`Backup done: ${body.data.documents} docs`);
      else toast.error(body.error?.message || 'Backup failed');
    } catch {
      toast.error('Backup failed');
    }
    setBackupBusy(false);
  };

  const columns = [
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'email', header: 'Email', render: (r) => r.email },
    { key: 'role', header: 'Role', render: (r) => <Badge>{r.role}</Badge> },
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
      render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(r)}>Edit</button>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Users & system (admin only)"
        actions={<button className="btn-primary" onClick={openNew}>+ User</button>}
      />

      <SectionCard title="Users & roles">
        <DataTable columns={columns} rows={users?.data || []} emptyText="No users." />
      </SectionCard>

      <SectionCard title="Database backup">
        <p className="mb-3 text-sm text-slate-500">
          A monthly backup is emailed automatically. Run one now (gzipped JSON export of all collections).
        </p>
        <button className="btn-primary" disabled={backupBusy} onClick={runBackup}>
          {backupBusy ? 'Running…' : 'Run backup now'}
        </button>
      </SectionCard>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.new ? 'New user' : 'Edit user'}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={save}>Save</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="input" value={form.email} disabled={!modal?.new} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Role">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label={modal?.new ? 'Password' : 'New password (blank = keep)'}>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {!modal?.new && (
            <Field label="Active">
              <select className="input" value={form.active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}
