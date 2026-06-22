import { useState } from 'react';
import {
  useListItemsQuery, useCreateItemMutation, useUpdateItemMutation,
  useInventorySummaryQuery, useCreateMovementMutation, useListMovementsQuery,
} from '../features/inventory/inventoryApi';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { PageHeader, Badge, Field } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDateTime, apiError } from '../lib/format';

const CATS = ['cell', 'bms', 'casing', 'consumable', 'other'];
const blankItem = { name: '', sku: '', category: 'cell', unit: 'pcs', unitPrice: 0, reorderLevel: 0, supplierName: '' };

export default function Inventory() {
  const toast = useToast();
  const [tab, setTab] = useState('items');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isFetching } = useListItemsQuery({ page, limit: 20, q });
  const { data: summary } = useInventorySummaryQuery();
  const { data: moves } = useListMovementsQuery({ limit: 50 });
  const [createItem] = useCreateItemMutation();
  const [updateItem] = useUpdateItemMutation();
  const [createMovement] = useCreateMovementMutation();

  const [itemModal, setItemModal] = useState(null); // null | {…} (new or edit)
  const [moveModal, setMoveModal] = useState(null); // null | { item }
  const [form, setForm] = useState(blankItem);
  const [move, setMove] = useState({ type: 'IN', qty: 0, unitPriceAtTime: '', supplierName: '', reason: '', reference: '' });

  const s = summary?.data;

  const openNew = () => { setForm(blankItem); setItemModal({ new: true }); };
  const openEdit = (it) => { setForm({ ...it }); setItemModal({ id: it._id }); };
  const saveItem = async () => {
    try {
      if (itemModal.new) await createItem(form).unwrap();
      else await updateItem({ id: itemModal.id, ...form }).unwrap();
      toast.success('Item saved');
      setItemModal(null);
    } catch (e) { toast.error(apiError(e)); }
  };

  const openMove = (item) => { setMove({ type: 'IN', qty: 0, unitPriceAtTime: '', supplierName: '', reason: '', reference: '' }); setMoveModal({ item }); };
  const saveMove = async () => {
    try {
      const payload = { itemId: moveModal.item._id, type: move.type, reference: move.reference, supplierName: move.supplierName, reason: move.reason };
      if (move.type === 'ADJUST') payload.signedQty = Number(move.qty);
      else payload.qty = Number(move.qty);
      if (move.unitPriceAtTime !== '') payload.unitPriceAtTime = Number(move.unitPriceAtTime);
      await createMovement(payload).unwrap();
      toast.success('Stock movement recorded');
      setMoveModal(null);
    } catch (e) { toast.error(apiError(e)); }
  };

  const itemCols = [
    { key: 'name', header: 'Item', render: (r) => <div><div className="font-medium text-slate-800">{r.name}</div><div className="text-xs text-slate-400">{r.sku} · {r.category}</div></div> },
    { key: 'qtyOnHand', header: 'On hand', align: 'right', render: (r) => <span className={r.qtyOnHand <= r.reorderLevel ? 'font-bold text-red-600' : ''}>{r.qtyOnHand} {r.unit}</span> },
    { key: 'reorderLevel', header: 'Reorder', align: 'right', render: (r) => r.reorderLevel },
    { key: 'unitPrice', header: 'Unit price', align: 'right', render: (r) => inr(r.unitPrice) },
    { key: 'value', header: 'Value', align: 'right', render: (r) => inr(r.qtyOnHand * r.unitPrice) },
    { key: 'status', header: '', render: (r) => (r.qtyOnHand <= r.reorderLevel ? <Badge color="bg-red-100 text-red-700">LOW</Badge> : null) },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-2">
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openMove(r)}>Stock ±</button>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(r)}>Edit</button>
      </div>
    ) },
  ];

  const moveCols = [
    { key: 'occurredAt', header: 'When', render: (r) => fmtDateTime(r.occurredAt) },
    { key: 'item', header: 'Item', render: (r) => r.item?.name || '—' },
    { key: 'type', header: 'Type', render: (r) => <Badge color={r.type === 'REJECT' ? 'bg-red-100 text-red-700' : r.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>{r.type}</Badge> },
    { key: 'qty', header: 'Qty', align: 'right', render: (r) => r.type === 'ADJUST' ? r.signedQty : r.qty },
    { key: 'value', header: 'Value', align: 'right', render: (r) => inr(r.value) },
    { key: 'reason', header: 'Reason / Ref', render: (r) => r.reason || r.reference || '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Live stock register, movements & rejections"
        actions={<button className="btn-primary" onClick={openNew}>+ New item</button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total items" value={s?.itemCount ?? '—'} accent="brand" icon="📦" />
        <StatCard label="On-hand value" value={inr(s?.onHandValue)} accent="emerald" icon="💰" />
        <StatCard label="Low-stock" value={s?.lowStockCount ?? '—'} accent="amber" icon="⚠️" />
        <StatCard label="Rejection loss" value={inr(s?.rejection?.value)} accent="red" icon="🚫" sub={`${s?.rejection?.qty || 0} units rejected`} />
      </div>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {['items', 'movements'].map((t) => (
          <button key={t} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'items' && (
        <>
          <div className="mb-3">
            <input className="input max-w-xs" placeholder="Search items…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <DataTable columns={itemCols} rows={data?.data || []} loading={isFetching} meta={data?.meta} onPage={setPage} emptyText="No items. Add your first item." />
        </>
      )}

      {tab === 'movements' && (
        <DataTable columns={moveCols} rows={moves?.data || []} emptyText="No stock movements yet." />
      )}

      {/* Item modal */}
      <Modal
        open={!!itemModal}
        onClose={() => setItemModal(null)}
        title={itemModal?.new ? 'New item' : 'Edit item'}
        footer={<><button className="btn-ghost" onClick={() => setItemModal(null)}>Cancel</button><button className="btn-primary" onClick={saveItem}>Save</button></>}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="SKU"><input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
          <Field label="Category"><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Unit"><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          <Field label="Unit price (₹)"><input className="input" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></Field>
          <Field label="Reorder level"><input className="input" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
          <Field label="Supplier"><input className="input" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* Movement modal */}
      <Modal
        open={!!moveModal}
        onClose={() => setMoveModal(null)}
        title={`Stock movement — ${moveModal?.item?.name || ''}`}
        footer={<><button className="btn-ghost" onClick={() => setMoveModal(null)}>Cancel</button><button className="btn-primary" onClick={saveMove}>Record</button></>}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <select className="input" value={move.type} onChange={(e) => setMove({ ...move, type: e.target.value })}>
              <option value="IN">IN (purchase/receipt)</option>
              <option value="OUT">OUT (consume/sell)</option>
              <option value="REJECT">REJECT (failed test — loss)</option>
              <option value="ADJUST">ADJUST (signed correction)</option>
            </select>
          </Field>
          <Field label={move.type === 'ADJUST' ? 'Signed qty (+/-)' : 'Quantity'}><input className="input" type="number" value={move.qty} onChange={(e) => setMove({ ...move, qty: e.target.value })} /></Field>
          <Field label="Unit price (blank = item price)"><input className="input" type="number" value={move.unitPriceAtTime} onChange={(e) => setMove({ ...move, unitPriceAtTime: e.target.value })} /></Field>
          <Field label="Supplier"><input className="input" value={move.supplierName} onChange={(e) => setMove({ ...move, supplierName: e.target.value })} /></Field>
          <Field label="Reference"><input className="input" value={move.reference} onChange={(e) => setMove({ ...move, reference: e.target.value })} /></Field>
          <Field label="Reason"><input className="input" value={move.reason} onChange={(e) => setMove({ ...move, reason: e.target.value })} /></Field>
        </div>
        {move.type === 'REJECT' && <p className="mt-3 text-xs text-amber-600">Rejected units are recorded as a failed-purchase loss and never enter sellable stock.</p>}
      </Modal>
    </div>
  );
}
