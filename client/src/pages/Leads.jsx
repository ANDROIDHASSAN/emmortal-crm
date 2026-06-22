import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  useLeadBoardQuery, useListLeadsQuery, useCreateLeadMutation, useUpdateLeadMutation, useImportCsvMutation,
} from '../features/leads/leadsApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FileUpload from '../components/FileUpload';
import { PageHeader, Badge, Field } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDate, apiError } from '../lib/format';

const COLUMNS = [
  { key: 'new', title: 'New', color: 'border-t-blue-400' },
  { key: 'in_progress', title: 'In Progress', color: 'border-t-amber-400' },
  { key: 'won', title: 'Won', color: 'border-t-emerald-400' },
  { key: 'lost', title: 'Lost', color: 'border-t-red-400' },
];

const blank = { name: '', phone: '', email: '', productInterest: '', qty: 1, value: 0, source: 'manual', message: '' };

export default function Leads() {
  const toast = useToast();
  const [view, setView] = useState('kanban');
  const { data: board, refetch } = useLeadBoardQuery();
  const { data: list, isFetching } = useListLeadsQuery({ limit: 100 });
  const [createLead] = useCreateLeadMutation();
  const [updateLead] = useUpdateLeadMutation();
  const [importCsv, { isLoading: importing }] = useImportCsvMutation();

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [csvModal, setCsvModal] = useState(false);

  const columns = board?.data || { new: [], in_progress: [], won: [], lost: [] };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    try {
      // Persist new status + boardOrder. RTK invalidation refetches the board.
      await updateLead({ id: draggableId, status: destination.droppableId, boardOrder: destination.index }).unwrap();
    } catch (e) {
      toast.error(apiError(e));
      refetch(); // rollback to server state
    }
  };

  const save = async () => {
    try { await createLead(form).unwrap(); toast.success('Lead created'); setModal(false); setForm(blank); }
    catch (e) { toast.error(apiError(e)); }
  };
  const doImport = async (fd) => {
    try { const r = await importCsv(fd).unwrap(); toast.success(`Imported ${r.data.created} leads`); setCsvModal(false); }
    catch (e) { toast.error(apiError(e)); }
  };

  const cols = [
    { key: 'name', header: 'Name', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-slate-400">{r.phone} {r.email}</div></div> },
    { key: 'productInterest', header: 'Interest', render: (r) => r.productInterest || '—' },
    { key: 'source', header: 'Source', render: (r) => <Badge color="bg-slate-100 text-slate-600">{r.source}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
    { key: 'value', header: 'Value', align: 'right', render: (r) => inr(r.value) },
    { key: 'createdAt', header: 'Created', render: (r) => fmtDate(r.createdAt) },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <select className="input max-w-[140px]" value={r.status} onChange={async (e) => { try { await updateLead({ id: r._id, status: e.target.value }).unwrap(); } catch (er) { toast.error(apiError(er)); } }}>
        {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.title}</option>)}
      </select>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Leads" subtitle="Website enquiries land here instantly · drag across the board to update status"
        actions={
          <>
            <div className="flex rounded-lg border border-slate-300 p-0.5">
              <button className={`rounded px-3 py-1 text-sm ${view === 'kanban' ? 'bg-brand-600 text-white' : 'text-slate-600'}`} onClick={() => setView('kanban')}>Kanban</button>
              <button className={`rounded px-3 py-1 text-sm ${view === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600'}`} onClick={() => setView('list')}>List</button>
            </div>
            <button className="btn-ghost" onClick={() => setCsvModal(true)}>Import CSV</button>
            <button className="btn-primary" onClick={() => setModal(true)}>+ Lead</button>
          </>
        }
      />

      {view === 'kanban' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`card border-t-4 ${col.color} p-3 ${snapshot.isDraggingOver ? 'bg-brand-50' : ''}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-700">{col.title}</h3>
                      <span className="badge bg-slate-100 text-slate-500">{columns[col.key]?.length || 0}</span>
                    </div>
                    <div className="min-h-[80px] space-y-2">
                      {(columns[col.key] || []).map((lead, idx) => (
                        <Draggable draggableId={lead._id} index={idx} key={lead._id}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              className={`rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm ${snap.isDragging ? 'ring-2 ring-brand-400' : ''}`}>
                              <div className="font-medium text-slate-800">{lead.name}</div>
                              <div className="text-xs text-slate-400">{lead.productInterest || '—'}</div>
                              <div className="mt-2 flex items-center justify-between">
                                <Badge color="bg-slate-100 text-slate-500">{lead.source}</Badge>
                                <span className="text-xs font-semibold text-slate-600">{inr(lead.value)}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {(columns[col.key] || []).length === 0 && <p className="py-4 text-center text-xs text-slate-300">Drop leads here</p>}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <DataTable columns={cols} rows={list?.data || []} loading={isFetching} emptyText="No leads yet." />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New lead"
        footer={<><button className="btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Product interest"><input className="input" value={form.productInterest} onChange={(e) => setForm({ ...form, productInterest: e.target.value })} /></Field>
          <Field label="Qty"><input className="input" type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
          <Field label="Value (₹)"><input className="input" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
          <Field label="Source"><select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}><option value="manual">Manual</option><option value="reference">Reference</option><option value="website">Website</option></select></Field>
        </div>
        <Field label="Message"><textarea className="input" rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
      </Modal>

      <Modal open={csvModal} onClose={() => setCsvModal(false)} title="Import leads from CSV">
        <p className="mb-3 text-sm text-slate-500">CSV headers: <code className="rounded bg-slate-100 px-1">name, phone, email, productInterest, qty, value, message</code>. All rows imported with source=csv.</p>
        <FileUpload accept=".csv" label="Choose CSV" onUpload={doImport} busy={importing} />
      </Modal>
    </div>
  );
}
