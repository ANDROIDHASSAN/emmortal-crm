import mongoose from 'mongoose';

const replacedPartSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    qty: { type: Number, required: true },
    priceAtTime: { type: Number, default: 0 }, // replacement-time price
    lineCost: { type: Number, default: 0 },
  },
  { _id: false }
);

// Free rework = direct loss to E-mmortal. Each replaced part is priced at
// replacement time and totalled into the loss.
const reworkSchema = new mongoose.Schema(
  {
    battery: { type: mongoose.Schema.Types.ObjectId, ref: 'Battery', required: true, index: true },
    returnDate: { type: Date, required: true, index: true },
    repairedDate: { type: Date },
    problem: { type: String, default: '' },
    technician: { type: String, default: '' },
    replacedParts: { type: [replacedPartSchema], default: [] },
    totalLoss: { type: Number, default: 0 },
    turnaroundDays: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Rework = mongoose.models.Rework || mongoose.model('Rework', reworkSchema);
export default Rework;
