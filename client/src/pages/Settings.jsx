import { useState } from 'react';
import { useListUsersQuery, useCreateUserMutation, useUpdateUserMutation } from '../features/auth/authApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { apiError } from '../lib/format';

const blank = { name: '', email: '', password: '', role: 'staff' };

export default function Settings() {
  const toast = useToast();
  const { data: users } = useListUsersQuery();
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [modal, setModal] = useState(null);
  const [f, setF] = useState(blank);
  const [backupBusy, setBackupBusy] = useState(false);

  const save = async () => {
    try {
      if (modal.new) await createUser(f).unwrap();
      else await updateUser({ id: modal.id, name: f.name, role: f.role, active: f.active, ...(f.password ? { password: f.password } : {}) }).unwrap();
      toast.success('User saved'); setModal(null);
    } catch (e) { toast.error(apiError(e)); }
  };

  const runBackup = async () => {
    setBackupBusy(true);
    try {
      const r = await fetch('/api/v1/backup/run', { method: 'POST', credentials: 'include' });
      const j = await r.json();
      if (r.ok) toast.success(`Backup done: ${j.data.documents} docs, emailed to ${j.data.emailedTo}`);
      else toast.error(j.error?.message || 'Backup failed');
    } catch (e) { toast.error('Backup failed'); }
    setBackupBusy(false);
  };

  const cols = [
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'email', header: 'Email', render: (r) => r.email },
    { key: 'role', header: 'Role', render: (r) => <Badge color="bg-slate-100 text-slate-700">{r.role}</Badge> },
    { key: 'active', header: '', render: (r) => <Badge color={r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}>{r.active ? 'active' : 'inactive'}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setF({ name: r.name, email: r.email, role: r.role, active: r.active, password: '' }); setModal({ id: r.id }); }}>Edit</button> },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Users & system (admin only)"
        actions={<button className="btn-primary" onClick={() => { setF(blank); setModal({ new: true }); }}>+ User</button>} />

      <div className="space-y-6">
        <SectionCard title="Users & roles">
          <DataTable columns={cols} rows={users?.data || []} emptyText="No users." />
        </SectionCard>

        <SectionCard title="Database backup">
          <p className="mb-3 text-sm text-slate-500">A monthly backup is emailed automatically to <code className="rounded bg-slate-100 px-1">BACKUP_NOTIFY_EMAIL</code>. You can also run one now (gzipped JSON export of all collections).</p>
          <button className="btn-primary" disabled={backupBusy} onClick={runBackup}>{backupBusy ? 'Running…' : 'Run backup now'}</button>
        </SectionCard>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.new ? 'New user' : 'Edit user'}
        footer={<><button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={f.email} disabled={!modal?.new} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Role"><select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="admin">Admin</option><option value="manager">Manager</option><option value="staff">Staff</option></select></Field>
          <Field label={modal?.new ? 'Password' : 'New password (blank = keep)'}><input className="input" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          {!modal?.new && <Field label="Active"><select className="input" value={f.active ? 'true' : 'false'} onChange={(e) => setF({ ...f, active: e.target.value === 'true' })}><option value="true">Active</option><option value="false">Inactive</option></select></Field>}
        </div>
      </Modal>
    </div>
  );
}
