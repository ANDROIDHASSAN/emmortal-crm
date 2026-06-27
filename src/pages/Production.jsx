import { useState } from 'react';
import { useDayBoardQuery, useCreateJobMutation, useUpdateJobMutation } from '../features/production/productionApi';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import Icon from '../components/Icon';
import { PageHeader, Badge, Field } from '../components/ui';
import { useToast } from '../components/Toast';
import { toDateInput, fmtDateTime, apiError } from '../lib/format';

const PROGRESS_OPTIONS = ['pending', 'in_progress', 'done'];
const BLANK_JOB = { title: '', voltage: 48, ah: 30, qty: 1 };

// One row on the daily board. `onPatch` updates a single field of the job;
// `onComment` opens the comment dialog for it.
function JobCard({ job, onPatch, onComment }) {
  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-[140px]">
        <div className="font-semibold text-slate-800">{job.title || `${job.voltage}V ${job.ah}Ah`}</div>
        <div className="text-xs text-slate-400">
          {job.voltage}V · {job.ah}Ah · Qty {job.qty}{job.customer ? ` · ${job.customer}` : ''}
        </div>
        {job.leadRef && <span className="text-[10px] font-semibold text-emerald-600">↳ from won lead</span>}
      </div>

      {/* On/off line toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={job.status === 'on'}
          onChange={(e) => onPatch(job._id, { status: e.target.checked ? 'on' : 'off' })}
        />
        <Badge>{job.status}</Badge>
      </label>

      {/* Progress */}
      <select className="input max-w-[160px]" value={job.progress} onChange={(e) => onPatch(job._id, { progress: e.target.value })}>
        {PROGRESS_OPTIONS.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
      </select>

      <div className="ml-auto flex items-center gap-3">
        {job.comments?.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Icon name="chat" className="h-3.5 w-3.5" /> {job.comments.length}
          </span>
        )}
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onComment(job._id)}>Comment</button>
      </div>

      {/* Auto-generated battery IDs (appear once the job is completed) */}
      {job.batteries?.length > 0 && (
        <div className="flex w-full items-center gap-1.5 border-t border-slate-100 pt-2 text-xs text-emerald-700">
          <Icon name="battery" className="h-4 w-4 shrink-0" /> Battery IDs: {job.batteries.map((b) => b.uniqueId).join(', ')}
        </div>
      )}

      {/* Comment history */}
      {job.comments?.length > 0 && (
        <div className="w-full border-t border-slate-100 pt-2 text-xs text-slate-500">
          {job.comments.map((cm, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Icon name="chat" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{cm.text} <span className="text-slate-300">· {fmtDateTime(cm.at)}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Production() {
  const toast = useToast();
  const [date, setDate] = useState(toDateInput());

  const { data, isFetching } = useDayBoardQuery(date);
  const board = data?.data;
  const counts = board?.counts || {};

  const [createJob] = useCreateJobMutation();
  const [updateJob] = useUpdateJobMutation();

  const [modal, setModal] = useState(false);
  const [jobForm, setJobForm] = useState(BLANK_JOB);

  // Comment dialog targets one job id at a time.
  const [commentFor, setCommentFor] = useState(null);
  const [comment, setComment] = useState('');

  // ── Actions ──────────────────────────────────────────────────────────────
  const saveJob = async () => {
    try {
      await createJob({ ...jobForm, productionDate: date }).unwrap();
      toast.success('Job added');
      setModal(false);
      setJobForm(BLANK_JOB);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  // Patch one or more fields of a job (status / progress / comment).
  const patchJob = async (id, body) => {
    try {
      await updateJob({ id, ...body }).unwrap();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const sendComment = async () => {
    await patchJob(commentFor, { comment });
    setComment('');
    setCommentFor(null);
    toast.success('Comment added');
  };

  const jobs = board?.jobs || [];

  return (
    <div>
      <PageHeader
        title="Production Planning"
        subtitle="A fresh board every day"
        actions={(
          <div className="flex items-center gap-2">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="btn-primary" onClick={() => setModal(true)}>+ Add job</button>
          </div>
        )}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total jobs" value={counts.total ?? 0} accent="brand" />
        <StatCard label="Pending" value={counts.pending ?? 0} accent="slate" />
        <StatCard label="In progress" value={counts.in_progress ?? 0} accent="amber" />
        <StatCard label="Done" value={counts.done ?? 0} accent="emerald" />
      </div>

      <div className="space-y-3">
        {isFetching && <p className="text-slate-400">Loading…</p>}
        {!isFetching && jobs.length === 0 && (
          <div className="card p-10 text-center text-slate-400">No jobs scheduled for {date}. Add one to start the day.</div>
        )}
        {jobs.map((j) => (
          <JobCard key={j._id} job={j} onPatch={patchJob} onComment={setCommentFor} />
        ))}
      </div>

      {/* New job */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={`New job — ${date}`}
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveJob}>Add</button>
          </>
        )}
      >
        <Field label="Title (optional)">
          <input className="input" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
        </Field>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <Field label="Voltage">
            <input className="input" type="number" value={jobForm.voltage} onChange={(e) => setJobForm({ ...jobForm, voltage: e.target.value })} />
          </Field>
          <Field label="Ah">
            <input className="input" type="number" value={jobForm.ah} onChange={(e) => setJobForm({ ...jobForm, ah: e.target.value })} />
          </Field>
          <Field label="Qty">
            <input className="input" type="number" value={jobForm.qty} onChange={(e) => setJobForm({ ...jobForm, qty: e.target.value })} />
          </Field>
        </div>
      </Modal>

      {/* Add comment */}
      <Modal
        open={!!commentFor}
        onClose={() => setCommentFor(null)}
        title="Add comment"
        footer={(
          <>
            <button className="btn-ghost" onClick={() => setCommentFor(null)}>Cancel</button>
            <button className="btn-primary" onClick={sendComment}>Add</button>
          </>
        )}
      >
        <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Modal>
    </div>
  );
}
