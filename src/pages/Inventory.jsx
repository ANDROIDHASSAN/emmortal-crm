import { useState } from 'react';
import {
  useListItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useInventorySummaryQuery,
  useListMovementsQuery,
  useCreateMovementMutation,
} from '../features/inventory/inventoryApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDateTime, toDateInput, apiError } from '../lib/format';

// Empty form used when creating a brand-new item.
const BLANK_ITEM = { name: '', category: 'cell', sku: '', unitPrice: 0, reorderLevel: 0, supplierName: '' };

const ITEM_CATEGORIES = ['cell', 'bms', 'casing', 'consumable', 'other'];

// Badge colour per movement type (IN = stock added, OUT = issued, etc.).
const MOVE_COLOR = {
  IN: 'bg-emerald-100 text-emerald-700',
  OUT: 'bg-blue-100 text-blue-700',
  REJECT: 'bg-red-100 text-red-700',
  ADJUST: 'bg-amber-100 text-amber-700',
};

export default function Inventory() {
  const toast = useToast();
  const [tab, setTab] = useState('items'); // 'items' | 'movements'

  // Data
  const { data: items } = useListItemsQuery({ limit: 200 });
  const { data: summary } = useInventorySummaryQuery();
  const { data: movements } = useListMovementsQuery({ limit: 100 });
  const s = summary?.data || {};

  // Mutations
  const [createItem] = useCreateItemMutation();
  const [updateItem] = useUpdateItemMutation();
  const [createMovement] = useCreateMovementMutation();

  // Item create/edit modal. `itemModal` is null (closed), {} (new), or { id } (editing).
  const [itemModal, setItemModal] = useState(null);
  const [itemForm, setItemForm] = useState(BLANK_ITEM);

  // Stock-movement modal. `moveModal` is null (closed) or { item }.
  const [moveModal, setMoveModal] = useState(null);
  const [moveForm, setMoveForm] = useState({
    type: 'IN', qty: 1, unitPriceAtTime: '', reference: '', reason: '', occurredAt: toDateInput(),
  });

  // ── Actions ──────────────────────────────────────────────────────────────
  const openNewItem = () => { setItemForm(BLANK_ITEM); setItemModal({}); };

  const openEditItem = (item) => {
    setItemForm({
      name: item.name, category: item.category, sku: item.sku,
      unitPrice: item.unitPrice, reorderLevel: item.reorderLevel, supplierName: item.supplierName,
    });
    setItemModal({ id: item._id });
  };

  const openMovement = (item) => {
    setMoveForm({ type: 'IN', qty: 1, unitPriceAtTime: item.unitPrice, reference: '', reason: '', occurredAt: toDateInput() });
    setMoveModal({ item });
  };

  const saveItem = async () => {
    try {
      if (itemModal.id) await updateItem({ id: itemModal.id, ...itemForm }).unwrap();
      else await createItem(itemForm).unwrap();
      toast.success('Item saved');
      setItemModal(null);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const saveMovement = async () => {
    try {
      await createMovement({ item: moveModal.item._id, ...moveForm }).unwrap();
      toast.success('Stock movement recorded');
      setMoveModal(null);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  // ── Table columns ────────────────────────────────────────────────────────
  const itemColumns = [
    {
      key: 'name', header: 'Item',
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-slate-400">{r.sku} · {r.category}</div>
        </div>
      ),
    },
    {
      key: 'qtyOnHand', header: 'On hand', align: 'right',
      render: (r) => {
        const isLow = r.qtyOnHand <= r.reorderLevel;
        return (
          <span className={isLow ? 'font-bold text-red-600' : ''}>
            {r.qtyOnHand}
            {isLow && <Badge color="bg-red-100 text-red-700"> low</Badge>}
          </span>
        );
      },
    },
    { key: 'unitPrice', header: 'Price', align: 'right', render: (r) => inr(r.unitPrice) },
    { key: 'value', header: 'Value', align: 'right', render: (r) => inr(r.qtyOnHand * r.unitPrice) },
    { key: 'supplierName', header: 'Supplier', render: (r) => r.supplierName || '—' },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openMovement(r)}>± Stock</button>
          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEditItem(r)}>Edit</button>
        </div>
      ),
    },
  ];

  const movementColumns = [
    { key: 'occurredAt', header: 'Date', render: (r) => fmtDateTime(r.occurredAt) },
    { key: 'item', header: 'Item', render: (r) => r.item?.name || '—' },
    { key: 'type', header: 'Type', render: (r) => <Badge color={MOVE_COLOR[r.type]}>{r.type}</Badge> },
    { key: 'qty', header: 'Qty', align: 'right', render: (r) => r.qty },
    { key: 'value', header: 'Value', align: 'right', render: (r) => inr(r.value) },
    { key: 'reference', header: 'Ref / reason', render: (r) => r.reference || r.reason || '—' },
  ];

  // The reference field doubles as a rejection-reason field for REJECT movements.
  const isReject = moveForm.type === 'REJECT';

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Live stock register — every inward & outward movement"
        actions={<button className="btn-primary" onClick={openNewItem}>+ Item</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Stock value" value={inr(s.onHandValue)} highlight />
        <StatCard label="Items" value={s.itemCount ?? '—'} />
        <StatCard label="Low stock" value={s.lowStockCount ?? '—'} />
        <StatCard label="Rejected (loss)" value={inr(s.rejection?.value)} sub={`${s.rejection?.qty ?? 0} units`} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {['items', 'movements'].map((t) => (
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

      {tab === 'items' && (
        <SectionCard><DataTable columns={itemColumns} rows={items?.data || []} emptyText="No items." /></SectionCard>
      )}
      {tab === 'movements' && (
        <SectionCard><DataTable columns={movementColumns} rows={movements?.data || []} emptyText="No movements." /></SectionCard>
      )}

      {/* Create / edit item */}
      <Modal
        open={!!itemModal}
        onClose={() => setItemModal(null)}
        title={itemModal?.id ? 'Edit item' : 'New item'}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setItemModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveItem}>Save</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <input className="input" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
          </Field>
          <Field label="SKU">
            <input className="input" value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} />
          </Field>
          <Field label="Category">
            <select className="input" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
              {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Unit price (₹)">
            <input className="input" type="number" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} />
          </Field>
          <Field label="Reorder level">
            <input className="input" type="number" value={itemForm.reorderLevel} onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })} />
          </Field>
          <Field label="Supplier">
            <input className="input" value={itemForm.supplierName} onChange={(e) => setItemForm({ ...itemForm, supplierName: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Record stock movement */}
      <Modal
        open={!!moveModal}
        onClose={() => setMoveModal(null)}
        title={`Stock movement — ${moveModal?.item?.name || ''}`}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setMoveModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveMovement}>Record</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <select className="input" value={moveForm.type} onChange={(e) => setMoveForm({ ...moveForm, type: e.target.value })}>
              <option value="IN">IN (purchase)</option>
              <option value="OUT">OUT (issue)</option>
              <option value="REJECT">REJECT (failed)</option>
              <option value="ADJUST">ADJUST (±)</option>
            </select>
          </Field>
          <Field label="Quantity">
            <input className="input" type="number" value={moveForm.qty} onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })} />
          </Field>
          <Field label="Unit price (₹)">
            <input className="input" type="number" value={moveForm.unitPriceAtTime} onChange={(e) => setMoveForm({ ...moveForm, unitPriceAtTime: e.target.value })} />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={moveForm.occurredAt} onChange={(e) => setMoveForm({ ...moveForm, occurredAt: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label={isReject ? 'Rejection reason' : 'Reference (invoice / order)'}>
              <input
                className="input"
                value={isReject ? moveForm.reason : moveForm.reference}
                onChange={(e) => setMoveForm(isReject
                  ? { ...moveForm, reason: e.target.value }
                  : { ...moveForm, reference: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
