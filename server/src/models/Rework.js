import mongoose from 'mongoose';

const replacedPartSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    qty: { type: Number, required: true, min: 0 },
    priceAtTime: { type: Number, required: true, min: 0 }, // replacement-time price
    lineCost: { type: Number, default: 0 }, // qty * priceAtTime (rounded)
  },
  { _id: false }
);

const reworkSchema = new mongoose.Schema(
  {
    battery: { type: mongoose.Schema.Types.ObjectId, ref: 'Battery', required: true, index: true },
    returnDate: { type: Date, required: true },
    repairedDate: { type: Date },
    replacedParts: { type: [replacedPartSchema], default: [] },
    totalLoss: { type: Number, default: 0 }, // sum of lineCost — full E-mmortal loss (free to customer)
    turnaroundDays: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

reworkSchema.index({ createdAt: -1 });

export const Rework = mongoose.models.Rework || mongoose.model('Rework', reworkSchema);
export default Rework;
