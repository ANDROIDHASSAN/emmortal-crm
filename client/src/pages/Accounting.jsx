import { useState } from 'react';
import {
  useListEntriesQuery, useEntrySummaryQuery, useCreateEntryMutation,
  useListPartiesQuery, useCreatePartyMutation, usePartyLedgerQuery,
  useTallyLogsQuery, useTallySyncMutation,
} from '../features/accounting/accountingApi';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import FileUpload from '../components/FileUpload';
import { PageHeader, Badge, Field, SectionCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { inr, fmtDateTime, toDateTimeInput, apiError } from '../lib/format';

export default function Accounting() {
  const toast = useToast();
  const [tab, setTab] = useState('entries');
  const [filters, setFilters] = useState({ kind: '', gst: '', from: '', to: '' });
  const [page, setPage] = useState(1);

  const q = { ...filters, page, limit: 20 };
  const { data: entries, isFetching } = useListEntriesQuery(q);
  const { data: summary } = useEntrySummaryQuery({ from: filters.from, to: filters.to, gst: filters.gst });
  const { data: parties } = useListPartiesQuery({ limit: 200 });
  const { data: tallyLogs } = useTallyLogsQuery();
  const [createEntry] = useCreateEntryMutation();
  const [createParty] = useCreatePartyMutation();
  const [tallySync, { isLoading: syncing }] = useTallySyncMutation();

  const [entryModal, setEntryModal] = useState(false);
  const [entry, setEntry] = useState({ kind: 'sales', gst: false, amount: 0, taxAmount: 0, party: '', voucherNo: '', narration: '', occurredAt: toDateTimeInput() });
  const [partyModal, setPartyModal] = useState(false);
  const [party, setParty] = useState({ name: '', type: 'both', phone: '', gstin: '', openingBalance: 0 });
  const [ledgerId, setLedgerId] = useState(null);
  const { data: ledger } = usePartyLedgerQuery(ledgerId, { skip: !ledgerId });

  const s = summary?.data;

  const saveEntry = async () => {
    try {
      await createEntry({ ...entry, gst: !!entry.gst, party: entry.party || undefined, occurredAt: new Date(entry.occurredAt).toISOString() }).unwrap();
      toast.success('Entry added'); setEntryModal(false);
    } catch (e) { toast.error(apiError(e)); }
  };
  const saveParty = async () => {
    try { await createParty(party).unwrap(); toast.success('Party added'); setPartyModal(false); }
    catch (e) { toast.error(apiError(e)); }
  };
  const doSync = async (fd) => {
    try { const r = await tallySync(fd).unwrap(); toast.success(`Tally sync: ${r.data.recordsUpserted}/${r.data.recordsIn} upserted`); }
    catch (e) { toast.error(apiError(e)); }
  };

  const entryCols = [
    { key: 'occurredAt', header: 'When', render: (r) => fmtDateTime(r.occurredAt) },
    { key: 'kind', header: 'Kind', render: (r) => <Badge color="bg-slate-100 text-slate-700">{r.kind}</Badge> },
    { key: 'gst', header: 'GST', render: (r) => r.gst ? <Badge color="bg-emerald-100 text-emerald-700">GST</Badge> : <Badge color="bg-slate-100 text-slate-500">Non-GST</Badge> },
    { key: 'party', header: 'Party', render: (r) => r.party?.name || '—' },
    { key: 'voucherNo', header: 'Voucher', render: (r) => r.voucherNo || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => inr(r.amount) },
    { key: 'taxAmount', header: 'Tax', align: 'right', render: (r) => inr(r.taxAmount) },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <strong>{inr((r.amount || 0) + (r.taxAmount || 0))}</strong> },
    { key: 'source', header: 'Src', render: (r) => <span className="text-xs text-slate-400">{r.source}</span> },
  ];

  const partyCols = [
    { key: 'name', header: 'Party', render: (r) => <div className="font-medium">{r.name}</div> },
    { key: 'type', header: 'Type', render: (r) => <Badge color="bg-slate-100 text-slate-600">{r.type}</Badge> },
    { key: 'gstin', header: 'GSTIN', render: (r) => r.gstin || '—' },
    { key: 'openingBalance', header: 'Opening', align: 'right', render: (r) => inr(r.openingBalance) },
    { key: 'actions', header: '', align: 'right', render: (r) => <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setLedgerId(r._id)}>Ledger</button> },
  ];

  return (
    <div>
      <PageHeader title="Accounting" subtitle="GST & Non-GST · Tally is the source of truth · time-machine filters"
        actions={<><button className="btn-ghost" onClick={() => setPartyModal(true)}>+ Party</button><button className="btn-primary" onClick={() => setEntryModal(true)}>+ Manual entry</button></>} />

      {/* Time machine */}
      <SectionCard title="Time-machine filters (hour precision)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Kind"><select className="input" value={filters.kind} onChange={(e) => { setFilters({ ...filters, kind: e.target.value }); setPage(1); }}><option value="">All</option><option value="sales">Sales</option><option value="purchase">Purchase</option><option value="expense">Expense</option></select></Field>
          <Field label="GST"><select className="input" value={filters.gst} onChange={(e) => { setFilters({ ...filters, gst: e.target.value }); setPage(1); }}><option value="">Both</option><option value="true">GST only</option><option value="false">Non-GST only</option></select></Field>
          <Field label="From"><input className="input" type="datetime-local" value={filters.from} onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1); }} /></Field>
          <Field label="To"><input className="input" type="datetime-local" value={filters.to} onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1); }} /></Field>
          <div className="flex items-end"><button className="btn-ghost w-full" onClick={() => { setFilters({ kind: '', gst: '', from: '', to: '' }); setPage(1); }}>Clear</button></div>
        </div>
      </SectionCard>

      <div className="my-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Sales (incl tax)" value={inr(s?.buckets?.sales)} accent="emerald" />
        <StatCard label="Purchases" value={inr(s?.buckets?.purchase)} accent="amber" />
        <StatCard label="Expenses" value={inr(s?.buckets?.expense)} accent="red" />
        <StatCard label="Difference (S − P − E)" value={inr(s?.difference)} accent={s?.difference >= 0 ? 'brand' : 'red'} sub={`GST ${inr(s?.gstSplit?.gst)} · Non-GST ${inr(s?.gstSplit?.nonGst)}`} />
      </div>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {['entries', 'parties', 'tally'].map((t) => <button key={t} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500'}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'entries' && <DataTable columns={entryCols} rows={entries?.data || []} loading={isFetching} meta={entries?.meta} onPage={setPage} emptyText="No entries in this window." />}
      {tab === 'parties' && <DataTable columns={partyCols} rows={parties?.data || []} emptyText="No parties yet." />}
      {tab === 'tally' && (
        <SectionCard title="Tally sync (import mode)">
          <p className="mb-3 text-sm text-slate-500">Upload a Tally export (XML day book or CSV). Vouchers are upserted idempotently by GUID — re-importing never duplicates.</p>
          <FileUpload accept=".xml,.csv" label="Choose Tally export" onUpload={doSync} busy={syncing} />
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-600">Recent sync logs</h4>
            <DataTable
              columns={[
                { key: 'createdAt', header: 'When', render: (r) => fmtDateTime(r.createdAt) },
                { key: 'mode', header: 'Mode', render: (r) => r.mode },
                { key: 'recordsIn', header: 'In', align: 'right', render: (r) => r.recordsIn },
                { key: 'recordsUpserted', header: 'Upserted', align: 'right', render: (r) => r.recordsUpserted },
                { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'success' ? 'bg-emerald-100 text-emerald-700' : r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{r.status}</Badge> },
              ]}
              rows={tallyLogs?.data || []}
              emptyText="No syncs yet."
            />
          </div>
        </SectionCard>
      )}

      {/* Manual entry modal */}
      <Modal open={entryModal} onClose={() => setEntryModal(false)} title="Manual accounting entry"
        footer={<><button className="btn-ghost" onClick={() => setEntryModal(false)}>Cancel</button><button className="btn-primary" onClick={saveEntry}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kind"><select className="input" value={entry.kind} onChange={(e) => setEntry({ ...entry, kind: e.target.value })}><option value="sales">Sales</option><option value="purchase">Purchase</option><option value="expense">Expense</option></select></Field>
          <Field label="GST"><select className="input" value={entry.gst ? 'true' : 'false'} onChange={(e) => setEntry({ ...entry, gst: e.target.value === 'true' })}><option value="false">Non-GST</option><option value="true">GST</option></select></Field>
          <Field label="Amount (₹)"><input className="input" type="number" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} /></Field>
          <Field label="Tax (₹)"><input className="input" type="number" value={entry.taxAmount} onChange={(e) => setEntry({ ...entry, taxAmount: e.target.value })} /></Field>
          <Field label="Party"><select className="input" value={entry.party} onChange={(e) => setEntry({ ...entry, party: e.target.value })}><option value="">—</option>{(parties?.data || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></Field>
          <Field label="Voucher no"><input className="input" value={entry.voucherNo} onChange={(e) => setEntry({ ...entry, voucherNo: e.target.value })} /></Field>
          <Field label="When"><input className="input" type="datetime-local" value={entry.occurredAt} onChange={(e) => setEntry({ ...entry, occurredAt: e.target.value })} /></Field>
          <Field label="Narration"><input className="input" value={entry.narration} onChange={(e) => setEntry({ ...entry, narration: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* Party modal */}
      <Modal open={partyModal} onClose={() => setPartyModal(false)} title="New party"
        footer={<><button className="btn-ghost" onClick={() => setPartyModal(false)}>Cancel</button><button className="btn-primary" onClick={saveParty}>Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className="input" value={party.name} onChange={(e) => setParty({ ...party, name: e.target.value })} /></Field>
          <Field label="Type"><select className="input" value={party.type} onChange={(e) => setParty({ ...party, type: e.target.value })}><option value="debtor">Debtor</option><option value="creditor">Creditor</option><option value="both">Both</option></select></Field>
          <Field label="Phone"><input className="input" value={party.phone} onChange={(e) => setParty({ ...party, phone: e.target.value })} /></Field>
          <Field label="GSTIN"><input className="input" value={party.gstin} onChange={(e) => setParty({ ...party, gstin: e.target.value })} /></Field>
          <Field label="Opening balance"><input className="input" type="number" value={party.openingBalance} onChange={(e) => setParty({ ...party, openingBalance: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* Ledger modal */}
      <Modal open={!!ledgerId} onClose={() => setLedgerId(null)} wide title={`Ledger — ${ledger?.data?.party?.name || ''}`}>
        {ledger?.data && (
          <div>
            <div className="mb-3 flex justify-between text-sm">
              <span>Opening: <strong>{inr(ledger.data.openingBalance)}</strong></span>
              <span>Closing: <strong className={ledger.data.closingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}>{inr(ledger.data.closingBalance)}</strong></span>
            </div>
            <DataTable
              columns={[
                { key: 'occurredAt', header: 'When', render: (r) => fmtDateTime(r.occurredAt) },
                { key: 'kind', header: 'Kind', render: (r) => r.kind },
                { key: 'delta', header: 'Δ', align: 'right', render: (r) => <span className={r.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}>{inr(r.delta)}</span> },
                { key: 'balance', header: 'Balance', align: 'right', render: (r) => inr(r.balance) },
              ]}
              rows={ledger.data.ledger}
              emptyText="No transactions."
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
