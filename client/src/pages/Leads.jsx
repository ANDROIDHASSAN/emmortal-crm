import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useLeadBoardQuery, useListLeadsQuery, useCreateLeadMutation, useUpdateLeadMutation, useImportCsvMutation } from '../features/leads/leadsApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FileUpload from '../components/FileUpload';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDate, apiError } from '../lib/format';

const STATUSES = ['new', 'contacted', 'quotation', 'negotiation', 'won', 'lost'];
const LABEL = { new: 'New', contacted: 'Contacted', quotation: 'Quotation', negotiation: 'Negotiation', won: 'Won', lost: 'Lost' };
const ACCENT = { new: 'border-slate-300', contacted: 'border-blue-300', quotation: 'border-amber-300', negotiation: 'border-violet-300', won: 'border-emerald-300', lost: 'border-red-300' };
const srcColor = { website: 'bg-emerald-100 text-emerald-700', manual: 'bg-slate-100 text-slate-600', csv: 'bg-blue-100 text-blue-700', reference: 'bg-amber-100 text-amber-700', whatsapp: 'bg-green-100 text-green-700', phone: 'bg-violet-100 text-violet-700' };

const blank = { name: '', phone: '', email: '', productInterest: '', qty: 1, value: 0, source: 'manual' };

export default function Leads() {
  const toast = useToast();
  const [view, setView] = useState('kanban');
  const { data: boardData } = useLeadBoardQuery();
  const { data: listData } = useListLeadsQuery({ limit: 200 });
  const [createLead] = useCreateLeadMutation();
  const [updateLead] = useUpdateLeadMutation();
  const [importCsv, { isLoading: importing }] = useImportCsvMutation();
  const [modal, setModal] = useState(false);
  const [f, setF] = useState(blank);

  const columns = boardData?.data || {};
  const save = async () => { try { await createLead(f).unwrap(); toast.success('Lead added'); setModal(false); setF(blank); } catch (e) { toast.error(apiError(e)); } };
  const onDragEnd = (r) => { if (r.destination && r.destination.droppableId !== r.source.droppableId) updateLead({ id: r.draggableId, status: r.destination.droppableId }); };
  const doImport = async (fd) => { try { const r = await importCsv(fd).unwrap(); toast.success(`Imported ${r.data.created} leads`); } catch (e) { toast.error(apiError(e)); } };

  const listCols = [
    { key: 'name', header: 'Lead', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-slate-400">{r.phone} {r.email}</div></div> },
    { key: 'productInterest', header: 'Interest', render: (r) => r.productInterest || '—' },
    { key: 'value', header: 'Value', align: 'right', render: (r) => inr(r.value) },
    { key: 'source', header: 'Source', render: (r) => <Badge color={srcColor[r.source]}>{r.source}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <select className="input max-w-[150px] py-1 text-xs" value={r.status} onChange={(e) => updateLead({ id: r._id, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</select> },
    { key: 'created', header: 'Created', render: (r) => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Leads" subtitle="Website Buy-Now, manual & CSV — Kanban + list"
        actions={<div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5">{['kanban', 'list'].map((v) => <button key={v} className={`rounded-md px-3 py-1 text-sm capitalize ${view === v ? 'bg-brand-600 text-white' : 'text-slate-500'}`} onClick={() => setView(v)}>{v}</button>)}</div>
          <FileUpload accept=".csv" label="Import CSV" onUpload={doImport} busy={importing} />
          <button className="btn-primary" onClick={() => setModal(true)}>+ Lead</button>
        </div>} />

      {view === 'kanban' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {STATUSES.map((s) => (
              <Droppable droppableId={s} key={s}>
                {(prov) => (
                  <div ref={prov.innerRef} {...prov.droppableProps} className={`min-h-[140px] rounded-xl border-t-4 bg-slate-50 p-2 ${ACCENT[s]}`}>
                    <p className="mb-2 px-1 text-xs font-semibold uppercase text-slate-500">{LABEL[s]} <span className="text-slate-300">({(columns[s] || []).length})</span></p>
                    {(columns[s] || []).map((l, i) => (
                      <Draggable draggableId={l._id} index={i} key={l._id}>
                        {(p) => (
                          <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="mb-2 rounded-lg bg-white p-2 shadow-sm">
                            <p className="text-sm font-medium text-slate-700">{l.name}</p>
                            <p className="text-xs text-slate-400">{l.productInterest || '—'}</p>
                            <div className="mt-1 flex items-center justify-between"><Badge color={srcColor[l.source]}>{l.source}</Badge><span className="text-xs text-slate-500">{inr(l.value)}</span></div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {prov.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {view === 'list' && <SectionCard><DataTable columns={listCols} rows={listData?.data || []} emptyText="No leads." /></SectionCard>}

      <Modal open={modal} onClose={() => setModal(false)} title="New lead"
        footer={<><button className="btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn-primary" onClick={save}>Add</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Product interest"><input className="input" value={f.productInterest} onChange={(e) => setF({ ...f, productInterest: e.target.value })} /></Field>
          <Field label="Value (₹)"><input className="input" type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
          <Field label="Source"><select className="input" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{['manual', 'reference', 'whatsapp', 'phone', 'website'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        </div>
      </Modal>
    </div>
  );
}
