import { useState } from 'react';
import {
  useListBatteriesQuery,
  useCreateBatteryMutation,
  useBatteryHistoryQuery,
  useCreateReworkMutation,
  useReworkLossQuery,
  useReworkAgingQuery,
} from '../features/rework/reworkApi';
import { useListItemsQuery } from '../features/inventory/inventoryApi';
import { useListPartiesQuery } from '../features/accounting/accountingApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import Icon from '../components/Icon';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDate, toDateInput, apiError } from '../lib/format';

const BLANK_BATTERY = { customer: '', dispatchDate: toDateInput(), spec: { cell: '', bms: '', voltage: 48, ah: 30, qty: 1 } };
const BLANK_PART = { item: '', qty: 1, priceAtTime: '' };
const BLANK_REWORK = { returnDate: toDateInput(), repairedDate: '', problem: '', technician: '', parts: [BLANK_PART] };

export default function Rework() {
  const toast = useToast();

  // Battery lookup: `lookupId` is what's typed; `activeId` is the submitted search.
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState('');

  // Data
  const { data: batteries } = useListBatteriesQuery({ limit: 100 });
  const { data: items } = useListItemsQuery({ limit: 200 });
  const { data: parties } = useListPartiesQuery({ limit: 200 });
  const { data: history } = useBatteryHistoryQuery(activeId, { skip: !activeId });
  const { data: loss } = useReworkLossQuery({ period: 'monthly' });
  const { data: aging } = useReworkAgingQuery({});
  const h = history?.data;

  // Mutations
  const [createBattery] = useCreateBatteryMutation();
  const [createRework] = useCreateReworkMutation();

  // Modals
  const [batModal, setBatModal] = useState(false);
  const [batForm, setBatForm] = useState(BLANK_BATTERY);
  const [rwModal, setRwModal] = useState(null); // null (closed) or { battery }
  const [rwForm, setRwForm] = useState(BLANK_REWORK);

  // ── Actions ──────────────────────────────────────────────────────────────
  const openNewBattery = () => { setBatForm(BLANK_BATTERY); setBatModal(true); };
  const openRework = (battery) => { setRwForm(BLANK_REWORK); setRwModal({ battery }); };

  const saveBattery = async () => {
    try {
      const r = await createBattery(batForm).unwrap();
      toast.success(`Battery ${r.data.uniqueId} created`);
      setBatModal(false);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const saveRework = async () => {
    try {
      await createRework({
        battery: rwModal.battery._id,
        returnDate: rwForm.returnDate,
        repairedDate: rwForm.repairedDate || undefined,
        problem: rwForm.problem,
        technician: rwForm.technician,
        // Only send rows that have an item selected.
        replacedParts: rwForm.parts.filter((p) => p.item).map((p) => ({
          item: p.item,
          qty: Number(p.qty),
          priceAtTime: p.priceAtTime ? Number(p.priceAtTime) : undefined,
        })),
      }).unwrap();
      toast.success('Rework logged (inventory consumed)');
      setRwModal(null);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  // Immutably update one field of one replaced-part row.
  const updatePart = (index, key, value) => {
    const parts = rwForm.parts.map((p, i) => (i === index ? { ...p, [key]: value } : p));
    setRwForm({ ...rwForm, parts });
  };
  const addPart = () => setRwForm({ ...rwForm, parts: [...rwForm.parts, { ...BLANK_PART }] });
  const removePart = (index) => setRwForm({ ...rwForm, parts: rwForm.parts.filter((_, i) => i !== index) });

  // Open a print-ready window with the battery's QR label.
  // Built with DOM methods + textContent (safe) rather than document.write.
  const printLabel = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const doc = w.document;
    doc.title = h.battery.uniqueId;

    const wrap = doc.createElement('div');
    wrap.style.cssText = 'font-family:system-ui;text-align:center;padding:24px';

    const img = doc.createElement('img');
    img.src = h.qrDataUrl;
    img.style.width = '200px';

    const id = doc.createElement('h2');
    id.style.cssText = 'font-family:monospace;margin:8px 0';
    id.textContent = h.battery.uniqueId;

    const spec = doc.createElement('p');
    spec.textContent = `${h.battery.spec?.voltage || ''}V · ${h.battery.spec?.ah || ''}Ah`;

    wrap.append(img, id, spec);
    doc.body.append(wrap);
    w.print();
  };

  // ── Table columns ────────────────────────────────────────────────────────
  const batteryColumns = [
    {
      key: 'uniqueId', header: 'Battery ID',
      render: (r) => (
        <button
          className="font-mono font-semibold text-brand-700 hover:underline"
          onClick={() => { setActiveId(r.uniqueId); setLookupId(r.uniqueId); }}
        >
          {r.uniqueId}
        </button>
      ),
    },
    { key: 'spec', header: 'Spec', render: (r) => `${r.spec?.voltage || 0}V · ${r.spec?.ah || 0}Ah` },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name || '—' },
    { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
    {
      key: 'actions', header: '', align: 'right',
      render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openRework(r)}>+ Rework</button>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Rework & Traceability"
        subtitle="One ID tells the whole story — dispatch to return to repair"
        actions={<button className="btn-primary" onClick={openNewBattery}>+ Battery</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total rework loss" value={inr(loss?.data?.total)} highlight />
        <StatCard label="Repaired batteries" value={aging?.data?.repairedCount ?? '—'} />
        <StatCard label="Avg turnaround" value={`${aging?.data?.avgTurnaroundDays ?? 0} days`} />
      </div>

      <SectionCard title="Battery lookup">
        <div className="flex gap-2">
          <input
            className="input max-w-xs font-mono"
            placeholder="EMM-2026-0001"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value.toUpperCase())}
          />
          <button className="btn-primary" onClick={() => setActiveId(lookupId)}>Look up</button>
        </div>

        {h && (
          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-lg font-bold text-brand-700">{h.battery.uniqueId}</span>
              <Badge>{h.battery.status}</Badge>
              <span className="text-sm text-slate-500">{h.battery.spec?.voltage}V · {h.battery.spec?.ah}Ah</span>
              <span className="text-sm text-slate-500">Customer: {h.battery.customer?.name || '—'}</span>
              <span className="text-sm text-slate-500">Dispatched: {fmtDate(h.battery.dispatchDate)}</span>
              <span className="ml-auto font-semibold text-red-600">Total loss: {inr(h.summary.totalLoss)}</span>
            </div>

            {h.qrDataUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img src={h.qrDataUrl} alt={h.battery.uniqueId} className="h-20 w-20 rounded border border-slate-200" />
                <button className="btn-ghost text-xs" onClick={printLabel}>
                  <Icon name="printer" className="h-4 w-4" /> Print label
                </button>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {h.reworks.length === 0 && (
                <p className="text-sm text-slate-400">No reworks recorded — battery in good standing.</p>
              )}
              {h.reworks.map((r, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {r.problem || 'Rework'} — Returned {fmtDate(r.returnDate)} → Repaired {fmtDate(r.repairedDate)} ({r.turnaroundDays} days)
                    </span>
                    <span className="font-semibold text-red-600">{inr(r.totalLoss)}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {r.replacedParts.map((p, j) => (
                      <span key={j}>
                        {p.item?.name} ×{p.qty} ({inr(p.lineCost)}){j < r.replacedParts.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Batteries">
        <DataTable columns={batteryColumns} rows={batteries?.data || []} emptyText="No batteries yet." />
      </SectionCard>

      {/* Create battery */}
      <Modal
        open={batModal}
        onClose={() => setBatModal(false)}
        title="New battery (auto-assigns EMM-YYYY-#### ID)"
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setBatModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveBattery}>Create</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer">
            <select className="input" value={batForm.customer} onChange={(e) => setBatForm({ ...batForm, customer: e.target.value })}>
              <option value="">—</option>
              {(parties?.data || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Dispatch date">
            <input className="input" type="date" value={batForm.dispatchDate} onChange={(e) => setBatForm({ ...batForm, dispatchDate: e.target.value })} />
          </Field>
          <Field label="Cell">
            <input className="input" value={batForm.spec.cell} onChange={(e) => setBatForm({ ...batForm, spec: { ...batForm.spec, cell: e.target.value } })} />
          </Field>
          <Field label="BMS">
            <input className="input" value={batForm.spec.bms} onChange={(e) => setBatForm({ ...batForm, spec: { ...batForm.spec, bms: e.target.value } })} />
          </Field>
          <Field label="Voltage">
            <input className="input" type="number" value={batForm.spec.voltage} onChange={(e) => setBatForm({ ...batForm, spec: { ...batForm.spec, voltage: e.target.value } })} />
          </Field>
          <Field label="Ah">
            <input className="input" type="number" value={batForm.spec.ah} onChange={(e) => setBatForm({ ...batForm, spec: { ...batForm.spec, ah: e.target.value } })} />
          </Field>
        </div>
      </Modal>

      {/* Log rework */}
      <Modal
        open={!!rwModal}
        onClose={() => setRwModal(null)}
        wide
        title={`Rework — ${rwModal?.battery?.uniqueId || ''}`}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setRwModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveRework}>Log rework</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Return date">
            <input className="input" type="date" value={rwForm.returnDate} onChange={(e) => setRwForm({ ...rwForm, returnDate: e.target.value })} />
          </Field>
          <Field label="Repaired date">
            <input className="input" type="date" value={rwForm.repairedDate} onChange={(e) => setRwForm({ ...rwForm, repairedDate: e.target.value })} />
          </Field>
          <Field label="Problem">
            <input className="input" value={rwForm.problem} onChange={(e) => setRwForm({ ...rwForm, problem: e.target.value })} />
          </Field>
          <Field label="Technician">
            <input className="input" value={rwForm.technician} onChange={(e) => setRwForm({ ...rwForm, technician: e.target.value })} />
          </Field>
        </div>

        <p className="label mt-2">Replaced parts (consumes inventory)</p>
        {rwForm.parts.map((p, i) => (
          <div key={i} className="mb-2 grid grid-cols-12 gap-2">
            <select className="input col-span-6" value={p.item} onChange={(e) => updatePart(i, 'item', e.target.value)}>
              <option value="">— item —</option>
              {(items?.data || []).map((it) => <option key={it._id} value={it._id}>{it.name}</option>)}
            </select>
            <input className="input col-span-2" type="number" placeholder="qty" value={p.qty} onChange={(e) => updatePart(i, 'qty', e.target.value)} />
            <input className="input col-span-3" type="number" placeholder="price" value={p.priceAtTime} onChange={(e) => updatePart(i, 'priceAtTime', e.target.value)} />
            <button className="btn-ghost col-span-1" onClick={() => removePart(i)}>×</button>
          </div>
        ))}
        <button className="btn-ghost text-xs" onClick={addPart}>+ Add part</button>
      </Modal>
    </div>
  );
}
