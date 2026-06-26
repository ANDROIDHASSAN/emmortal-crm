import { useState } from 'react';
import { useListEntriesQuery, useEntrySummaryQuery, useCreateEntryMutation, useListPartiesQuery, useCreatePartyMutation, usePartyLedgerQuery, useTallySyncMutation, useTallyLogsQuery } from '../features/accounting/accountingApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import FileUpload from '../components/FileUpload';
import Icon from '../components/Icon';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDate, apiError } from '../lib/format';
import { API_BASE } from '../lib/config';

export default function Accounting() {
  const toast = useToast();
  const [tab, setTab] = useState('entries');
  const [range, setRange] = useState({ from: '', to: '', kind: '', gst: '' });
  const { data: entries } = useListEntriesQuery({ ...range, limit: 200 });
  const { data: summary } = useEntrySummaryQuery(range);
  const { data: parties } = useListPartiesQuery({ limit: 200 });
  const [createEntry] = useCreateEntryMutation();
  const [createParty] = useCreatePartyMutation();
  const [tallySync, { isLoading: syncing }] = useTallySyncMutation();
  const { data: tallyLogs } = useTallyLogsQuery();
  const [entryModal, setEntryModal] = useState(false);
  const [partyModal, setPartyModal] = useState(false);
  const [ledgerId, setLedgerId] = useState('');
  const { data: ledger } = usePartyLedgerQuery(ledgerId, { skip: !ledgerId });
  const [ef, setEf] = useState({ kind: 'sales', gst: false, amount: 0, taxAmount: 0, party: '', voucherNo: '', narration: '' });
  const [pf, setPf] = useState({ name: '', type: 'both', phone: '', gstin: '', openingBalance: 0 });

  const s = summary?.data || { buckets: {}, gstSplit: {} };

  const saveEntry = async () => { try { await createEntry(ef).unwrap(); toast.success('Entry added'); setEntryModal(false); } catch (e) { toast.error(apiError(e)); } };
  const saveParty = async () => { try { await createParty(pf).unwrap(); toast.success('Party added'); setPartyModal(false); } catch (e) { toast.error(apiError(e)); } };
  const doSync = async (fd) => { try { const r = await tallySync(fd).unwrap(); toast.success(`Tally: ${r.data.recordsUpserted}/${r.data.recordsIn} vouchers`); } catch (e) { toast.error(apiError(e)); } };

  const entryCols = [
    { key: 'occurredAt', header: 'Date', render: (r) => fmtDate(r.occurredAt) },
    { key: 'kind', header: 'Kind', render: (r) => <Badge color={r.kind === 'sales' ? 'bg-emerald-100 text-emerald-700' : r.kind === 'purchase' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>{r.kind}</Badge> },
    { key: 'gst', header: 'GST', render: (r) => r.gst ? <Badge color="bg-violet-100 text-violet-700">GST</Badge> : <span className="text-slate-400 text-xs">non-GST</span> },
    { key: 'party', header: 'Party', render: (r) => r.party?.name || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => inr(r.amount + (r.taxAmount || 0)) },
    { key: 'source', header: 'Src', render: (r) => <span className="text-xs text-slate-400">{r.source}</span> },
  ];
  const partyCols = [
    { key: 'name', header: 'Party', render: (r) => r.name },
    { key: 'type', header: 'Type', render: (r) => <Badge>{r.type}</Badge> },
    { key: 'gstin', header: 'GSTIN', render: (r) => r.gstin || '—' },
    { key: 'actions', header: '', align: 'right', render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setLedgerId(r._id)}>Ledger</button> },
  ];

  return (
    <div>
      <PageHeader title="Accounting" subtitle="GST & non-GST books — powered by your Tally data"
        actions={<>
          <button className="btn-ghost" onClick={() => { const p = new URLSearchParams(Object.entries(range).filter(([, v]) => v)); window.open(`${API_BASE}/accounting/entries/export?${p}`, '_blank'); }}><Icon name="download" className="h-4 w-4" /> Export CSV</button>
          <button className="btn-ghost" onClick={() => setPartyModal(true)}><Icon name="plus" className="h-4 w-4" /> Party</button>
          <button className="btn-primary" onClick={() => setEntryModal(true)}><Icon name="plus" className="h-4 w-4" /> Entry</button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Sales" value={inr(s.buckets?.sales)} highlight />
        <StatCard label="Purchase" value={inr(s.buckets?.purchase)} />
        <StatCard label="Expense" value={inr(s.buckets?.expense)} />
        <StatCard label="Difference" value={inr(s.difference)} sub={`GST ${inr(s.gstSplit?.gst)} · non-GST ${inr(s.gstSplit?.nonGst)}`} />
      </div>

      <SectionCard title="Time-machine filters">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="From"><input className="input" type="datetime-local" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
          <Field label="To"><input className="input" type="datetime-local" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
          <Field label="Kind"><select className="input" value={range.kind} onChange={(e) => setRange({ ...range, kind: e.target.value })}><option value="">All</option><option value="sales">Sales</option><option value="purchase">Purchase</option><option value="expense">Expense</option></select></Field>
          <Field label="GST"><select className="input" value={range.gst} onChange={(e) => setRange({ ...range, gst: e.target.value })}><option value="">All</option><option value="true">GST</option><option value="false">Non-GST</option></select></Field>
          <div className="flex items-end"><button className="btn-ghost w-full" onClick={() => setRange({ from: '', to: '', kind: '', gst: '' })}>Clear</button></div>
        </div>
      </SectionCard>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {['entries', 'parties', 'tally'].map((t) => <button key={t} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'entries' && <SectionCard><DataTable columns={entryCols} rows={entries?.data || []} emptyText="No entries." /></SectionCard>}
      {tab === 'parties' && <SectionCard><DataTable columns={partyCols} rows={parties?.data || []} emptyText="No parties." /></SectionCard>}
      {tab === 'tally' && (
        <SectionCard title="Tally sync">
          <p className="mb-3 text-sm text-slate-500">Two ways to bring Tally data in — both map to the same books, idempotent by voucher GUID:</p>
          <div className="flex flex-wrap items-center gap-3">
            <FileUpload accept=".csv,.xml" label="Upload Tally export" onUpload={(fd) => doSync(fd)} busy={syncing} />
            <button className="btn-ghost" disabled={syncing} onClick={async () => { try { const r = await tallySync({ mode: 'http' }).unwrap(); toast.success(`Tally live: ${r.data.recordsUpserted}/${r.data.recordsIn} vouchers`); } catch (e) { toast.error(apiError(e) || 'Tally gateway unreachable — set TALLY_HTTP_URL'); } }}><Icon name="plug" className="h-4 w-4" /> Sync from Tally (live)</button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Live sync needs <code className="rounded bg-slate-100 px-1">TALLY_HTTP_URL</code> in .env (Tally HTTP-XML gateway). Falls back to upload if offline.</p>
          <div className="mt-4">{(tallyLogs?.data || []).slice(0, 5).map((l) => <p key={l._id} className="text-xs text-slate-500">{fmtDate(l.createdAt)} — {l.mode} {l.status}: {l.recordsUpserted}/{l.recordsIn}</p>)}</div>
        </SectionCard>
      )}

      <Modal open={entryModal} onClose={() => setEntryModal(false)} title="New accounting entry"
        footer={<><button className="btn-ghost" onClick={() => setEntryModal(false)}>Cancel</button><button className="btn-primary" onClick={saveEntry}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kind"><select className="input" value={ef.kind} onChange={(e) => setEf({ ...ef, kind: e.target.value })}><option value="sales">Sales</option><option value="purchase">Purchase</option><option value="expense">Expense</option></select></Field>
          <Field label="GST?"><select className="input" value={ef.gst ? 'true' : 'false'} onChange={(e) => setEf({ ...ef, gst: e.target.value === 'true' })}><option value="false">Non-GST</option><option value="true">GST</option></select></Field>
          <Field label="Amount (₹)"><input className="input" type="number" value={ef.amount} onChange={(e) => setEf({ ...ef, amount: e.target.value })} /></Field>
          <Field label="Tax (₹)"><input className="input" type="number" value={ef.taxAmount} onChange={(e) => setEf({ ...ef, taxAmount: e.target.value })} /></Field>
          <Field label="Party"><select className="input" value={ef.party} onChange={(e) => setEf({ ...ef, party: e.target.value })}><option value="">—</option>{(parties?.data || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></Field>
          <Field label="Voucher no"><input className="input" value={ef.voucherNo} onChange={(e) => setEf({ ...ef, voucherNo: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={partyModal} onClose={() => setPartyModal(false)} title="New party"
        footer={<><button className="btn-ghost" onClick={() => setPartyModal(false)}>Cancel</button><button className="btn-primary" onClick={saveParty}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className="input" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} /></Field>
          <Field label="Type"><select className="input" value={pf.type} onChange={(e) => setPf({ ...pf, type: e.target.value })}><option value="debtor">Debtor</option><option value="creditor">Creditor</option><option value="both">Both</option></select></Field>
          <Field label="Phone"><input className="input" value={pf.phone} onChange={(e) => setPf({ ...pf, phone: e.target.value })} /></Field>
          <Field label="GSTIN"><input className="input" value={pf.gstin} onChange={(e) => setPf({ ...pf, gstin: e.target.value })} /></Field>
          <Field label="Opening balance"><input className="input" type="number" value={pf.openingBalance} onChange={(e) => setPf({ ...pf, openingBalance: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!ledgerId} onClose={() => setLedgerId('')} wide title={`Ledger — ${ledger?.data?.party?.name || ''}`}
        footer={<button className="btn-ghost" onClick={() => setLedgerId('')}>Close</button>}>
        <p className="mb-2 text-sm">Opening: {inr(ledger?.data?.openingBalance)} · <span className="font-semibold">Closing: {inr(ledger?.data?.closingBalance)}</span></p>
        <DataTable columns={[
          { key: 'occurredAt', header: 'Date', render: (r) => fmtDate(r.occurredAt) },
          { key: 'kind', header: 'Kind', render: (r) => r.kind },
          { key: 'delta', header: 'Δ', align: 'right', render: (r) => inr(r.delta) },
          { key: 'balance', header: 'Balance', align: 'right', render: (r) => inr(r.balance) },
        ]} rows={ledger?.data?.ledger || []} emptyText="No entries." />
      </Modal>
    </div>
  );
}
