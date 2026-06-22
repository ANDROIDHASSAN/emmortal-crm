import { useState } from 'react';
import { useDayBoardQuery, useCreateJobMutation, useUpdateJobMutation } from '../features/production/productionApi';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { PageHeader, Badge, Field } from '../components/ui';
import { useToast } from '../components/Toast';
import { toDateInput, fmtDateTime, apiError } from '../lib/format';

const PROGRESS = ['pending', 'in_progress', 'done'];

export default function Production() {
  const toast = useToast();
  const [date, setDate] = useState(toDateInput());
  const { data, isFetching } = useDayBoardQuery(date);
  const [createJob] = useCreateJobMutation();
  const [updateJob] = useUpdateJobMutation();

  const [modal, setModal] = useState(false);
  const [job, setJob] = useState({ title: '', voltage: 48, ah: 30, qty: 1 });
  const [commentFor, setCommentFor] = useState(null);
  const [comment, setComment] = useState('');

  const board = data?.data;
  const counts = board?.counts || {};

  const save = async () => {
    try {
      await createJob({ ...job, productionDate: date }).unwrap();
      toast.success('Job added to the day');
      setModal(false);
      setJob({ title: '', voltage: 48, ah: 30, qty: 1 });
    } catch (e) { toast.error(apiError(e)); }
  };

  const patch = async (id, body) => {
    try { await updateJob({ id, ...body }).unwrap(); } catch (e) { toast.error(apiError(e)); }
  };

  const sendComment = async () => {
    await patch(commentFor, { comment });
    setComment(''); setCommentFor(null);
    toast.success('Comment added');
  };

  return (
    <div>
      <PageHeader
        title="Production Planning"
        subtitle="A fresh board every day"
        actions={
          <div className="flex items-center gap-2">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="btn-primary" onClick={() => setModal(true)}>+ Add job</button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total jobs" value={counts.total ?? 0} accent="brand" />
        <StatCard label="Pending" value={counts.pending ?? 0} accent="slate" />
        <StatCard label="In progress" value={counts.in_progress ?? 0} accent="amber" />
        <StatCard label="Done" value={counts.done ?? 0} accent="emerald" />
      </div>

      <div className="space-y-3">
        {isFetching && <p className="text-slate-400">Loading…</p>}
        {!isFetching && (board?.jobs?.length ?? 0) === 0 && <div className="card p-10 text-center text-slate-400">No jobs scheduled for {date}. Add one to start the day.</div>}
        {board?.jobs?.map((j) => (
          <div key={j._id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-[140px]">
              <div className="font-semibold text-slate-800">{j.title || `${j.voltage}V ${j.ah}Ah`}</div>
              <div className="text-xs text-slate-400">{j.voltage}V · {j.ah}Ah · Qty {j.qty}</div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={j.status === 'on'} onChange={(e) => patch(j._id, { status: e.target.checked ? 'on' : 'off' })} />
              <Badge>{j.status}</Badge>
            </label>
            <select className="input max-w-[160px]" value={j.progress} onChange={(e) => patch(j._id, { progress: e.target.value })}>
              {PROGRESS.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-3">
              {j.comments?.length > 0 && <span className="text-xs text-slate-400">{j.comments.length} 💬</span>}
              <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setCommentFor(j._id)}>Comment</button>
            </div>
            {j.comments?.length > 0 && (
              <div className="w-full border-t border-slate-100 pt-2 text-xs text-slate-500">
                {j.comments.map((c, i) => <div key={i}>💬 {c.text} <span className="text-slate-300">· {fmtDateTime(c.at)}</span></div>)}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={`New job — ${date}`}
        footer={<><button className="btn-ghost" onClick={() => setModal(false)}>Cancel</button><button className="btn-primary" onClick={save}>Add</button></>}>
        <Field label="Title (optional)"><input className="input" value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} /></Field>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Field label="Voltage"><input className="input" type="number" value={job.voltage} onChange={(e) => setJob({ ...job, voltage: e.target.value })} /></Field>
          <Field label="Ah"><input className="input" type="number" value={job.ah} onChange={(e) => setJob({ ...job, ah: e.target.value })} /></Field>
          <Field label="Qty"><input className="input" type="number" value={job.qty} onChange={(e) => setJob({ ...job, qty: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!commentFor} onClose={() => setCommentFor(null)} title="Add comment"
        footer={<><button className="btn-ghost" onClick={() => setCommentFor(null)}>Cancel</button><button className="btn-primary" onClick={sendComment}>Add</button></>}>
        <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Modal>
    </div>
  );
}
