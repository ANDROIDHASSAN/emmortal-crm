import { useState } from 'react';
import { useListItemsQuery, useCreateItemMutation, useUpdateItemMutation, useInventorySummaryQuery, useListMovementsQuery, useCreateMovementMutation } from '../features/inventory/inventoryApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDateTime, toDateInput, apiError } from '../lib/format';

const blankItem = { name: '', category: 'cell', sku: '', unitPrice: 0, reorderLevel: 0, supplierName: '' };
const moveColor = { IN: 'bg-emerald-100 text-emerald-700', OUT: 'bg-blue-100 text-blue-700', REJECT: 'bg-red-100 text-red-700', ADJUST: 'bg-amber-100 text-amber-700' };

export default function Inventory() {
  const toast = useToast();
  const [tab, setTab] = useState('items');
  const { data: items } = useListItemsQuery({ limit: 200 });
  const { data: summary } = useInventorySummaryQuery();
  const { data: movements } = useListMovementsQuery({ limit: 100 });
  const [createItem] = useCreateItemMutation();
  const [updateItem] = useUpdateItemMutation();
  const [createMovement] = useCreateMovementMutation();
  const [itemModal, setItemModal] = useState(null);
  const [f, setF] = useState(blankItem);
  const [moveModal, setMoveModal] = useState(null); // { item }
  const [mv, setMv] = useState({ type: 'IN', qty: 1, unitPriceAtTime: '', reference: '', reason: '', occurredAt: toDateInput() });

  const s = summary?.data || {};

  const saveItem = async () => {
    try {
      if (itemModal.id) await updateItem({ id: itemModal.id, ...f }).unwrap();
      else await createItem(f).unwrap();
      toast.success('Item saved'); setItemModal(null);
    } catch (e) { toast.error(apiError(e)); }
  };
  const saveMove = async () => {
    try { await createMovement({ item: moveModal.item._id, ...mv }).unwrap(); toast.success('Stock movement recorded'); setMoveModal(null); }
    catch (e) { toast.error(apiError(e)); }
  };

  const itemCols = [
    { key: 'name', header: 'Item', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-slate-400">{r.sku} · {r.category}</div></div> },
    { key: 'qtyOnHand', header: 'On hand', align: 'right', render: (r) => <span className={r.qtyOnHand <= r.reorderLevel ? 'font-bold text-red-600' : ''}>{r.qtyOnHand}{r.qtyOnHand <= r.reorderLevel && <Badge color="bg-red-100 text-red-700"> low</Badge>}</span> },
    { key: 'unitPrice', header: 'Price', align: 'right', render: (r) => inr(r.unitPrice) },
    { key: 'value', header: 'Value', align: 'right', render: (r) => inr(r.qtyOnHand * r.unitPrice) },
    { key: 'supplierName', header: 'Supplier', render: (r) => r.supplierName || '—' },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <div className="flex justify-end gap-2">
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setMv({ type: 'IN', qty: 1, unitPriceAtTime: r.unitPrice, reference: '', reason: '', occurredAt: toDateInput() }); setMoveModal({ item: r }); }}>± Stock</button>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setF({ name: r.name, category: r.category, sku: r.sku, unitPrice: r.unitPrice, reorderLevel: r.reorderLevel, supplierName: r.supplierName }); setItemModal({ id: r._id }); }}>Edit</button>
      </div>
    ) },
  ];
  const moveCols = [
    { key: 'occurredAt', header: 'Date', render: (r) => fmtDateTime(r.occurredAt) },
    { key: 'item', header: 'Item', render: (r) => r.item?.name || '—' },
    { key: 'type', header: 'Type', render: (r) => <Badge color={moveColor[r.type]}>{r.type}</Badge> },
    { key: 'qty', header: 'Qty', align: 'right', render: (r) => r.qty },
    { key: 'value', header: 'Value', align: 'right', render: (r) => inr(r.value) },
    { key: 'reference', header: 'Ref / reason', render: (r) => r.reference || r.reason || '—' },
  ];

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Live stock register — every inward & outward movement"
        actions={<button className="btn-primary" onClick={() => { setF(blankItem); setItemModal({}); }}>+ Item</button>} />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Stock value" value={inr(s.onHandValue)} icon="📦" />
        <StatCard label="Items" value={s.itemCount ?? '—'} accent="slate" />
        <StatCard label="Low stock" value={s.lowStockCount ?? '—'} icon="⚠️" accent="amber" />
        <StatCard label="Rejected (loss)" value={inr(s.rejection?.value)} sub={`${s.rejection?.qty ?? 0} units`} icon="❌" accent="red" />
      </div>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {['items', 'movements'].map((t) => <button key={t} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'items' && <SectionCard><DataTable columns={itemCols} rows={items?.data || []} emptyText="No items." /></SectionCard>}
      {tab === 'movements' && <SectionCard><DataTable columns={moveCols} rows={movements?.data || []} emptyText="No movements." /></SectionCard>}

      <Modal open={!!itemModal} onClose={() => setItemModal(null)} title={itemModal?.id ? 'Edit item' : 'New item'}
        footer={<><button className="btn-ghost" onClick={() => setItemModal(null)}>Cancel</button><button className="btn-primary" onClick={saveItem}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="SKU"><input className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></Field>
          <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{['cell', 'bms', 'casing', 'consumable', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="Unit price (₹)"><input className="input" type="number" value={f.unitPrice} onChange={(e) => setF({ ...f, unitPrice: e.target.value })} /></Field>
          <Field label="Reorder level"><input className="input" type="number" value={f.reorderLevel} onChange={(e) => setF({ ...f, reorderLevel: e.target.value })} /></Field>
          <Field label="Supplier"><input className="input" value={f.supplierName} onChange={(e) => setF({ ...f, supplierName: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!moveModal} onClose={() => setMoveModal(null)} title={`Stock movement — ${moveModal?.item?.name || ''}`}
        footer={<><button className="btn-ghost" onClick={() => setMoveModal(null)}>Cancel</button><button className="btn-primary" onClick={saveMove}>Record</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type"><select className="input" value={mv.type} onChange={(e) => setMv({ ...mv, type: e.target.value })}><option value="IN">IN (purchase)</option><option value="OUT">OUT (issue)</option><option value="REJECT">REJECT (failed)</option><option value="ADJUST">ADJUST (±)</option></select></Field>
          <Field label="Quantity"><input className="input" type="number" value={mv.qty} onChange={(e) => setMv({ ...mv, qty: e.target.value })} /></Field>
          <Field label="Unit price (₹)"><input className="input" type="number" value={mv.unitPriceAtTime} onChange={(e) => setMv({ ...mv, unitPriceAtTime: e.target.value })} /></Field>
          <Field label="Date"><input className="input" type="date" value={mv.occurredAt} onChange={(e) => setMv({ ...mv, occurredAt: e.target.value })} /></Field>
          <div className="col-span-2"><Field label={mv.type === 'REJECT' ? 'Rejection reason' : 'Reference (invoice / order)'}><input className="input" value={mv.type === 'REJECT' ? mv.reason : mv.reference} onChange={(e) => setMv(mv.type === 'REJECT' ? { ...mv, reason: e.target.value } : { ...mv, reference: e.target.value })} /></Field></div>
        </div>
      </Modal>
    </div>
  );
}
