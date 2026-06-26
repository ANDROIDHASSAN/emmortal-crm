import { z } from 'zod';
import { ProductionJob } from '../../models/ProductionJob.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, parseListQuery, listEnvelope } from '../../utils/helpers.js';
import { createBattery } from '../rework/rework.service.js';

export const jobSchema = z.object({
  productionDate: z.string().min(1),
  title: z.string().optional().default(''),
  voltage: z.coerce.number().optional().default(0),
  ah: z.coerce.number().optional().default(0),
  qty: z.coerce.number().min(1).default(1),
  status: z.enum(['on', 'off']).optional(),
  progress: z.enum(['pending', 'in_progress', 'done']).optional(),
  customer: z.string().optional(),
  leadRef: z.string().optional(),
});
export const jobUpdateSchema = z.object({
  title: z.string().optional(), voltage: z.coerce.number().optional(), ah: z.coerce.number().optional(), qty: z.coerce.number().min(1).optional(),
  status: z.enum(['on', 'off']).optional(), progress: z.enum(['pending', 'in_progress', 'done']).optional(), comment: z.string().optional(),
  customer: z.string().optional(),
});

export const dayBoard = asyncHandler(async (req, res) => {
  const { start, end } = ProductionJob.dayBounds(req.params.date);
  const jobs = await ProductionJob.find({ productionDate: { $gte: start, $lte: end } }).populate('batteries', 'uniqueId status').sort('createdAt').lean();
  const counts = {
    total: jobs.length,
    pending: jobs.filter((j) => j.progress === 'pending').length,
    in_progress: jobs.filter((j) => j.progress === 'in_progress').length,
    done: jobs.filter((j) => j.progress === 'done').length,
    on: jobs.filter((j) => j.status === 'on').length,
  };
  res.json({ data: { date: req.params.date, jobs, counts } });
});

export const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, sort, skip } = parseListQuery(req.query, { defaultSort: '-productionDate' });
  const filter = {};
  if (req.query.from || req.query.to) { filter.productionDate = {}; if (req.query.from) filter.productionDate.$gte = new Date(req.query.from); if (req.query.to) filter.productionDate.$lte = new Date(req.query.to); }
  if (req.query.progress) filter.progress = req.query.progress;
  const [data, total] = await Promise.all([ProductionJob.find(filter).sort(sort).skip(skip).limit(limit).lean(), ProductionJob.countDocuments(filter)]);
  res.json(listEnvelope(data, total, page, limit));
});

export const createJob = asyncHandler(async (req, res) => res.status(201).json({ data: await ProductionJob.create({ ...req.body, productionDate: new Date(req.body.productionDate), createdBy: req.user.id }) }));

export const updateJob = asyncHandler(async (req, res) => {
  const job = await ProductionJob.findById(req.params.id);
  if (!job) throw ApiError.notFound('Production job not found');
  const { comment, ...rest } = req.body;
  const wasDone = job.progress === 'done';
  Object.assign(job, rest);
  if (comment) job.comments.push({ text: comment, by: req.user.id, at: new Date() });

  // Cross-module loop: when a job is first marked 'done', auto-generate one
  // unique Battery ID per unit (EMM-YYYY-####) and mark them dispatched.
  let generated = [];
  if (job.progress === 'done' && !wasDone && (job.batteries?.length || 0) === 0) {
    const n = Math.max(1, Number(job.qty) || 1);
    for (let i = 0; i < n; i++) {
      const battery = await createBattery({ spec: { voltage: job.voltage, ah: job.ah, qty: 1 }, dispatchDate: new Date(), status: 'dispatched' }, req.user);
      generated.push(battery._id);
    }
    job.batteries = generated;
  }
  await job.save();
  const populated = await ProductionJob.findById(job._id).populate('batteries', 'uniqueId status').lean();
  res.json({ data: populated, generatedBatteries: generated.length });
});
