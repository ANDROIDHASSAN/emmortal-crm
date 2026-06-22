import { useState } from 'react';
import {
  useListBatteriesQuery, useCreateBatteryMutation, useBatteryHistoryQuery,
  useCreateReworkMutation, useReworkLossQuery, useReworkAgingQuery,
} from '../features/rework/reworkApi';
import { useListItemsQuery } from '../features/inventory/inventoryApi';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDate, toDateInput, apiError } from '../lib/format';

export default function Rework() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data: batteries, isFetching } = useListBatteriesQuery({ page, limit: 20 });
  const { data: loss } = useReworkLossQuery({ period: 'monthly' });
  const { data: aging } = useReworkAgingQuery({});
  const { data: items } = useListItemsQuery({ limit: 200 });
  const [createBattery] = useCreateBatteryMutation();
  const [createRework] = useCreateReworkMutation();

  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState(null);
  const { data: history } = useBatteryHistoryQuery(activeId, { skip: !activeId });

  const [batModal, setBatModal] = useState(false);
  const [bat, setBat] = useState({ voltage: 48, ah: 30, cell: '', bms: '', sizeMm: '', dispatchDate: toDateInput() });
  const [rwModal, setRwModal] = useState(null); // { battery }
  const [rw, setRw] = useState({ returnDate: toDateInput(), repairedDate: '', notes: '', parts: [{ item: '', qty: 1, priceAtTime: '' }] });

  const saveBattery = async () => {
    try {
      await createBattery({ spec: { voltage: Number(bat.voltage), ah: Number(bat.ah), cell: bat.cell, bms: bat.bms, sizeMm: bat.sizeMm }, dispatchDate: bat.dispatchDate }).unwrap();
      toast.success('Battery created with unique ID');
      setBatModal(false);
    } catch (e) { toast.error(apiError(e)); }
  };

  const saveRework = async () => {
    try {
      const replacedParts = rw.parts.filter((p) => p.item && p.qty).map((p) => ({ item: p.item, qty: Number(p.qty), priceAtTime: p.priceAtTime === '' ? undefined : Number(p.priceAtTime) }));
      await createRework({ battery: rwModal.battery._id, returnDate: rw.returnDate, repairedDate: rw.repairedDate || undefined, notes: rw.notes, replacedParts }).unwrap();
      toast.success('Rework logged — inventory consumed, loss computed');
      setRwModal(null);
    } catch (e) { toast.error(apiError(e)); }
  };

  const cols = [
    { key: 'uniqueId', header: 'Battery ID', render: (r) => <button className="font-mono font-semibold text-brand-700 hover:underline" onClick={() => { setActiveId(r.uniqueId); }}>{r.uniqueId}</button> },
    { key: 'spec', header: 'Spec', render: (r) => `${r.spec?.voltage || 0}V · ${r.spec?.ah || 0}Ah` },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name || '—' },
    { key: 'dispatchDate', header: 'Dispatched', render: (r) => fmtDate(r.dispatchDate) },
    { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setRw({ returnDate: toDateInput(), repairedDate: '', notes: '', parts: [{ item: '', qty: 1, priceAtTime: '' }] }); setRwModal({ battery: r }); }}>+ Rework</button> },
  ];

  const h = history?.data;

  return (
    <div>
      <PageHeader
        title="Rework & Traceability"
        subtitle="Every battery carries its full history — one ID tells the whole story"
        actions={<button className="btn-primary" onClick={() => setBatModal(true)}>+ New battery</button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total rework loss" value={inr(loss?.data?.total)} accent="red" icon="🔧" />
        <StatCard label="Avg turnaround" value={`${aging?.data?.avgTurnaroundDays ?? 0} days`} accent="amber" icon="⏱️" sub={`${aging?.data?.repairedCount ?? 0} repaired`} />
        <StatCard label="Max turnaround" value={`${aging?.data?.maxTurnaroundDays ?? 0} days`} accent="slate" icon="📅" />
      </div>

      <div className="mb-6">
        <SectionCard title="Battery lookup — full history">
          <div className="flex gap-2">
            <input className="input max-w-xs font-mono" placeholder="EMM-2026-0001" value={lookupId} onChange={(e) => setLookupId(e.target.value.toUpperCase())} />
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
              <div className="mt-4 space-y-3">
                {h.reworks.length === 0 && <p className="text-sm text-slate-400">No reworks recorded — battery in good standing.</p>}
                {h.reworks.map((r, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span>Returned {fmtDate(r.returnDate)} → Repaired {fmtDate(r.repairedDate)} ({r.turnaroundDays} days)</span>
                      <span className="font-semibold text-red-600">{inr(r.totalLoss)}</span>
                    </div>
                    {r.notes && <p className="mt-1 text-xs text-slate-500">{r.notes}</p>}
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                      {r.replacedParts.map((p, j) => <li key={j}>{p.item?.name || 'Part'} × {p.qty} @ {inr(p.priceAtTime)} = {inr(p.lineCost)}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <DataTable columns={cols} rows={batteries?.data || []} loading={isFetching} meta={batteries?.meta} onPage={setPage} emptyText="No batteries yet." />

      {/* New battery */}
      <Modal open={batModal} onClose={() => setBatModal(false)} title="New battery (ID assigned at birth)"
        footer={<><button className="btn-ghost" onClick={() => setBatModal(false)}>Cancel</button><button className="btn-primary" onClick={saveBattery}>Create</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Voltage (V)"><input className="input" type="number" value={bat.voltage} onChange={(e) => setBat({ ...bat, voltage: e.target.value })} /></Field>
          <Field label="Ah"><input className="input" type="number" value={bat.ah} onChange={(e) => setBat({ ...bat, ah: e.target.value })} /></Field>
          <Field label="Cell"><input className="input" value={bat.cell} onChange={(e) => setBat({ ...bat, cell: e.target.value })} /></Field>
          <Field label="BMS"><input className="input" value={bat.bms} onChange={(e) => setBat({ ...bat, bms: e.target.value })} /></Field>
          <Field label="Size (mm)"><input className="input" value={bat.sizeMm} onChange={(e) => setBat({ ...bat, sizeMm: e.target.value })} /></Field>
          <Field label="Dispatch date"><input className="input" type="date" value={bat.dispatchDate} onChange={(e) => setBat({ ...bat, dispatchDate: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* New rework */}
      <Modal open={!!rwModal} onClose={() => setRwModal(null)} wide title={`Rework — ${rwModal?.battery?.uniqueId || ''}`}
        footer={<><button className="btn-ghost" onClick={() => setRwModal(null)}>Cancel</button><button className="btn-primary" onClick={saveRework}>Save rework</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Return date"><input className="input" type="date" value={rw.returnDate} onChange={(e) => setRw({ ...rw, returnDate: e.target.value })} /></Field>
          <Field label="Repaired date (optional)"><input className="input" type="date" value={rw.repairedDate} onChange={(e) => setRw({ ...rw, repairedDate: e.target.value })} /></Field>
        </div>
        <Field label="Notes"><input className="input" value={rw.notes} onChange={(e) => setRw({ ...rw, notes: e.target.value })} /></Field>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between"><span className="label mb-0">Replaced parts (consumes inventory)</span><button className="btn-ghost px-2 py-1 text-xs" onClick={() => setRw({ ...rw, parts: [...rw.parts, { item: '', qty: 1, priceAtTime: '' }] })}>+ Add part</button></div>
          {rw.parts.map((p, i) => (
            <div key={i} className="mb-2 grid grid-cols-12 gap-2">
              <select className="input col-span-6" value={p.item} onChange={(e) => { const parts = [...rw.parts]; parts[i] = { ...p, item: e.target.value }; setRw({ ...rw, parts }); }}>
                <option value="">Select item…</option>
                {(items?.data || []).map((it) => <option key={it._id} value={it._id}>{it.name} (stock {it.qtyOnHand})</option>)}
              </select>
              <input className="input col-span-3" type="number" placeholder="Qty" value={p.qty} onChange={(e) => { const parts = [...rw.parts]; parts[i] = { ...p, qty: e.target.value }; setRw({ ...rw, parts }); }} />
              <input className="input col-span-3" type="number" placeholder="Price@time" value={p.priceAtTime} onChange={(e) => { const parts = [...rw.parts]; parts[i] = { ...p, priceAtTime: e.target.value }; setRw({ ...rw, parts }); }} />
            </div>
          ))}
          <p className="text-xs text-slate-400">Rework is free to the customer — every line cost is recorded as E-mmortal's loss.</p>
        </div>
      </Modal>
    </div>
  );
}
